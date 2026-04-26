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

/**
 * Paystack Service
 * Version 5.0 Implementation for Professional NGN Settlements
 */
export class PaystackService {
  /**
   * Customers are required before a DVA can be assigned.
   * Paystack identifies customers by email.
   */
  async createOrFetchCustomer(params: {
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<string> {
    const res = await fetch(`${BASE}/customer`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        email:      params.email,
        first_name: params.firstName,
        last_name:  params.lastName,
      }),
    });

    const body = await res.json();
    if (!res.ok) throw new Error(`Paystack Customer Error: ${body.message || res.statusText}`);

    return body.data.customer_code;
  }

  /**
   * General Transactions (Cards, USSD, etc.)
   * Used when bank transfer is not the primary choice.
   * Returns an authorization_url for the checkout widget.
   */
  async initializeTransaction(params: {
    email:         string;
    amountNgn:     number;
    reference:     string;
    subaccount?:   string;
    callbackUrl?:  string;
    metadata?:     any;
  }): Promise<{ authorization_url: string; access_code: string; reference: string }> {
    const res = await fetch(`${BASE}/transaction/initialize`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        email:         params.email,
        amount:        Math.round(params.amountNgn * 100), // Paystack uses kobo
        reference:     params.reference,
        subaccount:    params.subaccount,
        callback_url:  params.callbackUrl,
        metadata:      params.metadata,
        bearer:        'subaccount', // Merchant (subaccount) bears the Paystack processing fee
      }),
    });

    const body = await res.json();
    if (!res.ok) throw new Error(`Paystack Initialization Error: ${body.message || res.statusText}`);

    return body.data;
  }

  /**
   * Dedicated Virtual Accounts (DVA)
   * Assigns a bank account to a customer for a specific order.
   */
  async createDVA(params: {
    customerCode: string;
    preferredBank: 'wema-bank' | 'titan-paystack';
  }): Promise<{ bankName: string; accountNumber: string }> {
    const res = await fetch(`${BASE}/dedicated_account`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        customer:       params.customerCode,
        preferred_bank: params.preferredBank,
      }),
    });

    const body = await res.json();
    if (!res.ok) throw new Error(`Paystack DVA Error: ${body.message || res.statusText}`);

    const { bank, account_number } = body.data;
    return { bankName: bank.name, accountNumber: account_number };
  }

  async deactivateDVA(accountNumber: string): Promise<void> {
    const res = await fetch(`${BASE}/dedicated_account/${accountNumber}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(`Paystack Deactivation Error: ${body.message || res.statusText}`);
    }
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

  /**
   * Fee Math (v5.0)
   * Solves: net = gross - fee = gross - (gross * 0.015 + 100)
   * → gross = (net + 100) / 0.985
   */
  grossUp(netAmountNgn: number, quoteRate: number): {
    chargeAmountNgn: number;
    feeUsd: number;
  } {
    // 1.5% + N100 fee. Cap at N2,000.
    const uncappedGross = (netAmountNgn + 100) / 0.985;
    let feeNgn = uncappedGross - netAmountNgn;

    // Apply the N2,000 cap
    if (feeNgn > 2000) {
      feeNgn = 2000;
    }

    const chargeAmountNgn = netAmountNgn + feeNgn;

    return {
      chargeAmountNgn: Math.ceil(chargeAmountNgn),
      feeUsd: feeNgn / quoteRate,
    };
  }
}

export const paystack = new PaystackService();
