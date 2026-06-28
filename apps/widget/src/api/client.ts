// Widget ↔ API transport.
//
// Auth pattern:
//   • Browser widget  → x-api-key: pk_live_... (publishable key, safe in JS)
//   • Merchant server → x-public-key + x-secret-key headers (server-side only)
//
// The secretKey NEVER belongs in browser code. WeaveCheckout accepts only
// the publishable key (apiKey prop).

// API base resolution — security-sensitive.
//
// The widget is embedded on third-party merchant pages. The previous version
// read a MUTABLE global `window.__WEAVE_API_BASE__` FIRST, so any other script
// on the host page could point every request (carrying the api key, customer
// PII, bank/refund details) at an attacker — who would then control the
// depositAddress / bankDetails the user pays into. Fund-redirection vector.
//
// Hardened resolution, in precedence order:
//   1. `configureApiBase(...)` — the trusted integrator value from the
//      WeaveCheckout `apiBase` prop. Lives in module scope (NOT on window), so
//      a foreign script on the page cannot reach or overwrite it.
//   2. `window.__WEAVE_API_BASE__` — honored ONLY when it is a same-origin
//      RELATIVE path (e.g. '/api/public', used by our hosted /pay page). A
//      relative path can only ever hit the host's own origin, never an
//      attacker's server. Absolute / protocol-relative values are ignored.
//   3. Build-time env (`VITE_API_BASE`), then localhost default.
//
// Resolved once and cached so it cannot be swapped mid-session.

let _configuredBase: string | null = null;
let _resolvedBase: string | null = null;

/** Configure the API base from the trusted `apiBase` prop. */
export function configureApiBase(base: string) {
  if (base) {
    _configuredBase = base;
    _resolvedBase = null; // re-resolve with the new trusted value
  }
}

// Same-origin relative path: starts with a single '/'. Protocol-relative
// ('//evil.com') and absolute URLs are explicitly NOT relative.
function isSameOriginRelative(base: string): boolean {
  return base.startsWith('/') && !base.startsWith('//');
}

function getApiBase() {
  if (_resolvedBase) return _resolvedBase;

  const envBase =
    (import.meta as any).env?.VITE_API_BASE ||
    (import.meta as any).env?.NEXT_PUBLIC_API_BASE ||
    (import.meta as any).env?.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000/api/v1';

  const winOverride =
    typeof window !== 'undefined' ? (window as any).__WEAVE_API_BASE__ : undefined;
  const safeWinOverride =
    winOverride && isSameOriginRelative(String(winOverride)) ? String(winOverride) : null;

  _resolvedBase = _configuredBase || safeWinOverride || envBase;
  return _resolvedBase;
}

async function apiFetch(path: string, publishableKey: string, options?: RequestInit, timeoutMs = 15000) {
  const base = getApiBase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': publishableKey,
    ...(options?.headers as Record<string, string> | undefined),
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res  = await fetch(`${base}${path}`, { ...options, headers, signal: controller.signal });
    if (res.status === 204) return null;
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? 'API error');
    return json.data;
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error('Request timed out — please check your connection');
    throw err;
  } finally {
    clearTimeout(timer);
  }
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
    reference?:      string;
    sessionId?:      string;
    customer?:       { name?: string; email?: string };
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
