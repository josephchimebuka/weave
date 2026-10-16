// Widget ↔ API transport.
//
// Auth pattern:
//   • Browser widget  → x-api-key: pk_live_... (publishable key, safe in JS)
//   • Merchant server → x-secret-key: sk_live_... header (server-side only)
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

    // Parse defensively: gateways return non-JSON bodies on 429/502, which the
    // old `await res.json()` turned into an opaque SyntaxError.
    const text = await res.text();
    let json: any = null;
    if (text) { try { json = JSON.parse(text); } catch { /* non-JSON body */ } }

    if (!res.ok || (json && json.success === false)) {
      const message =
        (json && json.error) ||
        (res.status === 429 ? 'Too many requests — please wait a moment and retry.'
          : res.status >= 500 ? 'The payment service is temporarily unavailable. Please try again.'
            : `Request failed (${res.status})`);
      const err: any = new Error(message);
      err.status = res.status;
      // Preserve any recoverable payload (e.g. the existing orderId returned with
      // a 409 duplicate-reference) instead of discarding it.
      if (json && json.data) err.data = json.data;
      throw err;
    }

    return json ? json.data : null;
  } catch (err: any) {
    if (err?.name === 'TypeError' && /failed to fetch/i.test(err?.message ?? '')) {
      throw new Error('Cannot reach Weave API — confirm it is running (http://localhost:4000/health) and CORS allows this page.');
    }
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

export type StellarPublicConfig = {
  enabled?: boolean;
  checkoutEnabled?: boolean;
  network?: string;
};

/** Public treasury/network flags — no API key required. */
export async function fetchStellarPublicConfig(): Promise<StellarPublicConfig | null> {
  try {
    const base = getApiBase();
    const res = await fetch(`${base}/stellar/config`);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchQuote(
  publishableKey: string,
  args: { from: string; to: string; amount: number; amountIn?: 'source' | 'dest'; flow?: Flow },
): Promise<Quote> {
  const qs = new URLSearchParams({
    from:   args.from,
    to:     args.to,
    amount: String(args.amount),
    ...(args.amountIn ? { amountIn: args.amountIn } : {}),
    ...(args.flow ? { flow: args.flow } : {}),
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
  screen:          'collect_crypto' | 'collect_fiat' | 'paystack_popup' | 'bachs_checkout' | 'sign_stellar_tx';
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
  bachsCheckout?: {
    checkoutUrl: string;
    amount:      number;
    reference:   string;
  };
  // LI.FI Stellar leg (USDC on Stellar → Base via Circle CCTP). The payer's
  // Stellar wallet signs `approveXdr`, fetches the bridge XDR from
  // `bridgeTxPath`, signs it, and reports the hash to `submittedPath`.
  // The embeddable widget does not sign Stellar transactions itself; the
  // hosted /ramp pages and the corridor app do.
  stellarSigning?: {
    fromAddress:     string;
    amount:          number;
    token:           string;
    chain:           string;
    approveXdr:      string | null;
    approvalAddress: string;
    approveTxPath:   string;
    bridgeTxPath:    string;
    submittedPath:   string;
    estimatedSecs:   number;
    tool:            string;
  };
  expiresAt?: string;
}

export type Flow = 'self' | 'external' | 'stellar';

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

// ── Checkout sessions ──────────────────────────────────────────────────────
// Public (unauthenticated-by-key) session read used to resume a hosted checkout
// server-authoritatively. Returns the session's linked `orderId`/`orderStatus`
// so the widget resumes the order the SESSION owns rather than whatever order id
// happens to sit in this browser's cache — the fix for a shared device carrying
// a previous payer's pending order.
export interface PublicSession {
  id: string;
  status: 'open' | 'processing' | 'complete' | 'expired';
  orderId: string | null;
  orderStatus: string | null;
}

export async function fetchSession(publishableKey: string, sessionId: string): Promise<PublicSession> {
  return apiFetch(`/checkout/sessions/public/${sessionId}`, publishableKey);
}

// ── Reference data ─────────────────────────────────────────────────────────

export async function fetchCountries(publishableKey: string) {
  return apiFetch('/ramp/countries', publishableKey);
}

export async function fetchAssets(publishableKey: string) {
  return apiFetch('/assets', publishableKey);
}

// ── Session timeline events ────────────────────────────────────────────────
// Best-effort client telemetry for the transaction "Payment activity" view.
// Never disrupts checkout: swallow all errors. Server whitelists/relabels these.
export interface ClientOrderEvent {
  type: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export async function postOrderEvents(
  publishableKey: string,
  orderId: string,
  events: ClientOrderEvent[],
): Promise<void> {
  if (!orderId || events.length === 0) return;
  try {
    await apiFetch(`/orders/${orderId}/events`, publishableKey, {
      method: 'POST',
      body: JSON.stringify({ events }),
    }, 5000);
  } catch {
    /* telemetry is best-effort — never surface to the payer */
  }
}
