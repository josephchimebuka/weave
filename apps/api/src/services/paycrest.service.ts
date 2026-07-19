import crypto from 'crypto';

// ── Types ────────────────────────────────────────────────────────────────────

interface PCEnvelope<T> { status: string; message: string; data: T; }

export interface PCRate {
  buy:  { rate: string; providerIds: string[]; orderType: string; refundTimeoutMinutes: number };
  sell: { rate: string; providerIds: string[]; orderType: string; refundTimeoutMinutes: number };
}

export interface PCInstitution { name: string; code: string; type: string; }

export interface PCFiatRecipient {
  institution:       string;
  accountIdentifier: string;
  accountName:       string;
  memo?:             string;
}
export interface PCFiatRefundAccount {
  institution:       string;
  accountIdentifier: string;
  accountName:       string;
}

export interface PCCryptoProviderAccount { network: string; receiveAddress: string; validUntil: string; }
export interface PCFiatProviderAccount {
  institution:       string;
  accountIdentifier: string;
  accountName:       string;
  amountToTransfer:  string;
  currency:          string;
  validUntil:        string;
}
export interface PCOrder {
  id:               string;
  status:           string;
  orderType:        'regular' | 'otc';
  timestamp:        string;
  amount:           string;
  rate:             string;
  senderFee:        string;
  senderFeePercent: string;
  transactionFee:   string;
  reference:        string;
  providerAccount:  PCCryptoProviderAccount | PCFiatProviderAccount;
  source:           any;
  destination:      any;
}

export interface CreateOfframpParams {
  amount:        string;                // amount in the unit implied by `amountIn` (defaults to crypto)
  amountIn?:     'crypto' | 'fiat';     // when 'fiat', `amount` is fiat and Paycrest derives crypto
  token:         string;                // "USDC" | "USDT"
  network:       string;                // "base" | "ethereum" | ...
  refundAddress: string;                // sender wallet for refunds
  fiatCurrency:  string;                // "NGN"
  recipient:     PCFiatRecipient;       // merchant payout
  reference:     string;
}
export interface CreateOnrampParams {
  amount:          string;              // fiat amount
  fiatCurrency:    string;              // "NGN"
  refundAccount:   PCFiatRefundAccount; // where fiat refund goes if fulfilment fails
  cryptoCurrency:  string;              // "USDC"
  cryptoNetwork:   string;              // "base"
  cryptoRecipient: string;              // merchant wallet
  reference:       string;
}

// Institutions (bank lists) change rarely — cache per currency.
const institutionsCache = new Map<string, { data: PCInstitution[]; cachedAt: number }>();
const INSTITUTIONS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Rates: stale-while-revalidate. Paycrest's /rates endpoint was observed taking
// 1.3–7s, and it sits on the hot path of every quote and every fiat order. A
// plain TTL cache would serve stale rates silently; instead:
//   age < FRESH_MS      → serve cached, no fetch
//   age < MAX_STALE_MS  → serve cached instantly, refresh in background (deduped)
//   older / no entry    → blocking fetch (fails loudly if Paycrest is down —
//                         we never quote money off an old rate when it's truly old)
interface RateCacheEntry { data: PCRate; fetchedAt: number; revalidating: Promise<unknown> | null }
const rateCache = new Map<string, RateCacheEntry>();
const RATE_FRESH_MS     = Number(process.env.PAYCREST_RATE_FRESH_MS     ?? 10_000);
const RATE_MAX_STALE_MS = Number(process.env.PAYCREST_RATE_MAX_STALE_MS ?? 60_000);

// ── Service ──────────────────────────────────────────────────────────────────

export class PaycrestService {
  private baseUrl:       string;
  private apiKey:        string;
  private webhookSecret: string;

  constructor() {
    this.baseUrl       = (process.env.PAYCREST_API_URL || 'https://api.paycrest.io/v2').replace(/\/$/, '');
    this.apiKey        = process.env.PAYCREST_API_KEY || '';
    this.webhookSecret = process.env.PAYCREST_WEBHOOK_SECRET || '';
  }

