// NEAR Intents 1Click API client. Cross-chain swap protocol we use for the
// "send from another wallet" checkout flow, where the widget shows a deposit
// address (+ optional memo) and any third party can pay it. NEAR aggregates
// liquidity across ~30 chains and delivers the destination asset on the chain
// we ask for. We aim every route at crypto:BASE:USDC so Paycrest handles the
// fiat last mile.
//
// Unlike ChainRails there are no webhooks — state is pull-only via GET /status.
// The poller in queues/nearintents_poller.ts drives step transitions.

import { parseAsset } from '../lib/assets';
import { CHAIN_ENUM, TOKENS } from '../lib/registry';

// ── Chain mapping ───────────────────────────────────────────────────────────
// Our canonical chain name (uppercase) → NEAR Intents `blockchain` enum.
// Source: GET /v0/tokens response + OpenAPI blockchain enum.

// Chains that route via memo rather than a plain deposit address. NEAR Intents
// requires depositMode:'MEMO' for these; all others use 'SIMPLE'.
const MEMO_CHAINS = new Set(['STELLAR', 'XRP', 'TON', 'NEAR']);

const CHAIN_TO_NEAR: Record<string, string> = {
  NEAR:      'near',
  ETHEREUM:  'eth',
  BASE:      'base',
  ARBITRUM:  'arb',
  OPTIMISM:  'op',
  POLYGON:   'pol',
  BSC:       'bsc',
  AVALANCHE: 'avax',
  SOLANA:    'sol',
  BITCOIN:   'btc',
  TON:       'ton',
  XRP:       'xrp',
  STELLAR:   'stellar',
  STARKNET:  'starknet',
  SUI:       'sui',
  APTOS:     'aptos',
  DOGE:      'doge',
  LITECOIN:  'ltc',
  CARDANO:   'cardano',
  TRON:      'tron',
  BERA:      'bera',
  GNOSIS:    'gnosis',
  MONAD:     'monad',
  SCROLL:    'scroll',
  XLAYER:    'xlayer',
  ZEC:       'zec',
  BCH:       'bch',
  DASH:      'dash',
};

export function chainToNear(chain: string): string {
  const k = chain.toUpperCase();
  const v = CHAIN_TO_NEAR[k];
  if (!v) throw new Error(`NEAR Intents does not support chain ${chain}`);
  return v;
}

// ── Asset-id resolution ─────────────────────────────────────────────────────
// NEAR Intents identifies every asset by a single `assetId` string. Rather
// than hand-maintain a table, we fetch GET /v0/tokens once at first use and
// pick the row with matching blockchain + symbol.

export interface NearToken {
  assetId:         string;
  decimals:        number;
  blockchain:      string;
  symbol:          string;
  price:           number;
  priceUpdatedAt:  string;
  contractAddress?: string;
}

// ── Quote types ─────────────────────────────────────────────────────────────

export type NearSwapType     = 'EXACT_INPUT' | 'EXACT_OUTPUT' | 'FLEX_INPUT' | 'ANY_INPUT';
export type NearDepositType  = 'ORIGIN_CHAIN' | 'INTENTS';
export type NearRecipientType = 'DESTINATION_CHAIN' | 'INTENTS';
export type NearDepositMode   = 'SIMPLE' | 'MEMO';

export interface NearQuoteRequest {
  dry:               boolean;
  swapType:          NearSwapType;
  slippageTolerance: number;          // basis points; 100 = 1%
  originAsset:       string;          // assetId
  depositType:       NearDepositType;
  destinationAsset:  string;          // assetId
  amount:            string;          // smallest unit
  refundTo:          string;
  refundType:        NearDepositType;
  recipient:         string;
  recipientType:     NearRecipientType;
  deadline:          string;          // ISO
  depositMode?:      NearDepositMode;
  referral?:         string;
  quoteWaitingTimeMs?: number;
  appFees?:          Array<{ recipient: string; fee: number }>;
}

