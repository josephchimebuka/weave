// Thin client for the Bachs Connect API (docs.bachs.io). Bachs is the CBN-licensed
// party; Dewdrop Labs is a Connect *platform* and each vendor is a *connected
// account*. Naira collection uses the "split payments / you collect" model:
//   1. Customer pays a charge on OUR platform balance (checkout session).
//   2. On settlement, we transfer the vendor its share to its connected account.
// Funds rest transiently in our Bachs BALANCE (custodied by Bachs), never in our
// own bank account — so this is the Paystack shape, not unlicensed aggregation.
//
// Auth is a plain bearer secret key (sk_sandbox_… / sk_live_…); there is no token
// exchange. Money is ALWAYS a decimal string at the currency's precision
// ("75000.00"), paired with an ISO 4217 currency — never minor units.

import crypto from 'crypto';

// ── Amount helper ─────────────────────────────────────────────────────────────

/** Human number → Bachs decimal string, always 2 dp ("75000" → "75000.00"). */
export function toBachsAmount(n: number | string): string {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (!Number.isFinite(num)) throw new Error(`invalid Bachs amount: ${n}`);
  return num.toFixed(2);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type BachsPaymentMethod = 'card' | 'bank_transfer' | 'crypto' | 'mobile_money';
export type CapabilityStatus = 'active' | 'pending' | 'restricted' | 'unrequested' | 'unsupported';

export interface BachsConnectedAccount {
  id: string;                       // "org_…"
  name: string;
  parent_organization_id: string;
  capabilities: Record<string, { status: CapabilityStatus; requested: boolean; status_details: unknown }>;
  is_active: boolean;
}

export interface BachsAccountLink {
  id: string;
  account: string;
  type: string;
  url: string;                      // hosted onboarding URL to hand the vendor
  expires_at: string;
  previous_link_superseded: boolean;
}

export interface BachsCheckoutSession {
  checkout_id: string;              // "chk_…"
  checkout_url: string;             // hand to widget: Bachs.Checkout.open({ checkoutUrl })
  status: string;                   // "OPEN" | …
  amount?: string;
  currency?: string;
  expires_at: string;
  created_at: string;
}

export interface BachsTransfer {
  id: string;                       // "tr_…"
  source: string;
  destination: string;
  amount: string;
  currency: string;
  status: string;                   // "paid" | …
  transfer_group?: string;
  description?: string;
  created_at: string;
}

export interface BachsBalanceEntry {
  currency: string;
  available_balance: string;
  pending_balance: string;
}
export interface BachsBalances {
  account_id: string;
  balances: BachsBalanceEntry[];
  total_balance_usd: string;
  pending_settlements_by_day: Array<{ available_at: string; currency: string; amount: string }>;
}

export interface BachsPayoutDestination {
  id: string;                       // Bachs destination id (a UUID, despite the "pd_" naming in older docs)
  destination_type: 'bank_account' | 'mobile_money' | 'crypto_wallet';
  currency?: string;
  account_number?: string | null;
  account_name?: string | null;
  bank_code?: string | null;
  is_active?: boolean;
  is_usable?: boolean;              // only a usable destination can receive a withdrawal
  review_status?: string;          // "approved" | "pending" | …
}

export interface BachsWithdrawal {
  withdrawal_id: string;            // "wd_…"
  status: string;                   // REQUESTED | PENDING | PROCESSING | COMPLETED | FAILED
  provider_reference: string | null;
}

export interface BachsChecklistField {
  field_key: string;                // e.g. "persons.0.first_name"
  label: string;
  group: string;                    // "identity" | "bank_verification" | …
  state: string;                    // "currently_due" | "pending_review" | "pending_verification" | …
  provided: boolean;
  error_reason: string | null;
  reference?: unknown;
}
export interface BachsChecklist {
  organization_id: string;
  entity_type: string;              // "individual" | "company"
  country: string;
  currently_due: number;
  pending_review: number;
  in_verification?: number;
  setup_status: string;             // "incomplete" | "complete"
  checklist: BachsChecklistField[];
  capabilities: Array<{ capability_name: string; state: string; satisfied: boolean; fields: string[] }>;
}
export interface BachsSubmitResult {
  account_id: string;
  persons?: string[];
  sections?: string[];
  errors: Array<{ field_key?: string; message?: string } | string>;
}

// Params ------------------------------------------------------------------------

export interface CreateConnectedAccountParams {
  contactEmail: string;
  displayName: string;
  country?: string;                 // ISO 3166-1 alpha-2, default "NG"
}

export interface CreateCheckoutSessionParams {
  amount: number | string;         // raw NGN amount
  currency?: string;               // default "NGN"
  reference: string;               // our order id (unique per org, ≤128 chars)
  customer?: { email?: string; name?: string; phoneNumber?: string };
  successUrl?: string;
  cancelUrl?: string;
  allowedPaymentMethodTypes?: BachsPaymentMethod[];
  metadata?: Record<string, string>;
  expiresInMinutes?: number;
}

export interface CreateTransferParams {
  destination: string;             // connected account "org_…" (or "self" for clawback)
  amount: number | string;
  currency?: string;               // default "NGN"
  transferGroup?: string;          // = charge id, ties split to the funding charge
  description?: string;
  idempotencyKey: string;
  /** Set to act AS a connected account (clawback: destination "self"). */
  actingAccountId?: string;
}

export interface CreateWithdrawalParams {
  connectedAccountId: string;      // vendor whose balance funds the withdrawal
  amount: number | string;
  fromCurrency?: string;           // default "NGN"
  toCurrency?: string;             // default "NGN"
  paymentMethod?: string;          // default "BANK_TRANSFER"
  reference: string;               // unique per account
  email: string;                   // REQUIRED by Bachs — payout notification recipient
  payoutDestinationId: string;     // Bachs destination id (UUID)
  idempotencyKey: string;
}

// ── Service ────────────────────────────────────────────────────────────────────

export class BachsService {
  private webhookSecret: string;

  constructor() {
    this.webhookSecret = process.env.BACHS_WEBHOOK_SECRET || '';
    if (!process.env.BACHS_SECRET_KEY) {
      console.warn('[Bachs] BACHS_SECRET_KEY is not set. Live requests will fail with 401.');
    }
  }

  /**
   * True when the sandbox SECRET key is configured, so a Weave sandbox order can
   * provision a REAL Bachs sandbox checkout (real overlay + test payment, settled
   * on poll in syncOrder) instead of the fully-mocked fallback. Mirrors
   * paystack.hasTestKeys().
   */
  hasTestKeys(): boolean {
    return !!process.env.BACHS_SECRET_KEY_TEST;
  }

  // Sandbox uses a strictly separate base URL + sk_sandbox_ key so a sandbox order
  // can never touch live Bachs (and vice-versa). We never fall back from test to
  // live: a missing test key keeps the caller on the fully-mocked sandbox path.
  private creds(sandbox: boolean): { baseUrl: string; secretKey: string } {
    const baseUrl = sandbox
      ? (process.env.BACHS_SANDBOX_API_BASE || 'https://sandbox-api.bachs.io')
      : (process.env.BACHS_API_BASE || 'https://api.bachs.io');
    const secretKey = sandbox ? process.env.BACHS_SECRET_KEY_TEST : process.env.BACHS_SECRET_KEY;
    if (!secretKey) {
      throw new Error(
        sandbox
          ? 'BACHS_SECRET_KEY_TEST is required for sandbox Bachs transactions'
          : 'BACHS_SECRET_KEY is required but missing',
      );
    }
    return { baseUrl: baseUrl.replace(/\/$/, ''), secretKey: secretKey.replace(/^["']|["']$/g, '').trim() };
  }

  private async request<T>(
    method: string,
    path: string,
    opts: { body?: unknown; connectedAccountId?: string; idempotencyKey?: string; sandbox?: boolean } = {},
  ): Promise<T> {
    const { baseUrl, secretKey } = this.creds(!!opts.sandbox);
    const headers: Record<string, string> = {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${secretKey}`,
    };
    // Act as a connected account (e.g. clawback, withdrawal from a vendor balance).
    if (opts.connectedAccountId) headers['X-Connected-Account-ID'] = opts.connectedAccountId;
    // Idempotency-Key makes money-moving POSTs safe to retry — REQUIRED on transfers/withdrawals.
    if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Bachs ${res.status}: ${text}`);
      return (text ? JSON.parse(text) : {}) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ── Connect onboarding ──────────────────────────────────────────────────────

  /** POST /v1/organizations/connected-accounts — create a vendor's connected account. */
  async createConnectedAccount(params: CreateConnectedAccountParams, opts: { sandbox?: boolean } = {}): Promise<BachsConnectedAccount> {
    return this.request<BachsConnectedAccount>('POST', '/v1/organizations/connected-accounts', {
      sandbox: opts.sandbox,
      body: {
        contact_email: params.contactEmail,
        display_name:  params.displayName,
        country:       params.country ?? 'NG',
        // Split-payments vendors only RECEIVE a transfer and withdraw it — they
        // never collect their own charges, so request exactly these two.
        capabilities: {
          transfers: { requested: true },
          payouts:   { requested: true },
        },
      },
    });
  }

  /** POST /v1/connected-accounts/{id}/account-links — hosted onboarding link for the vendor. */
  async createAccountLink(
    accountId: string,
    params: { refreshUrl: string; returnUrl: string },
    opts: { sandbox?: boolean } = {},
  ): Promise<BachsAccountLink> {
    return this.request<BachsAccountLink>('POST', `/v1/connected-accounts/${accountId}/account-links`, {
      sandbox: opts.sandbox,
      body: { type: 'onboarding', refresh_url: params.refreshUrl, return_url: params.returnUrl },
    });
  }

  // ── API onboarding (checklist-driven — we submit KYB data ourselves) ─────────

  /** GET …/requirements/checklist — the field-level onboarding state. */
  async getRequirementsChecklist(accountId: string, opts: { sandbox?: boolean } = {}): Promise<BachsChecklist> {
    return this.request<BachsChecklist>('GET', `/v1/connected-accounts/${accountId}/requirements/checklist`, { sandbox: opts.sandbox });
  }

  /** GET …/requirements/banks — valid bank reference data for the account's country.
   *  Bachs returns `{ country, banks: [...] }`; unwrap to the banks array (tolerate a bare array). */
  async getRequirementsBanks(accountId: string, opts: { sandbox?: boolean } = {}): Promise<Array<{ name: string; code: string }>> {
    const raw = await this.request<any>('GET', `/v1/connected-accounts/${accountId}/requirements/banks`, { sandbox: opts.sandbox });
    return Array.isArray(raw) ? raw : (raw?.banks ?? []);
  }

  /** POST …/requirements/accounts/resolve — confirm a bank account resolves to a name. */
  async resolveRequirementsAccount(accountId: string, params: { accountNumber: string; bankCode: string }, opts: { sandbox?: boolean } = {}): Promise<{ account_name?: string }> {
    return this.request('POST', `/v1/connected-accounts/${accountId}/requirements/accounts/resolve`, {
      sandbox: opts.sandbox,
      body: { account_number: params.accountNumber, bank_code: params.bankCode },
    });
  }

  /** POST …/requirements/submit — submit KYB data keyed by the checklist's field keys. */
  async submitRequirements(accountId: string, params: { country: string; draft: boolean; data: Record<string, unknown> }, opts: { sandbox?: boolean } = {}): Promise<BachsSubmitResult> {
    return this.request<BachsSubmitResult>('POST', `/v1/connected-accounts/${accountId}/requirements/submit`, {
      sandbox: opts.sandbox,
      body: { country: params.country, draft: params.draft, data: params.data },
    });
  }

  /** GET /v1/connected-accounts/{id}/capabilities — read capability statuses.
   *  Bachs returns `{ items: [...] }`; unwrap to the array (tolerate a bare array). */
  async getCapabilities(accountId: string, opts: { sandbox?: boolean } = {}): Promise<{ name: string; status: CapabilityStatus; requested: boolean }[]> {
    const raw = await this.request<any>('GET', `/v1/connected-accounts/${accountId}/capabilities`, { sandbox: opts.sandbox });
    return Array.isArray(raw) ? raw : (raw?.items ?? []);
  }

  // ── Collection ──────────────────────────────────────────────────────────────

  /** POST /v1/checkout-sessions — raw-amount NGN charge on OUR platform balance.
   *  Pass `sandbox` to provision it against the Bachs sandbox (test key + base). */
  async createCheckoutSession(params: CreateCheckoutSessionParams, opts: { sandbox?: boolean } = {}): Promise<BachsCheckoutSession> {
    const customer = params.customer
      ? {
          ...(params.customer.email       ? { email:        params.customer.email }       : {}),
          ...(params.customer.name        ? { name:         params.customer.name }        : {}),
          ...(params.customer.phoneNumber ? { phone_number: params.customer.phoneNumber } : {}),
        }
      : undefined;

    return this.request<BachsCheckoutSession>('POST', '/v1/checkout-sessions', {
      sandbox: opts.sandbox,
      body: {
        // Raw amount (no catalog product) — right for dynamic per-order pricing.
        pricing: { currency: params.currency ?? 'NGN', amount: toBachsAmount(params.amount) },
        ...(customer ? { customer } : {}),
        reference: params.reference,
        ...(params.successUrl ? { success_url: params.successUrl } : {}),
        ...(params.cancelUrl  ? { cancel_url:  params.cancelUrl }  : {}),
        ...(params.allowedPaymentMethodTypes ? { allowed_payment_method_types: params.allowedPaymentMethodTypes } : {}),
        ...(params.metadata ? { metadata: params.metadata } : {}),
        ...(params.expiresInMinutes ? { expires_in_minutes: params.expiresInMinutes } : {}),
      },
    });
  }

  /** GET /v1/checkout-sessions/{id} — poll a checkout's status (webhook fallback,
   *  and the primary settlement signal for sandbox test-mode orders). Bachs exposes
   *  three signals: the session `status` ("open" → paid), `payment_status`
   *  ("requires_payment_method" → paid), and the nested `charge.status`
   *  ("created" → succeeded). We surface all three; the caller treats paid if ANY
   *  reads as settled, since the exact terminal token can vary by rail. */
  async getCheckout(checkoutId: string, opts: { sandbox?: boolean } = {}): Promise<{
    status: string;
    payment_status?: string;
    charge_status?: string;
    charge_id?: string;
  }> {
    const raw = await this.request<any>('GET', `/v1/checkout-sessions/${checkoutId}`, { sandbox: opts.sandbox });
    return {
      status:         String(raw?.status ?? ''),
      payment_status: raw?.payment_status ? String(raw.payment_status) : undefined,
      charge_status:  raw?.charge?.status ? String(raw.charge.status) : undefined,
      charge_id:      raw?.charge?.payment_id ?? raw?.charge?.charge_id ?? undefined,
    };
  }

  // ── Split + balances ────────────────────────────────────────────────────────

  /** POST /v1/transfers — send a connected account its share (or clawback to "self"). */
  async createTransfer(params: CreateTransferParams): Promise<BachsTransfer> {
    return this.request<BachsTransfer>('POST', '/v1/transfers', {
      idempotencyKey:    params.idempotencyKey,
      connectedAccountId: params.actingAccountId,
      body: {
        destination:   params.destination,
        amount:        toBachsAmount(params.amount),
        currency:      params.currency ?? 'NGN',
        ...(params.transferGroup ? { transfer_group: params.transferGroup } : {}),
        ...(params.description   ? { description:    params.description }   : {}),
      },
    });
  }

  async getTransfer(id: string): Promise<BachsTransfer> {
    return this.request<BachsTransfer>('GET', `/v1/transfers/${id}`);
  }

  async listTransfers(params: { transferGroup?: string; connectedAccountId?: string; limit?: number } = {}): Promise<{ data: BachsTransfer[] }> {
    const qs = new URLSearchParams();
    if (params.transferGroup)     qs.set('transfer_group', params.transferGroup);
    if (params.connectedAccountId) qs.set('connected_account_id', params.connectedAccountId);
    qs.set('limit', String(params.limit ?? 50));
    return this.request('GET', `/v1/transfers?${qs.toString()}`);
  }

  /** GET /v1/accounts/balances — our platform balance, or a connected account's. */
  async getBalances(connectedAccountId?: string): Promise<BachsBalances> {
    return this.request<BachsBalances>('GET', '/v1/accounts/balances', { connectedAccountId });
  }

  // ── Vendor withdrawal (payout to bank) ──────────────────────────────────────

  /** GET /v1/payouts/destinations — list a connected account's bank destinations. */
  async listPayoutDestinations(connectedAccountId: string, opts: { sandbox?: boolean } = {}): Promise<BachsPayoutDestination[]> {
    const raw = await this.request<any>('GET', '/v1/payouts/destinations', { connectedAccountId, sandbox: opts.sandbox });
    return Array.isArray(raw) ? raw : (raw?.destinations ?? []);
  }

  /** POST /v1/payouts/destinations — register a vendor bank destination. Creating one
   *  ALSO satisfies the `payout_destination` onboarding task (verified against live). */
  async createPayoutDestination(
    connectedAccountId: string,
    body: Record<string, unknown>,
    opts: { sandbox?: boolean } = {},
  ): Promise<BachsPayoutDestination> {
    return this.request<BachsPayoutDestination>('POST', '/v1/payouts/destinations', { connectedAccountId, body, sandbox: opts.sandbox });
  }

  /** POST /v1/payouts/withdrawals — move a vendor's share out to their bank. */
  async createWithdrawal(params: CreateWithdrawalParams): Promise<BachsWithdrawal> {
    return this.request<BachsWithdrawal>('POST', '/v1/payouts/withdrawals', {
      connectedAccountId: params.connectedAccountId,
      idempotencyKey:     params.idempotencyKey,
      body: {
        from_currency:        params.fromCurrency ?? 'NGN',
        to_currency:          params.toCurrency ?? 'NGN',
        amount:               toBachsAmount(params.amount),
        payment_method:       params.paymentMethod ?? 'BANK_TRANSFER',
        reference:            params.reference,
        email:                params.email,
        payout_destination_id: params.payoutDestinationId,
      },
    });
  }

  /** GET /v1/payouts/withdrawals/{id} — reconcile a withdrawal's terminal status. */
  async getWithdrawal(withdrawalId: string, connectedAccountId?: string): Promise<BachsWithdrawal> {
    return this.request<BachsWithdrawal>('GET', `/v1/payouts/withdrawals/${withdrawalId}`, { connectedAccountId });
  }

  // ── Webhook verification ────────────────────────────────────────────────────

  /**
   * Bachs webhook signature: `X-Bachs-Signature` is the HMAC-SHA256 hex digest of
   * `"{timestamp}.{raw_body}"`, with `X-Bachs-Timestamp` (unix seconds) and a
   * 5-minute tolerance. Identical scheme to ChainRails. Fails closed if the
   * secret is unset — no bypass, per the webhook order-of-operations convention.
   */
  verifyWebhookSignature(rawBody: string, signature: string, timestamp: string): boolean {
    if (!this.webhookSecret) {
      console.error('[security] BACHS_WEBHOOK_SECRET not set. Rejecting all webhooks.');
      return false;
    }
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

export const bachs = new BachsService();
