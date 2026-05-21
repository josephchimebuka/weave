import crypto from 'crypto';
import { INSTITUTIONS_BY_CUR } from '@weave/shared';

const BASE = 'https://api.paystack.co';

const getHeaders = () => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error('PAYSTACK_SECRET_KEY is required but missing');
  return {
    'Authorization': `Bearer ${secret}`,
    'Content-Type': 'application/json',
  };
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
        active:            true,
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
        active:          true,
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
    if (!res.ok || !Array.isArray(body.data)) {
      throw new Error(`Paystack /bank error: ${body.message || res.statusText}`);
    }
    bankListCache = body.data as PaystackBank[];
    bankListCachedAt = Date.now();
    return bankListCache;
  }

  /**
   * Resolves a Paystack numeric bank code from whatever format we have stored:
   *   1. Already a Paystack numeric code   → direct match on `code`
   *   2. Paystack slug (e.g. "wema-bank")  → match on `slug`
   *   3. Alias lookup (SWIFT or Paycrest)  → map via shared config
   */
  async resolveBankCode(institutionCode: string): Promise<string> {
    const banks = await this.getBanks();
    if (!banks) return '';

    // 1. Direct match on code
    const byCode = banks.find(b => b.code === institutionCode);
    if (byCode) return byCode.code;

    // 2. Direct match on slug
    const bySlug = banks.find(b => b.slug === institutionCode.toLowerCase());
    if (bySlug) return bySlug.code;

    // 3. Lookup via shared asset registry (handles SWIFT and Paycrest codes)
    const normalized = institutionCode.toUpperCase();
    const registry = INSTITUTIONS_BY_CUR.NGN || [];
    const inst = registry.find((i: any) => i.code === normalized);
    
    if (inst?.paystack) {
      const mapped = banks.find(b => b.slug === inst.paystack);
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

  /**
   * Resolves and verifies a bank account number against the given bank code.
   * Returns the account name as held by the bank.
   */
  async resolveAccount(accountNumber: string, bankCode: string): Promise<{ account_name: string; account_number: string }> {
    const res = await fetch(`${BASE}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
      headers: getHeaders(),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(`Paystack /bank/resolve error: ${body.message || res.statusText}`);
    return body.data;
  }

  /**
   * Settlements
   * Fetches the list of settlements for a specific subaccount.
   */
  async getSettlements(subaccountCode: string): Promise<any[]> {
    const res  = await fetch(`${BASE}/settlement?perPage=100`, { headers: getHeaders() });
    const body = await res.json();
    if (!res.ok) throw new Error(`Paystack /settlement error: ${body.message || res.statusText}`);
    // Paystack's ?subaccount= filter expects a numeric ID, not the code, so we filter
    // client-side: keep only settlements attributed to this merchant's subaccount.
    return (body.data as any[]).filter(
      (s) => s.subaccount?.subaccount_code === subaccountCode
    );
  }
}

export const paystack = new PaystackService();
