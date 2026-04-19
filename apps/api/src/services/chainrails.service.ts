import crypto from 'crypto';

// ── Chain + token registry (demo scope) ──────────────────────────────────────

export const CHAIN_ENUM: Record<string, string> = {
  BASE:      'BASE_MAINNET',
  ETHEREUM:  'ETHEREUM_MAINNET',
  OPTIMISM:  'OPTIMISM_MAINNET',
  ARBITRUM:  'ARBITRUM_MAINNET',
  POLYGON:   'POLYGON_MAINNET',
  BSC:       'BSC_MAINNET',
  AVALANCHE: 'AVALANCHE_MAINNET',
  LISK:      'LISK_MAINNET',
};

interface TokenInfo { address: string; decimals: number; }

export const TOKENS: Record<string, Record<string, TokenInfo>> = {
  BASE_MAINNET: {
    USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    USDT: { address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6 },
    ETH:  { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  },
  ETHEREUM_MAINNET: {
    USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    ETH:  { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  },
  OPTIMISM_MAINNET: {
    USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
    USDT: { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6 },
    ETH:  { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  },
  ARBITRUM_MAINNET: {
    USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
    USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
    ETH:  { address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  },
  POLYGON_MAINNET: {
    USDC: { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
    USDT: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
  },
};

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
  const [whole, frac = ''] = String(amount).split('.');
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  const combined = (whole + fracPadded).replace(/^0+/, '');
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
    this.apiKey        = process.env.CHAINRAILS_API_KEY || '';
    this.webhookSecret = process.env.CHAINRAILS_WEBHOOK_SECRET || '';
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`ChainRails ${res.status}: ${text}`);
    return JSON.parse(text) as T;
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

    return this.request<CRIntent>('POST', '/intents', {
      amount:            scaled,
      amountSymbol:      params.sourceToken.toUpperCase(),
      tokenIn:           srcTok.address,
      source_chain:      srcChain,
      destination_chain: dstChain,
      recipient:         params.recipient,
      ...(params.sender        ? { sender:         params.sender        } : {}),
      ...(params.refundAddress ? { refund_address: params.refundAddress } : {}),
      ...(params.metadata      ? { metadata:       params.metadata      } : {}),
    });
  }

  async getIntent(id: string | number): Promise<CRIntent> {
    return this.request<CRIntent>('GET', `/intents/${id}`);
  }

  /**
   * ChainRails webhook signature: HMAC-SHA256(secret, `${timestamp}.${rawBody}`).
   * Also enforces the 5-minute timestamp window per docs.
   */
  verifyWebhookSignature(rawBody: string, signature: string, timestamp: string): boolean {
    if (!this.webhookSecret) return true;        // dev mode
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