export interface NearQuoteInner {
  depositAddress:    string;
  depositMemo?:      string;
  amountIn:          string;
  amountInFormatted: string;
  amountInUsd:       string;
  minAmountIn:       string;
  amountOut:         string;
  amountOutFormatted: string;
  amountOutUsd:      string;
  minAmountOut:      string;
  timeEstimate:      number;
  deadline:          string;
  timeWhenInactive:  string;
  refundFee?:        string;
}

export interface NearQuoteResponse {
  correlationId: string;
  timestamp:     string;
  signature:     string;
  quoteRequest:  NearQuoteRequest;
  quote:         NearQuoteInner;
}

export type NearStatus =
  | 'KNOWN_DEPOSIT_TX'
  | 'PENDING_DEPOSIT'
  | 'INCOMPLETE_DEPOSIT'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'REFUNDED'
  | 'FAILED';

export interface NearStatusResponse {
  correlationId: string;
  quoteResponse: NearQuoteResponse;
  status:        NearStatus;
  updatedAt:     string;
  swapDetails: {
    intentHashes:             string[];
    nearTxHashes:             string[];
    amountIn?:                string;
    amountInFormatted?:       string;
    amountInUsd?:             string;
    amountOut?:               string;
    amountOutFormatted?:      string;
    amountOutUsd?:            string;
    slippage?:                number;
    originChainTxHashes?:     Array<{ hash: string; explorerUrl: string }>;
    destinationChainTxHashes?: Array<{ hash: string; explorerUrl: string }>;
    refundedAmount?:          string;
    refundReason?:            string;
    depositedAmount?:         string;
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Human amount → smallest-unit integer string. Handles scientific notation. */
export function toSmallestUnit(amount: number | string, decimals: number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(num)) return '0';
  
  // Use toFixed to avoid scientific notation (1e-7 -> 0.0000001)
  const fixed = num.toFixed(decimals);
  const [whole, frac = ''] = fixed.split('.');
  const combined = (whole + frac).replace(/^0+/, '');
  return combined || '0';
}

// ── Service ─────────────────────────────────────────────────────────────────

export class NearIntentsService {
  private baseUrl:    string;
  private jwt:        string;
  private tokenCache: NearToken[] | null = null;
  private cacheAt:    number             = 0;
  private readonly CACHE_TTL_MS = 10 * 60 * 1000;

  constructor() {
    this.baseUrl = (process.env.NEAR_INTENTS_API_URL || 'https://1click.chaindefuser.com/v0').replace(/\/$/, '');
    this.jwt     = process.env.NEAR_INTENTS_JWT || '';
  }

