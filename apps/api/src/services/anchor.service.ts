// Thin client for the Anchor API (docs.getanchor.co). Anchor is a Nigerian
// banking-as-a-service: it provisions real bank accounts (via its licensed banking
// partners) and moves money over NIP. Weave's naira model with Anchor:
//   1. Each merchant is a BusinessCustomer with a KYB'd DepositAccount in THEIR OWN
//      name — so Dewdrop never holds the merchant's funds.
//   2. A customer pays by bank transfer into a per-order dynamic virtual NUBAN
//      (pay-with-transfer); Anchor fires `payin.received` → `payment.settled`.
//   3. Weave skims its fee via a ₦0 book transfer from the merchant's account to
//      Dewdrop's platform account. Payout to the merchant's external bank is a
//      separate, decoupled concern (funds accrue in the merchant's Anchor account).
//
// Auth is the `x-anchor-key` header (key infixed `_test_` for sandbox, `_prod_` for
// live); there is no token exchange. Money is ALWAYS an integer in the minor unit
// (kobo — ₦1 = 100), never a decimal string.
//
// NOTE: exact request/response shapes below follow the public docs and are marked
// where they need confirming against the sandbox on first integration.

import crypto from 'crypto';

// ── Amount helpers ──────────────────────────────────────────────────────────────

/** Human naira → Anchor minor unit (kobo) integer (₦75 000 → 7 500 000). */
export function toAnchorAmount(n: number | string): number {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (!Number.isFinite(num)) throw new Error(`invalid Anchor amount: ${n}`);
  return Math.round(num * 100);
}

/** Anchor minor unit (kobo) → human naira (7 500 000 → 75 000). */
export function fromAnchorAmount(kobo: number | string): number {
  const num = typeof kobo === 'string' ? parseInt(kobo, 10) : kobo;
  if (!Number.isFinite(num)) throw new Error(`invalid Anchor kobo amount: ${kobo}`);
  return num / 100;
}

// ── Types ───────────────────────────────────────────────────────────────────────

/** Anchor's JSON:API-style envelope: resources live under `data` with id/type/attributes. */
export interface AnchorResource<A = Record<string, unknown>> {
  id: string;
  type: string;
  attributes: A;
  relationships?: Record<string, { data?: { id: string; type: string } }>;
}

export type AnchorKybStatus =
  | 'unverified' | 'pending' | 'manualReview' | 'awaitingDocument' | 'approved' | 'rejected';

export interface AnchorOfficer {
  fullName: { firstName: string; lastName: string; middleName?: string };
  role?: string;              // "DIRECTOR" | "OWNER" | …
  title?: string;
  email?: string;
  phoneNumber?: string;
  nationality?: string;       // default "NG"
  bvn?: string;
  dateOfBirth?: string;       // YYYY-MM-DD
  address?: AnchorAddress;
  percentageOwned?: number;   // owners only
}

export interface AnchorAddress {
  addressLine_1: string;
  addressLine_2?: string;
  city: string;
  state: string;
  postalCode?: string;
  country?: string;           // default "NG"
}

export interface CreateBusinessCustomerParams {
  basicDetail: {
    businessName: string;
    businessBvn?: string;
    registrationType?: string;   // "PRIVATE_INCORPORATED" | …
    industry?: string;
    dateOfRegistration?: string; // YYYY-MM-DD
    description?: string;
    website?: string;
    country?: string;            // default "NG"
    businessEmail?: string;
    supportEmail?: string;
    disputeEmail?: string;
    phoneNumber?: string;
    mainAddress?: AnchorAddress;
    registeredAddress?: AnchorAddress;
    officers?: AnchorOfficer[];
  };
}

export interface CreateDynamicAccountParams {
  reference: string;          // our order id — idempotent, echoed on the payin webhook
  customerEmail: string;      // payer email (Anchor requires it)
  amount: number | string;    // human naira; converted to kobo
  expiryTimeSecs?: number;    // ≤ 3600 (1 h max); default 1800
  description?: string;
}

