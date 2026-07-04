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

  /** GET /v2/rates/{network}/{token}/{amount}/{fiat} — no auth. */
  async getRate(network: string, token: string, amount: number | string, fiat: string): Promise<PCRate> {
    return this.request<PCRate>(
      'GET',
      `/rates/${network}/${token}/${amount}/${fiat}`,
      undefined,
      false,
    );
  }

  /** GET /v2/institutions/{currency} — no auth. */
  async getInstitutions(currency: string): Promise<PCInstitution[]> {
    return this.request<PCInstitution[]>(
      'GET',
      `/institutions/${currency.toUpperCase()}`,
      undefined,
      false,
    );
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
