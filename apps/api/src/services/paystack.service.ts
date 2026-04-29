import crypto from 'crypto';

const BASE = 'https://api.paystack.co';

const getHeaders = () => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error('PAYSTACK_SECRET_KEY is required but missing');
  return {
    'Authorization': `Bearer ${secret}`,
    'Content-Type': 'application/json',
  };
};

// Maps Paycrest SWIFT/BIC institution codes → Paystack bank slugs for NGN banks.
// Paycrest returns standard SWIFT codes from its /institutions endpoint; Paystack
// uses their own slugs in /bank. Keys verified against the SWIFT registry where possible.
const SWIFT_TO_PAYSTACK_SLUG: Record<string, string> = {
  // Tier-1
  GTBINGLA:  'guaranty-trust-bank',
  ABNGNGLA:  'access-bank',
  ZEIBNGLA:  'zenith-bank',
  ZENITHBA:  'zenith-bank',          // alternate BIC seen in some Paycrest responses
  UBANNGLA:  'united-bank-for-africa',
  FBNINGLA:  'first-bank-of-nigeria',
  // Tier-2
  FCMBNGLA:  'fcmb',
  FIDTNGLA:  'fidelity-bank',
  FIDBLAGE:  'fidelity-bank',        // alternate
  SBICNGLE:  'stanbic-ibtc-bank',
  SBICNGLA:  'stanbic-ibtc-bank',    // alternate
  UBNINGLA:  'union-bank-of-nigeria',
  NAMBLGOS:  'sterling-bank',
  STRLNGLA:  'sterling-bank',        // alternate
  WEMANGLA:  'wema-bank',
  WEMABNG:   'wema-bank',            // alternate
  KESTMYLA:  'keystone-bank',
  ECOCNGLA:  'ecobank-nigeria',
  // Others
  HBCLNGLA:  'heritage-bank',
  PROVNGLA:  'providus-bank',
  PLRISNGLA: 'polaris-bank',
  SKYYENGLA: 'polaris-bank',         // Polaris was formerly Skye Bank
  CITINGLA:  'citibank-nigeria',
  SUNDTNGLA: 'suntrust-bank',
  TAPLNGLA:  'taj-bank',
};

interface PaystackBank { name: string; code: string; slug: string; }