  private async request<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth && this.jwt) headers['Authorization'] = `Bearer ${this.jwt}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`NEAR Intents ${res.status}: ${text}`);
    return JSON.parse(text) as T;
  }

  /** GET /v0/tokens — cached for 10 min. */
  async listTokens(): Promise<NearToken[]> {
    if (this.tokenCache && Date.now() - this.cacheAt < this.CACHE_TTL_MS) return this.tokenCache;
    const tokens = await this.request<NearToken[]>('GET', '/tokens', undefined, false);
    this.tokenCache = tokens;
    this.cacheAt    = Date.now();
    return tokens;
  }

  /**
   * Resolve a canonical asset key (`crypto:BASE:USDC`) to the full NEAR token
   * row from /tokens. Includes `price` (USD) which we rely on to convert a
   * USD-equivalent quote into a source-asset-denominated deposit amount.
   */
  async resolveToken(key: string): Promise<NearToken> {
    const a = parseAsset(key);
    if (a.kind !== 'crypto') throw new Error(`NEAR Intents: fiat asset ${key} not supported`);
    const blockchain = chainToNear(a.chain);
    const symbol     = a.token.toUpperCase();
    const tokens = await this.listTokens();
    const chainEnum = CHAIN_ENUM[a.chain.toUpperCase()];
    const ourToken = chainEnum ? TOKENS[chainEnum]?.[symbol] : null;

    const hit = tokens.find(t => {
      const sameChain = t.blockchain === blockchain;
      const sameSymbol = t.symbol.toUpperCase() === symbol || t.symbol.toUpperCase() === `${symbol}0`;
      const sameAddress = ourToken && t.contractAddress?.toLowerCase() === ourToken.address.toLowerCase();
      return sameChain && (sameSymbol || sameAddress);
    });

    if (!hit) throw new Error(`NEAR Intents: no token for ${blockchain}/${symbol}`);
    return hit;
  }

  async resolveAssetId(key: string): Promise<{ assetId: string; decimals: number }> {
    const t = await this.resolveToken(key);
    return { assetId: t.assetId, decimals: t.decimals };
  }

  /** POST /v0/quote */
  async createQuote(params: {
    sourceAssetKey: string;
    destAssetKey:   string;
    amount:         number | string;
    refundTo:       string;
    recipient:      string;
    swapType?:      NearSwapType;
    appFee?:        { recipient: string; fee: number };
    slippageBps?:   number;
    deadlineSecs?:  number;
    dry?:           boolean;
    referral?:      string;
  }): Promise<NearQuoteResponse> {
    const src = await this.resolveAssetId(params.sourceAssetKey);
    const dst = await this.resolveAssetId(params.destAssetKey);

    // If EXACT_OUTPUT, the amount parameter specifies the output token amount.
    const isExactOutput = params.swapType === 'EXACT_OUTPUT';
    const amountRaw = toSmallestUnit(params.amount, isExactOutput ? dst.decimals : src.decimals);

    const deadline  = new Date(Date.now() + (params.deadlineSecs ?? 30 * 60) * 1000).toISOString();

    const srcParsed  = parseAsset(params.sourceAssetKey);
    const depositMode: NearDepositMode = MEMO_CHAINS.has(srcParsed.kind === 'crypto' ? srcParsed.chain.toUpperCase() : '') ? 'MEMO' : 'SIMPLE';

    const body: NearQuoteRequest = {
      dry:               params.dry ?? false,
      swapType:          params.swapType ?? 'EXACT_INPUT',
      slippageTolerance: params.slippageBps ?? 100,
      originAsset:       src.assetId,
      destinationAsset:  dst.assetId,
      amount:            amountRaw,
      depositType:       'ORIGIN_CHAIN',
      depositMode,
      refundType:        'ORIGIN_CHAIN',
      refundTo:          params.refundTo,
      recipient:         params.recipient,
      recipientType:     'DESTINATION_CHAIN',
      deadline,
      ...(params.referral ? { referral: params.referral } : {}),
      ...(params.appFee ? { appFees: [{ recipient: params.appFee.recipient, fee: params.appFee.fee }] } : {}),
    };
    return this.request<NearQuoteResponse>('POST', '/quote', body);
  }

  /** GET /v0/status */
  async getStatus(depositAddress: string, depositMemo?: string): Promise<NearStatusResponse> {
    const qs = new URLSearchParams({ depositAddress });
    if (depositMemo) qs.set('depositMemo', depositMemo);
    return this.request<NearStatusResponse>('GET', `/status?${qs.toString()}`);
  }

  /** POST /v0/deposit/submit — optional nudge to speed detection. */
  async submitDepositTx(params: {
    txHash:             string;
    depositAddress:     string;
    memo?:              string;
    nearSenderAccount?: string;
  }) {
    return this.request<NearStatusResponse>('POST', '/deposit/submit', params);
  }

  /** Does NEAR Intents support this asset (chain + token)? */
  async supports(assetKey: string): Promise<boolean> {
    try {
      await this.resolveAssetId(assetKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Synchronous sanity check — does the chain appear in our mapping at all?
   * Useful for router edges that must decide without hitting the network.
   */
  chainIsKnown(chain: string): boolean {
    return CHAIN_TO_NEAR[chain.toUpperCase()] != null;
  }
}

export const nearIntents = new NearIntentsService();

// ── Status classification ───────────────────────────────────────────────────

export type NearOutcome = 'done' | 'failed' | 'progress' | 'refunded';

export function classifyNearStatus(status: NearStatus): NearOutcome {
  switch (status) {
    case 'SUCCESS':            return 'done';
    case 'FAILED':             return 'failed';
    case 'REFUNDED':           return 'refunded';
    case 'KNOWN_DEPOSIT_TX':
    case 'PENDING_DEPOSIT':
    case 'INCOMPLETE_DEPOSIT':
    case 'PROCESSING':         return 'progress';
  }
}

