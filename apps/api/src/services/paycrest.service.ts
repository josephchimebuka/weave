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

  /** HMAC-SHA256(secret, rawBody), hex. Mirrors Paycrest's reference verifier:
   *  `.trim()` the secret and `.trim().toLowerCase()` the signature so a stray
   *  newline pasted into PAYCREST_WEBHOOK_SECRET, or a differently-cased header,
   *  can't cause a false mismatch. Accepts an optional `sha256=` prefix. */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const key = (this.webhookSecret || '').trim();
    if (!key) {
      console.error('[security] PAYCREST_WEBHOOK_SECRET not set. Rejecting all webhooks.');
      return false;
    }
    const sig = (signature || '').trim().toLowerCase().replace(/^sha256=/, '');
    if (!sig) return false;

    const expected = crypto.createHmac('sha256', key).update(rawBody, 'utf8').digest('hex');
    let ok = false;
    if (expected.length === sig.length) {
      try {
        ok = crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(sig, 'utf8'));
      } catch {
        ok = false;
      }
    }
    if (!ok) {
      // Prefixes are safe to log (not the secret). If expected ≈ received the
      // problem is length/encoding; if they differ it's the wrong secret/body.
      console.warn(
        `[webhook] paycrest sig mismatch — expected ${expected.slice(0, 12)}… got ${sig.slice(0, 12)}… ` +
        `(secret len ${key.length}, body len ${rawBody.length})`,
      );
      // TEMP DIAGNOSTIC: the secret looks base64 (len 44 = 32 bytes). Paycrest may
      // key the HMAC with the *decoded* bytes, not the string. Report which key
      // interpretation reproduces the received signature, then delete this block.
      for (const variant of ['base64', 'hex'] as const) {
        try {
          const keyBuf = Buffer.from(key, variant);
          if (keyBuf.length === 0) continue;
          const alt = crypto.createHmac('sha256', keyBuf).update(rawBody, 'utf8').digest('hex');
          console.warn(`[webhook] paycrest sig probe — key-as-${variant}: ${alt.slice(0, 12)}…${alt === sig ? '  ← MATCH' : ''}`);
        } catch { /* invalid encoding for this variant */ }
      }
    }
    return ok;
  }
}

export const paycrest = new PaycrestService();