  private async request<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) headers['API-Key'] = this.apiKey;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Paycrest ${res.status}: ${text}`);
      return (JSON.parse(text) as PCEnvelope<T>).data;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** GET /v2/rates/{network}/{token}/{amount}/{fiat} — no auth.
   *  Stale-while-revalidate (see rateCache above): instant answer within the
   *  stale window, blocking fetch beyond it. */
  async getRate(network: string, token: string, amount: number | string, fiat: string): Promise<PCRate> {
    const key = `${network}/${token}/${amount}/${fiat.toUpperCase()}`;
    const cached = rateCache.get(key);
    const age = cached ? Date.now() - cached.fetchedAt : Infinity;

    if (cached && age < RATE_FRESH_MS) return cached.data;

    if (cached && age < RATE_MAX_STALE_MS) {
      if (!cached.revalidating) {
        cached.revalidating = this.fetchRate(key, network, token, amount, fiat)
          .catch((err: any) => {
            // Keep serving the stale entry; the next call past a failed refresh retries.
            console.warn(`[paycrest] background rate refresh failed for ${key}:`, err.message);
          })
          .finally(() => {
            const entry = rateCache.get(key);
            if (entry) entry.revalidating = null;
          });
      }
      return cached.data;
    }

    return this.fetchRate(key, network, token, amount, fiat);
  }

  private async fetchRate(key: string, network: string, token: string, amount: number | string, fiat: string): Promise<PCRate> {
    const data = await this.request<PCRate>(
      'GET',
      `/rates/${network}/${token}/${amount}/${fiat}`,
      undefined,
      false,
    );
    rateCache.set(key, { data, fetchedAt: Date.now(), revalidating: null });
    return data;
  }

  /** GET /v2/institutions/{currency} — no auth. Cached 24h per currency. */
  async getInstitutions(currency: string): Promise<PCInstitution[]> {
    const key = currency.toUpperCase();
    const cached = institutionsCache.get(key);
    if (cached && Date.now() - cached.cachedAt < INSTITUTIONS_CACHE_TTL_MS) return cached.data;

    const data = await this.request<PCInstitution[]>(
      'GET',
      `/institutions/${key}`,
      undefined,
      false,
    );
    institutionsCache.set(key, { data, cachedAt: Date.now() });
    return data;
  }

  /** POST /v2/sender/orders — offramp (crypto → fiat). */
  async createOfframpOrder(params: CreateOfframpParams): Promise<PCOrder> {
    return this.request<PCOrder>('POST', '/sender/orders', {
      amount: params.amount,
      ...(params.amountIn ? { amountIn: params.amountIn } : {}),
      source: {
        type:          'crypto',
        currency:      params.token,
        network:       params.network,
        refundAddress: params.refundAddress,
      },
      destination: {
        type:      'fiat',
        currency:  params.fiatCurrency,
        recipient: params.recipient,
      },
      reference: params.reference,
    });
  }

  /** POST /v2/sender/orders — onramp (fiat → crypto). */
  async createOnrampOrder(params: CreateOnrampParams): Promise<PCOrder> {
    return this.request<PCOrder>('POST', '/sender/orders', {
      amount:   params.amount,
      amountIn: 'fiat',
      source: {
        type:          'fiat',
        currency:      params.fiatCurrency,
        refundAccount: params.refundAccount,
      },
      destination: {
        type:     'crypto',
        currency: params.cryptoCurrency,
        recipient: {
          address: params.cryptoRecipient,
          network: params.cryptoNetwork,
        },
      },
      reference: params.reference,
    });
  }

  /** GET /v2/sender/orders/{id} */
  async getOrder(orderId: string): Promise<PCOrder> {
    return this.request<PCOrder>('GET', `/sender/orders/${orderId}`);
  }
  
  /** POST /v2/verify-account */
  async verifyAccount(params: {
    institution: string;
    accountIdentifier: string;
    currency: string;
  }): Promise<string> {
    return this.request<string>('POST', '/verify-account', params);
  }

  /** HMAC-SHA256(secret, rawBody), hex. Accepts an optional `sha256=` prefix.
   *
   *  Trailing-newline quirk: Paycrest's aggregator signs `json.Marshal(payload)`
   *  (no trailing newline) but transmits the body via fast-shot's `AsJSON`, which
   *  uses `json.NewEncoder(...).Encode()` — and that ALWAYS appends a trailing
   *  '\n'. So the raw body we receive is `signedBytes + "\n"`, one byte longer
   *  than what was signed, and a standard raw-body HMAC never matches. We verify
   *  against the body as-received AND with a trailing newline stripped, so both
   *  the quirky and any future fixed sender path pass. The secret is `.trim()`ed
   *  and the signature `.trim().toLowerCase()`ed to tolerate copy-paste/casing noise. */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const key = (this.webhookSecret || '').trim();
    if (!key) {
      console.error('[security] PAYCREST_WEBHOOK_SECRET not set. Rejecting all webhooks.');
      return false;
    }
    const sig = (signature || '').trim().toLowerCase().replace(/^sha256=/, '');
    if (!sig) return false;

    // Candidate bodies: exactly as received, and with a single trailing newline
    // removed (the aggregator's fast-shot Encoder appends one after signing).
    const candidates: Array<{ body: string; label: string }> = [{ body: rawBody, label: 'raw' }];
    const stripped = rawBody.replace(/\r?\n$/, '');
    if (stripped !== rawBody) candidates.push({ body: stripped, label: 'newline-stripped' });

    let lastExpected = '';
    for (const { body, label } of candidates) {
      const expected = crypto.createHmac('sha256', key).update(body, 'utf8').digest('hex');
      lastExpected = expected;
      if (expected.length !== sig.length) continue;
      try {
        if (crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(sig, 'utf8'))) {
          if (label !== 'raw') {
            console.log(`[webhook] paycrest sig verified against ${label} body — confirms aggregator trailing-\\n quirk`);
          }
          return true;
        }
      } catch { /* fall through to next candidate */ }
    }

    console.warn(
      `[webhook] paycrest sig mismatch — expected ${lastExpected.slice(0, 12)}… got ${sig.slice(0, 12)}… ` +
      `(secret len ${key.length}, body len ${rawBody.length})`,
    );
    return false;
  }
}

export const paycrest = new PaycrestService();
