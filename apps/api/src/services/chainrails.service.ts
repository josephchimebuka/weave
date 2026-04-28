import crypto from 'crypto';

import { CHAIN_ENUM, TOKENS, TokenInfo } from '../lib/registry';

export function resolveChain(symbol: string): string {
  const e = CHAIN_ENUM[symbol.toUpperCase()];
  if (!e) throw new Error(`Unsupported chain: ${symbol}`);
  return e;
}

export function resolveToken(chainEnum: string, symbol: string): TokenInfo {
  const t = TOKENS[chainEnum]?.[symbol.toUpperCase()];
  if (!t) throw new Error(`Unsupported token ${symbol} on ${chainEnum}`);
  return t;
}

/** Human amount → smallest-unit integer string (e.g., 100 USDC @ 6 dec → "100000000"). */
export function toSmallestUnit(amount: number | string, decimals: number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(num)) return '0';
  
  // Use toFixed to avoid scientific notation (1e-7 -> 0.0000001)
  const fixed = num.toFixed(decimals);
  const [whole, frac = ''] = fixed.split('.');
  const combined = (whole + frac).replace(/^0+/, '');
  return combined || '0';
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface CRQuote {
  bridgeFeeDetails:  unknown;
  totalFee:          string;
  totalFeeFormatted: string;
  route: {
    tokenIn:          string;
    tokenOut:         string;
    sourceChain:      string;
    destinationChain: string;
    amount:           string;
    bridge:           'ACROSS' | 'CCTP' | 'GATEWAY' | 'RHINOFI' | string;
    recipient?:       string;
  };
}

export interface CRIntent {
  id:                          number;
  client_id:                   string;
  sender:                      string;
  recipient:                   string;
  refund_address:              string;
  initialAmount:               string;
  asset_token_symbol:          string;
  asset_token_decimals:        number;
  tokenIn:                     string;
  tokenOut:                    string;
  source_chain:                string;
  destination_chain:           string;
  intent_address:              string;
  intent_nonce:                number;
  intent_status:               'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fees_in_usd:                 string;
  app_fee_in_usd:              string;
  total_amount_in_usd:         string;
  fees_in_asset_token:         string;
  app_fee_in_asset_token:      string;
  total_amount_in_asset_token: string;
  slippage:                    string;
  tx_hash:                     string | null;
  needs_relay:                 boolean;
  expires_at:                  string;
  created_at:                  string;
  updated_at:                  string;
  metadata?:                   Record<string, unknown>;
}

export interface GetQuoteParams {
  sourceChain:      string;  // symbol e.g. "ETHEREUM"
  sourceToken:      string;  // symbol e.g. "USDT"
  destinationChain: string;
  destinationToken: string;
  amount:           string | number;   // human units
  recipient?:       string;
}

export interface CreateIntentParams {
  sourceChain:      string;
  sourceToken:      string;
  amount:           string | number;   // human units
  destinationChain: string;
  destinationToken: string;
  recipient:        string;            // where bridged funds land
  sender?:          string;
  refundAddress?:   string;
  metadata?:        Record<string, unknown>;
}

// ── Service ──────────────────────────────────────────────────────────────────

export class ChainRailsService {
  private baseUrl:       string;
  private apiKey:        string;
  private webhookSecret: string;

  constructor() {
    this.baseUrl       = (process.env.CHAINRAILS_API_URL || 'https://api.chainrails.io/api/v1').replace(/\/$/, '');
    this.apiKey        = (process.env.CHAINRAILS_API_KEY || '').replace(/^["']|["']$/g, '').trim();
    this.webhookSecret = process.env.CHAINRAILS_WEBHOOK_SECRET || '';
    if (!this.apiKey) {
      console.warn('[ChainRails] CHAINRAILS_API_KEY is not set. All requests will fail with 401.');
    } else {
      console.log(`[ChainRails] API key loaded: ${this.apiKey.slice(0, 4)}...${this.apiKey.slice(-4)}`);
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`ChainRails ${res.status}: ${text}`);
      return JSON.parse(text) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** GET /quotes/best — best quote across all bridges. */
  async getBestQuote(params: GetQuoteParams): Promise<CRQuote> {
    const srcChain = resolveChain(params.sourceChain);
    const dstChain = resolveChain(params.destinationChain);
    const srcTok   = resolveToken(srcChain, params.sourceToken);
    const dstTok   = resolveToken(dstChain, params.destinationToken);
    const scaled   = toSmallestUnit(params.amount, srcTok.decimals);

    const qs = new URLSearchParams({
      tokenIn:          srcTok.address,
      tokenOut:         dstTok.address,
      sourceChain:      srcChain,
      destinationChain: dstChain,
      amount:           scaled,
      amountSymbol:     params.sourceToken.toUpperCase(),
      ...(params.recipient ? { recipient: params.recipient } : {}),
    }).toString();

    return this.request<CRQuote>('GET', `/quotes/best?${qs}`);
  }

  /** POST /intents — create a new bridge intent. */
  async createIntent(params: CreateIntentParams): Promise<CRIntent> {
    const srcChain = resolveChain(params.sourceChain);
    const dstChain = resolveChain(params.destinationChain);
    const srcTok   = resolveToken(srcChain, params.sourceToken);
    const scaled   = toSmallestUnit(params.amount, srcTok.decimals);

    const payload = {
      amount:            scaled,
      amountSymbol:      params.sourceToken.toUpperCase(),
      tokenIn:           srcTok.address,
      source_chain:      srcChain,
      destination_chain: dstChain,
      recipient:         params.recipient,
      ...(params.sender        ? { sender:         params.sender        } : {}),
      ...(params.refundAddress ? { refund_address: params.refundAddress } : {}),
      ...(params.metadata      ? { metadata:       params.metadata      } : {}),
    };
    console.log('[ChainRails] creating intent:', JSON.stringify(payload, null, 2));

    const intent = await this.request<CRIntent>('POST', '/intents', payload);
    console.log('[ChainRails] intent created:', JSON.stringify(intent, null, 2));

    return intent;
  }

  async getIntent(id: string | number): Promise<CRIntent> {
    return this.request<CRIntent>('GET', `/intents/${id}`);
  }

  /**
   * ChainRails webhook signature: HMAC-SHA256(secret, `${timestamp}.${rawBody}`).
   * Also enforces the 5-minute timestamp window per docs.
   */
  verifyWebhookSignature(rawBody: string, signature: string, timestamp: string): boolean {
    if (!this.webhookSecret) {
      console.error('[security] CHAINRAILS_WEBHOOK_SECRET not set. Rejecting all webhooks.');
      return false;
    }
    if (!signature || !timestamp) return false;

    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) return false;
    if (Math.abs(Date.now() - ts * 1000) > 5 * 60 * 1000) return false;

    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');
    const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature;
    try {
      return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  }
}

export const chainRails = new ChainRailsService();
