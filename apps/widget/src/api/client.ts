// Widget ↔ API transport.
//
// Auth pattern:
//   • Browser widget  → x-api-key: pk_live_... (publishable key, safe in JS)
//   • Merchant server → x-public-key + x-secret-key headers (server-side only)
//
// The secretKey NEVER belongs in browser code. WeaveCheckout accepts only
// the publishable key (apiKey prop).

function getApiBase() {
  if (typeof window !== 'undefined' && (window as any).__WEAVE_API_BASE__) {
    return (window as any).__WEAVE_API_BASE__;
  }
  return (
    (import.meta as any).env?.VITE_API_BASE ||
    (import.meta as any).env?.NEXT_PUBLIC_API_BASE ||
    (import.meta as any).env?.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000/api/v1'
  );
}

async function apiFetch(path: string, publishableKey: string, options?: RequestInit) {
  const base = getApiBase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': publishableKey,
    ...(options?.headers as Record<string, string> | undefined),
  };
  const res  = await fetch(`${base}${path}`, { ...options, headers });
  if (res.status === 204) return null;
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'API error');
  return json.data;
}

// ── Asset key helpers ──────────────────────────────────────────────────────
export const fiatKey   = (currency: string)             => `fiat:${currency.toUpperCase()}`;
export const cryptoKey = (chain: string, token: string) => `crypto:${chain.toUpperCase()}:${token.toUpperCase()}`;

// ── Quotes ─────────────────────────────────────────────────────────────────

export interface QuoteBreakdown {
  usdEquivalent: number;
  sourceAmount:  number;
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
  publishableKey: string,
  args: { from: string; to: string; amount: number; amountIn?: 'source' | 'dest' },
): Promise<Quote> {
  const qs = new URLSearchParams({
    from:   args.from,
    to:     args.to,
    amount: String(args.amount),
    ...(args.amountIn ? { amountIn: args.amountIn } : {}),
  });
  return apiFetch(`/quotes?${qs}`, publishableKey);
}

// ── Instruments / Orders ───────────────────────────────────────────────────

export interface InlineBankInstrument {
  kind:                  'bank_account';
  assetKey:              string;
  label?:                string;
  bankInstitution:       string;
  bankAccountIdentifier: string;
  bankAccountName:       string;
}

export interface InlineWalletInstrument {
  kind:          'crypto_wallet';
  assetKey:      string;
  label?:        string;
  walletAddress: string;
}

export type InlineInstrument = InlineBankInstrument | InlineWalletInstrument;
export type InstrumentRef    = { instrumentId: string } | { inline: InlineInstrument };

export interface NextAction {
  screen:          'collect_crypto' | 'collect_fiat' | 'paystack_bank_transfer' | 'paystack_popup';
  depositAddress?: string;
  depositMemo?:    string;
  amount?:         number;
  token?:          string;
  chain?:          string;
  bankDetails?: {
    institution:       string;
    accountIdentifier: string;
    accountName:       string;
    amountToTransfer:  string;
    currency:          string;
  };
  paystackDetails?: {
    bankName:      string;
    accountNumber: string;
    amount:        number;
    reference:     string;
  };
  paystackPopupDetails?: {
    accessCode: string;
    publicKey:  string;
    amount:     number;
    reference:  string;
  };
  expiresAt?: string;
}

export type Flow = 'self' | 'external';

export interface CreateOrderResponse {
  order:      { id: string; status: string; sourceAssetKey: string; destAssetKey: string; sourceAmount: number; destAmount: number | null };
  nextAction: NextAction;
  firstStep:  { sequence: number; provider: string; fromAsset: string; toAsset: string };
}

export async function createOrder(
  publishableKey: string,
  payload: {
    source:          InstrumentRef;
    dest?:           InstrumentRef;
    amount:          number;
    amountIn?:       'source' | 'dest';
    flow?:           Flow;
    refundAddress?:  string;
  },
): Promise<CreateOrderResponse> {
  return apiFetch('/orders', publishableKey, {
    method: 'POST',
    body:   JSON.stringify(payload),
  });
}

export async function fetchOrder(publishableKey: string, orderId: string) {
  return apiFetch(`/orders/${orderId}`, publishableKey);
}

// ── Reference data ─────────────────────────────────────────────────────────

export async function fetchCountries(publishableKey: string) {
  return apiFetch('/ramp/countries', publishableKey);
}

export async function fetchAssets(publishableKey: string) {
  return apiFetch('/assets', publishableKey);
}
