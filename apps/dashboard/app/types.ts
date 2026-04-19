export interface RouteStep {
  id:             string;
  orderId:        string;
  sequence:       number;
  provider:       string;    // 'paycrest' | 'chainrails' | 'direct'
  fromAsset:      string;
  toAsset:        string;
  amountIn:       number | null;
  amountOut:      number | null;
  feeUsd:         number | null;
  status:         string;    // 'pending' | 'in_flight' | 'done' | 'failed'
  externalId:     string | null;
  depositAddress: string | null;
  startedAt:      string | null;
  completedAt:    string | null;
  createdAt:      string;
  updatedAt:      string;
}

export interface Order {
  id:                 string;
  clientId:           string;
  userId:             string | null;
  sourceInstrumentId: string;
  destInstrumentId:   string;
  sourceAssetKey:     string;    // "crypto:BASE:USDC" or "fiat:NGN"
  destAssetKey:       string;
  sourceAmount:       number;
  destAmount:         number | null;
  quoteRate:          number | null;
  status:             string;    // 'awaiting_deposit' | 'processing' | 'completed' | 'failed' | 'refunded'
  reference:          string | null;
  senderFeeUsd:       number | null;
  appFeeUsd:          number | null;
  bridgeFeeUsd:       number | null;
  createdAt:          string;
  updatedAt:          string;
  steps:              RouteStep[];
}

// ── Asset helpers ──────────────────────────────────────────────────────────
// Asset keys are canonical strings like "crypto:BASE:USDC" or "fiat:NGN".

export type ParsedAsset =
  | { kind: 'crypto'; chain: string; token: string }
  | { kind: 'fiat';   currency: string };

export function parseAsset(key: string): ParsedAsset {
  const [kind, a, b] = key.split(':');
  if (kind === 'fiat')   return { kind: 'fiat',   currency: a };
  return { kind: 'crypto', chain: a, token: b };
}

export function assetLabel(key: string): string {
  const a = parseAsset(key);
  return a.kind === 'fiat' ? a.currency : `${a.token} · ${a.chain}`;
}

export type Direction = 'offramp' | 'onramp' | 'bridge' | 'transfer';

export function directionOf(order: Pick<Order, 'sourceAssetKey' | 'destAssetKey'>): Direction {
  const s = parseAsset(order.sourceAssetKey).kind;
  const d = parseAsset(order.destAssetKey).kind;
  if (s === 'crypto' && d === 'fiat')   return 'offramp';
  if (s === 'fiat'   && d === 'crypto') return 'onramp';
  if (s === 'crypto' && d === 'crypto') return 'bridge';
  return 'transfer';
}
