// Widget ↔ API transport. Pure-infra: the widget carries no end-user session.
// The merchant supplies the API key and optionally a merchant-owned userId;
// all auth is API-key based. No cookies, no cross-merchant state.

const API_BASE = (typeof window !== 'undefined' && (window as any).__WEAVE_API_BASE__)
  || import.meta.env?.VITE_API_BASE
  || 'http://localhost:4000/api/v1';

async function apiFetch(path: string, apiKey: string | null, options?: RequestInit) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'x-api-key': apiKey } : {}),
    ...(options?.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 204) return null;
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'API error');
  return json.data;
}

// ── Asset key helpers ──────────────────────────────────────────────────────
// The API identifies rails as canonical strings: `fiat:NGN`, `crypto:BASE:USDC`.
export const fiatKey   = (currency: string)                  => `fiat:${currency.toUpperCase()}`;
export const cryptoKey = (chain: string, token: string)      => `crypto:${chain.toUpperCase()}:${token.toUpperCase()}`;

// ── Quotes ─────────────────────────────────────────────────────────────────

export interface QuoteBreakdown {
  usdEquivalent: number;
  senderFeeUsd:  number;
  appFeeUsd:     number;
  bridgeFeeUsd:  number;
  netUsd:        number;
  sellRate:      number | null;
  buyRate:       number | null;
}

export interface Quote {
  estimatedDest: number;
  route:         { steps: Array<{ provider: string; fromAsset: string; toAsset: string }> };
  breakdown:     QuoteBreakdown;
}

export async function fetchQuote(
  apiKey: string,
  args: { from: string; to: string; amount: number; amountIn?: 'source' | 'dest' },
): Promise<Quote> {
  const qs = new URLSearchParams({
    from:   args.from,
    to:     args.to,
    amount: String(args.amount),
    ...(args.amountIn ? { amountIn: args.amountIn } : {}),
  });
  return apiFetch(`/quotes?${qs}`, apiKey);
}

// ── Instruments / Orders ───────────────────────────────────────────────────

export interface InlineBankInstrument {
  kind:                  'bank_account';
  assetKey:              string;    // e.g. "fiat:NGN"
  label?:                string;
  bankInstitution:       string;
  bankAccountIdentifier: string;
  bankAccountName:       string;
}

export interface InlineWalletInstrument {
  kind:          'crypto_wallet';
  assetKey:      string;              // e.g. "crypto:BASE:USDC"
  label?:        string;
  walletAddress: string;
}

export type InlineInstrument = InlineBankInstrument | InlineWalletInstrument;
export type InstrumentRef    = { instrumentId: string } | { inline: InlineInstrument };

export interface NextAction {
  screen:         'collect_crypto' | 'collect_fiat';
  depositAddress?: string;
  amount?:         number;
  token?:          string;
  chain?:          string;
  bankDetails?: {
    institution:       string;
    accountIdentifier: string;
    accountName:       string;
    amountToTransfer:  string;
    currency:          string;
    reference:         string;
  };
  expiresAt?:     string;
}

export interface CreateOrderResponse {
  order:      { id: string; status: string; sourceAssetKey: string; destAssetKey: string; sourceAmount: number; destAmount: number | null };
  nextAction: NextAction;
  firstStep:  { sequence: number; provider: string; fromAsset: string; toAsset: string };
}

export async function createOrder(
  apiKey: string,
  payload: { source: InstrumentRef; dest?: InstrumentRef; amount: number; reference?: string },
): Promise<CreateOrderResponse> {
  return apiFetch('/orders', apiKey, {
    method: 'POST',
    body:   JSON.stringify(payload),
  });
}

export async function fetchOrder(apiKey: string, orderId: string) {
  return apiFetch(`/orders/${orderId}`, apiKey);
}

// ── Reference data ─────────────────────────────────────────────────────────

export async function fetchCountries(apiKey: string) {
  return apiFetch('/ramp/countries', apiKey);
}