export interface CreateReservedAccountParams {
  depositAccountId: string;   // the merchant's DepositAccount the NUBAN settles into
  provider?: string;          // default "providus" (validated in sandbox)
}

export interface AnchorVirtualAccount {
  id: string;
  accountNumber: string;      // the 10-digit NUBAN to display to the payer
  bankName: string;           // e.g. "9 Payment Service Bank"
  accountName?: string;
  reference?: string;
  expiresAt?: string;
}

export interface AnchorPayin {
  id: string;
  amount: number;             // kobo
  currency: string;
  reference?: string;
  status: string;
  accountNumber?: string;     // virtual account credited
  sender?: { accountName?: string; accountNumber?: string; bankName?: string };
  createdAt?: string;
}

export interface CreateCounterPartyParams {
  bankCode: string;
  accountNumber: string;
  accountName?: string;       // omit + verifyName:true to have Anchor resolve it
  verifyName?: boolean;
}

export interface AnchorCounterParty {
  id: string;
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName?: string;
}

export interface CreateTransferParams {
  amount: number | string;    // human naira; converted to kobo
  currency?: string;          // default "NGN"
  reason: string;             // ≤ 100 chars
  reference: string;          // idempotency — alphanumeric lowercase, ≤ 100 chars
  accountId: string;          // source DepositAccount / SubAccount id
  counterPartyId: string;     // recipient (created via createCounterParty)
  sandbox?: boolean;
}

export interface CreateBookTransferParams {
  amount: number | string;    // human naira; converted to kobo
  currency?: string;          // default "NGN"
  reason: string;
  reference: string;          // idempotency
  sourceAccountId: string;    // merchant DepositAccount
  destinationAccountId: string; // Dewdrop platform DepositAccount
  sandbox?: boolean;
}

export interface AnchorTransfer {
  id: string;
  amount: number;             // kobo
  currency: string;
  status: string;             // "PENDING" | "COMPLETED" | "FAILED" | …
  reference?: string;
}

export interface AnchorBalance {
  availableBalance: number;   // kobo
  ledgerBalance: number;      // kobo
  currency: string;
}

// ── Service ─────────────────────────────────────────────────────────────────────

export class AnchorService {
  private webhookSecret: string;

  constructor() {
    this.webhookSecret = process.env.ANCHOR_WEBHOOK_SECRET || '';
    if (!process.env.ANCHOR_API_KEY) {
      console.warn('[Anchor] ANCHOR_API_KEY is not set. Live requests will fail with 401.');
    }
  }

  /** True when the sandbox key is configured, so a Weave sandbox order can provision
   *  REAL Anchor sandbox resources instead of the fully-mocked fallback. Mirrors
   *  bachs.hasTestKeys(). */
  hasTestKeys(): boolean {
    return !!process.env.ANCHOR_API_KEY_TEST;
  }