// Module-level bank list cache — fetched once per process, refreshed every 24 h.
let bankListCache: PaystackBank[] | null = null;
let bankListCachedAt = 0;
const BANK_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export class PaystackService {
  /**
   * General Transactions (Cards, USSD, etc.)
   * Used when bank transfer is not the primary choice.
   * Returns an authorization_url for the checkout widget.
   */
  async initializeTransaction(params: {
    email:              string;
    amountNgn:          number;
    reference:          string;
    subaccount?:        string;
    transactionCharge?: number; // flat kobo amount routed to Weave's main account
    callbackUrl?:       string;
    metadata?:          any;
  }): Promise<{ authorization_url: string; access_code: string; reference: string }> {
    const res = await fetch(`${BASE}/transaction/initialize`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        email:               params.email,
        amount:              Math.round(params.amountNgn * 100), // Paystack uses kobo
        reference:           params.reference,
        subaccount:          params.subaccount,
        transaction_charge:  params.transactionCharge,
        callback_url:        params.callbackUrl,
        metadata:            params.metadata,
        bearer:              'subaccount',
      }),
    });

    const body = await res.json();
    if (!res.ok) throw new Error(`Paystack Initialization Error: ${body.message || res.statusText}`);

    return body.data;
  }

  /**
   * Subaccounts
   * Used for "Pass-Through" settlement directly to the merchant bank account.
   */
  async createSubaccount(params: {
    businessName:  string;
    bankCode:      string;
    accountNumber: string;
  }): Promise<string> {
    const res = await fetch(`${BASE}/subaccount`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        business_name:     params.businessName,
        settlement_bank:   params.bankCode,
        account_number:    params.accountNumber,
        percentage_charge: 0, // Weave absorbs all fees; gross-up handles this on the charge side
      }),
    });

    const body = await res.json();
    if (!res.ok) throw new Error(`Paystack Subaccount Error: ${body.message || res.statusText}`);

    return body.data.subaccount_code;
  }

  async updateSubaccount(
    subaccountCode: string,
    params: { bankCode: string; accountNumber: string }
  ): Promise<void> {
    const res = await fetch(`${BASE}/subaccount/${subaccountCode}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({
        settlement_bank: params.bankCode,
        account_number:  params.accountNumber,
      }),
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(`Paystack Subaccount Update Error: ${body.message || res.statusText}`);
    }
  }

  /**
   * Webhook HMAC SHA512 Verification
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error('PAYSTACK_SECRET_KEY not set');

    const expected = crypto
      .createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  async verifyTransaction(reference: string): Promise<{ status: string; amount: number }> {
    const res = await fetch(`${BASE}/transaction/verify/${reference}`, {
      headers: getHeaders(),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`Paystack Verify Error: ${body.message || res.statusText}`);
    return {
      status: body.data.status, // 'success', 'failed', 'abandoned', 'ongoing'
      amount: body.data.amount, // in kobo
    };
  }

  /**
   * Fetches the list of NGN banks from Paystack and caches for 24 h.
   */
  async getBanks(): Promise<PaystackBank[]> {
    if (bankListCache && (Date.now() - bankListCachedAt) < BANK_CACHE_TTL_MS) {
      return bankListCache;
    }
    const res = await fetch(`${BASE}/bank?currency=NGN&type=nuban`, {
      headers: getHeaders(),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`Paystack /bank error: ${body.message || res.statusText}`);
    bankListCache = body.data as PaystackBank[];
    bankListCachedAt = Date.now();
    return bankListCache;
  }

  /**
   * Resolves a Paystack numeric bank code from whatever format we have stored:
   *   1. Already a Paystack numeric code   → direct match on `code`
   *   2. Paystack slug (e.g. "wema-bank")  → match on `slug`
   *   3. SWIFT/BIC code (e.g. "GTBINGLA")  → map via SWIFT_TO_PAYSTACK_SLUG then match on `slug`
   */
  async resolveBankCode(institutionCode: string): Promise<string> {
    const banks = await this.getBanks();

    const byCode = banks.find(b => b.code === institutionCode);
    if (byCode) return byCode.code;

    const bySlug = banks.find(b => b.slug === institutionCode.toLowerCase());
    if (bySlug) return bySlug.code;

    const slug = SWIFT_TO_PAYSTACK_SLUG[institutionCode.toUpperCase()];
    if (slug) {
      const mapped = banks.find(b => b.slug === slug);
      if (mapped) return mapped.code;
    }

    throw new Error(`Cannot resolve Paystack bank code for institution: "${institutionCode}"`);
  }

  /**
   * Fee Math (v5.0)
   * Solves: net = gross - fee = gross - (gross * 0.015 + 100)
   * → gross = (net + 100) / 0.985
   */
  grossUp(netAmountNgn: number, quoteRate: number): {
    chargeAmountNgn: number;
    feeUsd: number;
    weaveFeeNgn: number;
    paystackFeeNgn: number;
  } {
    // 1. Add Weave App Fee: 0.5% capped at 500 NGN
    let weaveFeeNgn = netAmountNgn * 0.005;
    if (weaveFeeNgn > 500) {
      weaveFeeNgn = 500;
    }

    // This is what needs to remain after Paystack takes its cut
    const netForPaystack = netAmountNgn + weaveFeeNgn;

    // 2. Add Paystack Fee (1.5% + 100 if >= 2500, capped at 2000)
    const g1 = netForPaystack / 0.985;
    let gross = g1;

    if (g1 >= 2500) {
      gross = (netForPaystack + 100) / 0.985;
    }

    let paystackFeeNgn = gross - netForPaystack;

    if (paystackFeeNgn > 2000) {
      paystackFeeNgn = 2000;
      gross = netForPaystack + paystackFeeNgn;
    }

    const chargeAmountNgn = Math.ceil(gross);

    return {
      chargeAmountNgn,
      weaveFeeNgn,
      paystackFeeNgn: chargeAmountNgn - netAmountNgn - weaveFeeNgn, // adjusted for rounding
      feeUsd: (paystackFeeNgn + weaveFeeNgn) / quoteRate,
    };
  }
}

export const paystack = new PaystackService();