  // Sandbox uses a strictly separate base URL + `_test_` key so a sandbox order can
  // never touch live Anchor (and vice-versa). We never fall back from test to live:
  // a missing test key keeps the caller on the fully-mocked sandbox path.
  private creds(sandbox: boolean): { baseUrl: string; apiKey: string } {
    const baseUrl = sandbox
      ? (process.env.ANCHOR_SANDBOX_API_BASE || 'https://api.sandbox.getanchor.co')
      : (process.env.ANCHOR_API_BASE || 'https://api.getanchor.co');
    const apiKey = sandbox ? process.env.ANCHOR_API_KEY_TEST : process.env.ANCHOR_API_KEY;
    if (!apiKey) {
      throw new Error(
        sandbox
          ? 'ANCHOR_API_KEY_TEST is required for sandbox Anchor transactions'
          : 'ANCHOR_API_KEY is required but missing',
      );
    }
    return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey: apiKey.replace(/^["']|["']$/g, '').trim() };
  }

  private async request<T>(
    method: string,
    path: string,
    opts: { body?: unknown; sandbox?: boolean } = {},
  ): Promise<T> {
    const { baseUrl, apiKey } = this.creds(!!opts.sandbox);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-anchor-key': apiKey,
    };

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
      if (!res.ok) throw new Error(`Anchor ${res.status}: ${text}`);
      return (text ? JSON.parse(text) : {}) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ── Customer + KYB ──────────────────────────────────────────────────────────

  /** POST /api/v1/customers — create a BusinessCustomer (the merchant, in their own
   *  name). `attributes` must already carry Anchor's nesting: { address, basicDetail,
   *  contact, officers } (confirmed against sandbox). Returns unverified; KYB is
   *  triggered separately. The response nests business fields under `attributes.detail`
   *  and the KYB state under `attributes.verification.status`. */
  async createBusinessCustomer(attributes: Record<string, unknown>, opts: { sandbox?: boolean } = {}): Promise<AnchorResource> {
    const raw = await this.request<{ data: AnchorResource }>('POST', '/api/v1/customers', {
      sandbox: opts.sandbox,
      body: { data: { type: 'BusinessCustomer', attributes } },
    });
    return raw.data;
  }

  /** POST /api/v1/customers/{id}/verification/business — trigger KYB. Outcome arrives
   *  via `customer.identification.*` webhooks (approved/rejected/manualReview/awaitingDocument). */
  async triggerBusinessKYB(customerId: string, opts: { sandbox?: boolean } = {}): Promise<{ message?: string }> {
    return this.request('POST', `/api/v1/customers/${customerId}/verification/business`, { sandbox: opts.sandbox });
  }

  /** GET /api/v1/customers/{id} — read a customer + its verification status. */
  async getCustomer(customerId: string, opts: { sandbox?: boolean } = {}): Promise<AnchorResource> {
    const raw = await this.request<{ data: AnchorResource }>('GET', `/api/v1/customers/${customerId}`, { sandbox: opts.sandbox });
    return raw.data;
  }

  // ── KYB documents ─────────────────────────────────────────────────────────
  // After triggerBusinessKYB, Anchor requires a set of CAC documents (varies by
  // registration type/year, e.g. RC_NUMBER, TIN, CERTIFICATE_OF_INCORPORATION,
  // MEMORANDUM_OF_ASSOCIATION, CAC_STATUS_REPORT, PROOF_OF_ADDRESS). Fetch the list,
  // then upload each (TEXT → textData, FILE → fileData). `customer.identification.approved`
  // fires once all are reviewed. (Confirmed against sandbox.)

  /** GET /api/v1/documents/{customerId} — the KYB documents required for a customer. */
  async getDocuments(customerId: string, opts: { sandbox?: boolean } = {}): Promise<Array<{ id: string; documentType: string; format: string; submitted: boolean; verified: boolean; description: string }>> {
    const raw = await this.request<{ data: Array<AnchorResource<any>> }>('GET', `/api/v1/documents/${customerId}`, { sandbox: opts.sandbox });
    return (raw.data ?? []).map((d) => ({
      id: d.id,
      documentType: String(d.attributes?.documentType ?? ''),
      format: String(d.attributes?.format ?? ''),
      submitted: !!d.attributes?.submitted,
      verified: !!d.attributes?.verified,
      description: String(d.attributes?.description ?? ''),
    }));
  }

  // Raw multipart POST (the JSON `request()` helper can't do multipart/form-data).
  private async uploadRequest(customerId: string, documentId: string, form: FormData, sandbox?: boolean): Promise<any> {
    const { baseUrl, apiKey } = this.creds(!!sandbox);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(`${baseUrl}/api/v1/documents/upload-document/${customerId}/${documentId}`, {
        method: 'POST', headers: { 'x-anchor-key': apiKey }, body: form, signal: controller.signal,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`Anchor ${res.status}: ${text}`);
      return text ? JSON.parse(text) : {};
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** Upload a TEXT KYB document (RC_NUMBER / TIN) — the value goes in `textData`. */
  async uploadDocumentText(customerId: string, documentId: string, textData: string, opts: { sandbox?: boolean } = {}): Promise<void> {
    const form = new FormData();
    form.append('textData', textData);
    await this.uploadRequest(customerId, documentId, form, opts.sandbox);
  }

  /** Upload a FILE KYB document — bytes go in `fileData`. */
  async uploadDocumentFile(customerId: string, documentId: string, file: { buffer: Buffer; fileName: string; contentType?: string }, opts: { sandbox?: boolean } = {}): Promise<void> {
    const form = new FormData();
    form.append('fileData', new Blob([new Uint8Array(file.buffer)], { type: file.contentType || 'application/octet-stream' }), file.fileName);
    await this.uploadRequest(customerId, documentId, form, opts.sandbox);
  }

  // ── Deposit account ─────────────────────────────────────────────────────────

  /** POST /api/v1/accounts — create a DepositAccount for a (KYC-complete) customer.
   *  The NUBAN is generated ASYNC → arrives on the `accountNumber.created` webhook. */
  async createDepositAccount(customerId: string, opts: { sandbox?: boolean; productName?: string } = {}): Promise<AnchorResource> {
    const raw = await this.request<{ data: AnchorResource }>('POST', '/api/v1/accounts', {
      sandbox: opts.sandbox,
      body: {
        data: {
          type: 'DepositAccount',
          attributes: { productName: opts.productName ?? 'CURRENT' },
          relationships: { customer: { data: { id: customerId, type: 'BusinessCustomer' } } },
        },
      },
    });
    return raw.data;
  }

  /** GET /api/v1/accounts/{id} — read a deposit account (incl. its account number once generated). */
  async getAccount(accountId: string, opts: { sandbox?: boolean } = {}): Promise<AnchorResource> {
    const raw = await this.request<{ data: AnchorResource }>('GET', `/api/v1/accounts/${accountId}`, { sandbox: opts.sandbox });
    return raw.data;
  }

  /** GET /api/v1/accounts/balance/{id} — available vs ledger balance (kobo). Gates fee-skim/payout. */
  async getBalance(accountId: string, opts: { sandbox?: boolean } = {}): Promise<AnchorBalance> {
    const raw = await this.request<{ data: { attributes: { availableBalance: number; ledgerBalance: number; currency?: string } } }>(
      'GET', `/api/v1/accounts/balance/${accountId}`, { sandbox: opts.sandbox },
    );
    const a = raw.data.attributes;
    return { availableBalance: a.availableBalance, ledgerBalance: a.ledgerBalance, currency: a.currency ?? 'NGN' };
  }

  // ── Collection (virtual accounts) ─────────────────────────────────────────────

  /** POST /pay/pay-with-transfer — per-order DYNAMIC virtual account (single-use,
   *  ≤1h TTL). Inbound → `payin.received`, matched to our order by `reference`.
   *  NOTE: docs say pay-with-transfer may be production-only; if the sandbox rejects
   *  it, fall back to createReservedAccount. */
  async createDynamicAccount(params: CreateDynamicAccountParams, opts: { sandbox?: boolean } = {}): Promise<AnchorVirtualAccount> {
    const raw = await this.request<{ data: AnchorResource<any> }>('POST', '/pay/pay-with-transfer', {
      sandbox: opts.sandbox,
      body: {
        data: {
          type: 'PayWithTransfer',
          attributes: {
            reference:  params.reference,
            email:      params.customerEmail,
            amount:     toAnchorAmount(params.amount),
            expiryTime: params.expiryTimeSecs ?? 1800,
            ...(params.description ? { description: params.description } : {}),
          },
        },
      },
    });
    const a = raw.data.attributes || {};
    return {
      id:            raw.data.id,
      accountNumber: String(a.accountNumber ?? ''),
      bankName:      String(a.bankName ?? a.bank?.name ?? ''),
      accountName:   a.accountName ? String(a.accountName) : undefined,
      reference:     params.reference,
      expiresAt:     a.expiresAt ? String(a.expiresAt) : undefined,
    };
  }

  /** POST /api/v1/virtual-nubans — permanent (Reserved) virtual NUBAN that settles into
   *  the merchant's deposit account. The sandbox collection path (pay-with-transfer is
   *  production-only). Validated against sandbox: type VirtualNuban, provider "providus",
   *  permanent:true, settlementAccount → DepositAccount; response carries the 10-digit
   *  accountNumber + nested bank.name. */
  async createReservedAccount(params: CreateReservedAccountParams, opts: { sandbox?: boolean } = {}): Promise<AnchorVirtualAccount> {
    const raw = await this.request<{ data: AnchorResource<any> }>('POST', '/api/v1/virtual-nubans', {
      sandbox: opts.sandbox,
      body: {
        data: {
          type: 'VirtualNuban',
          attributes: { provider: params.provider ?? 'providus', permanent: true },
          relationships: { settlementAccount: { data: { id: params.depositAccountId, type: 'DepositAccount' } } },
        },
      },
    });
    const a = raw.data.attributes || {};
    return {
      id:            raw.data.id,
      accountNumber: String(a.accountNumber ?? ''),
      bankName:      String(a.bankName ?? a.bank?.name ?? ''),
      accountName:   a.accountName ? String(a.accountName) : undefined,
    };
  }

  /** GET /api/v1/payments/{id} — an inbound Payment into a Virtual NUBAN (the
   *  /api/v1/virtual-nubans collection flow). Carries the amount + Anchor's own
   *  paymentReference and references the credited VNUBAN by id (resolve its account
   *  number via getVirtualNuban). Fired via `payment.received` / `payment.settled`. */
  async getPayment(paymentId: string, opts: { sandbox?: boolean } = {}): Promise<{ amount: number; reference: string; virtualNubanId: string; settlementAccountId: string }> {
    const raw = await this.request<{ data: AnchorResource<any> }>('GET', `/api/v1/payments/${paymentId}`, { sandbox: opts.sandbox });
    const a = raw.data.attributes || {};
    const r = raw.data.relationships || {};
    return {
      amount: Number(a.amount ?? 0),
      reference: String(a.paymentReference ?? ''),
      virtualNubanId: String(r.virtualNuban?.data?.id ?? ''),
      settlementAccountId: String(r.settlementAccount?.data?.id ?? ''),
    };
  }

  /** GET /api/v1/payments — recent inbound Payments (VNUBAN collections), newest first.
   *  Used by the syncOrder poll-fallback to reconcile a collection when the webhook is
   *  missed (e.g. local dev with no public webhook URL). */
  async listPayments(opts: { sandbox?: boolean; size?: number } = {}): Promise<Array<{ id: string; amount: number; virtualNubanId: string; settlementAccountId: string; reference: string }>> {
    const raw = await this.request<{ data: Array<AnchorResource<any>> }>('GET', `/api/v1/payments?page=0&size=${opts.size ?? 50}`, { sandbox: opts.sandbox });
    return (raw.data ?? []).map((p) => {
      const a = p.attributes || {};
      const r = p.relationships || {};
      return {
        id: p.id,
        amount: Number(a.amount ?? 0),
        virtualNubanId: String(r.virtualNuban?.data?.id ?? ''),
        settlementAccountId: String(r.settlementAccount?.data?.id ?? ''),
        reference: String(a.paymentReference ?? ''),
      };
    });
  }

  /** GET /api/v1/virtual-nubans/{id} — resolve a Virtual NUBAN's 10-digit account number. */
  async getVirtualNuban(id: string, opts: { sandbox?: boolean } = {}): Promise<{ accountNumber: string; bankName: string }> {
    const raw = await this.request<{ data: AnchorResource<any> }>('GET', `/api/v1/virtual-nubans/${id}`, { sandbox: opts.sandbox });
    const a = raw.data.attributes || {};
    return { accountNumber: String(a.accountNumber ?? ''), bankName: String(a.bank?.name ?? a.bankName ?? '') };
  }

  /** POST /api/v1/virtual-nubans/{id}/deactivate — release a permanent (Reserved) virtual
   *  NUBAN once its order is terminal, so per-order reserved accounts don't accumulate and an
   *  old order's NUBAN can't keep accepting transfers. Reserved accounts are the sandbox /
   *  fallback path (dynamic pay-with-transfer accounts self-expire), so this is best-effort:
   *  the caller (anchor-nuban-cleanup sweep) tolerates failure and retries next sweep.
   *  NOTE: endpoint shape is doc-based — confirm against Anchor sandbox before relying on it. */
  async deactivateVirtualNuban(id: string, opts: { sandbox?: boolean } = {}): Promise<void> {
    await this.request('POST', `/api/v1/virtual-nubans/${id}/deactivate`, { sandbox: opts.sandbox });
  }

  /** GET /pay/payin/{id} — full inbound-payment detail (amount, sender, reference,
   *  credited account). The `payin.received` webhook is minimal — fetch this for context. */
  async getPayin(payinId: string, opts: { sandbox?: boolean } = {}): Promise<AnchorPayin> {
    const raw = await this.request<{ data: AnchorResource<any> }>('GET', `/pay/payin/${payinId}?include=Charge`, { sandbox: opts.sandbox });
    const a = raw.data.attributes || {};
    return {
      id:            raw.data.id,
      amount:        Number(a.amount ?? 0),
      currency:      String(a.currency ?? 'NGN'),
      reference:     a.reference ? String(a.reference) : undefined,
      status:        String(a.status ?? ''),
      accountNumber: a.accountNumber ? String(a.accountNumber) : undefined,
      sender:        a.sender ? {
        accountName:   a.sender.accountName,
        accountNumber: a.sender.accountNumber,
        bankName:      a.sender.bankName,
      } : undefined,
      createdAt:     a.createdAt ? String(a.createdAt) : undefined,
    };
  }

  // ── Payout (NIP transfer out) ────────────────────────────────────────────────

  /** GET /api/v1/banks — bank list + NIP codes for counterparty resolution. */
  async listBanks(opts: { sandbox?: boolean } = {}): Promise<Array<{ name: string; nipCode: string }>> {
    const raw = await this.request<{ data: Array<{ attributes: { name: string; nipCode: string } }> }>('GET', '/api/v1/banks', { sandbox: opts.sandbox });
    return (raw.data ?? []).map((b) => ({ name: b.attributes.name, nipCode: b.attributes.nipCode }));
  }

  /** GET /api/v1/payments/verify-account/{bankCode}/{accountNumber} — resolve the
   *  account name as registered at the recipient bank (name-verify before payout). */
  async verifyAccount(bankCode: string, accountNumber: string, opts: { sandbox?: boolean } = {}): Promise<{ accountName: string }> {
    const raw = await this.request<{ data: { attributes: { accountName: string } } }>(
      'GET', `/api/v1/payments/verify-account/${bankCode}/${accountNumber}`, { sandbox: opts.sandbox },
    );
    return { accountName: raw.data.attributes.accountName };
  }

  /** POST /api/v1/counterparties — register a payout recipient (verify + create in one
   *  request with verifyName:true). */
  async createCounterParty(params: CreateCounterPartyParams, opts: { sandbox?: boolean } = {}): Promise<AnchorCounterParty> {
    const raw = await this.request<{ data: AnchorResource<any> }>('POST', '/api/v1/counterparties', {
      sandbox: opts.sandbox,
      body: {
        data: {
          type: 'CounterParty',
          attributes: {
            bankCode:      params.bankCode,
            accountNumber: params.accountNumber,
            ...(params.accountName ? { accountName: params.accountName } : {}),
            verifyName:    params.verifyName ?? true,
          },
        },
      },
    });
    const a = raw.data.attributes || {};
    return {
      id:            raw.data.id,
      accountName:   String(a.accountName ?? ''),
      accountNumber: String(a.accountNumber ?? params.accountNumber),
      bankCode:      String(a.bankCode ?? params.bankCode),
      bankName:      a.bankName ? String(a.bankName) : undefined,
    };
  }

  /** POST /api/v1/transfers — outbound NIP transfer (payout to an external bank).
   *  `reference` is the idempotency key (alphanumeric lowercase). */
  async createTransfer(params: CreateTransferParams): Promise<AnchorTransfer> {
    const raw = await this.request<{ data: AnchorResource<any> }>('POST', '/api/v1/transfers', {
      sandbox: params.sandbox,
      body: {
        data: {
          type: 'NIPTransfer',
          attributes: {
            amount:    toAnchorAmount(params.amount),
            currency:  params.currency ?? 'NGN',
            reason:    params.reason.slice(0, 100),
            reference: params.reference,
          },
          relationships: {
            account:      { data: { id: params.accountId, type: 'DepositAccount' } },
            counterParty: { data: { id: params.counterPartyId, type: 'CounterParty' } },
          },
        },
      },
    });
    const a = raw.data.attributes || {};
    return { id: raw.data.id, amount: Number(a.amount ?? 0), currency: String(a.currency ?? 'NGN'), status: String(a.status ?? ''), reference: a.reference };
  }

  /** POST /api/v1/transfers — intra-Anchor BOOK transfer (₦0). Used to skim Weave's
   *  fee from the merchant's account to Dewdrop's platform account. */
  async createBookTransfer(params: CreateBookTransferParams): Promise<AnchorTransfer> {
    const raw = await this.request<{ data: AnchorResource<any> }>('POST', '/api/v1/transfers', {
      sandbox: params.sandbox,
      body: {
        data: {
          type: 'BookTransfer',
          attributes: {
            amount:    toAnchorAmount(params.amount),
            currency:  params.currency ?? 'NGN',
            reason:    params.reason.slice(0, 100),
            reference: params.reference,
          },
          relationships: {
            account:            { data: { id: params.sourceAccountId,      type: 'DepositAccount' } },
            destinationAccount: { data: { id: params.destinationAccountId, type: 'DepositAccount' } },
          },
        },
      },
    });
    const a = raw.data.attributes || {};
    return { id: raw.data.id, amount: Number(a.amount ?? 0), currency: String(a.currency ?? 'NGN'), status: String(a.status ?? ''), reference: a.reference };
  }

  /** GET /api/v1/transfers/verify/{id} — reconcile a transfer's terminal status. */
  async getTransfer(transferId: string, opts: { sandbox?: boolean } = {}): Promise<AnchorTransfer> {
    const raw = await this.request<{ data: AnchorResource<any> }>('GET', `/api/v1/transfers/verify/${transferId}`, { sandbox: opts.sandbox });
    const a = raw.data.attributes || {};
    return { id: raw.data.id, amount: Number(a.amount ?? 0), currency: String(a.currency ?? 'NGN'), status: String(a.status ?? ''), reference: a.reference };
  }

  // ── Webhook verification ──────────────────────────────────────────────────────

  /**
   * Anchor webhook signature: the `x-anchor-signature` header is
   * `Base64( HMAC_SHA1(rawBody, key=webhookToken).hexdigest() )` — i.e. the hex digest
   * is Base64-encoded (per Anchor's own reference implementation), and NO timestamp is
   * included. Constant-time compare; fails closed if the token is unset — no bypass,
   * per the webhook order-of-operations convention.
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) {
      console.error('[security] ANCHOR_WEBHOOK_SECRET not set. Rejecting all webhooks.');
      return false;
    }
    if (!signature) return false;

    const hexDigest = crypto.createHmac('sha1', this.webhookSecret).update(rawBody).digest('hex');
    const expected  = Buffer.from(hexDigest).toString('base64');
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }
}

export const anchor = new AnchorService();
