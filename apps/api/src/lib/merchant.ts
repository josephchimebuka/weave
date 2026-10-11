// On startup, ensure every Merchant has a default payout Instrument that matches
// the MERCHANT_PAYOUT_* env vars — this migrates from env-driven to DB-driven
// payout config without losing the convenience of a single source of truth.

import { prisma } from './prisma';
import { cryptoKey, fiatKey } from './assets';
import { paystack } from '../services/paystack.service';
import { qstash } from './qstash';
import { reportError } from './report';

// Backoff schedule (seconds) for background re-sync of a merchant's Paystack
// subaccount after the initial setup-time sync fails. attempt is 1-indexed; when
// it runs past the end of this list we stop retrying. ~1h15m of total coverage.
const PAYSTACK_SYNC_RETRY_DELAYS_S = [30, 120, 300, 900, 1800, 3600];

/**
 * Enqueue a delayed QStash job to re-attempt a merchant's Paystack subaccount
 * sync. Self-terminates once the merchant is SYNCED (checked in the job handler)
 * or after the backoff schedule is exhausted. Safe to call fire-and-forget.
 */
export async function schedulePaystackSyncRetry(params: { merchantId: string; attempt: number }): Promise<void> {
  const delay = PAYSTACK_SYNC_RETRY_DELAYS_S[params.attempt - 1];
  if (delay === undefined) {
    // Terminal: this merchant's payout subaccount never synced, so they can't
    // receive Paystack settlements. Page on it — it needs manual intervention.
    reportError(new Error('Paystack subaccount sync exhausted all retries'), {
      area: 'paystack.sync-exhausted',
      extra: { merchantId: params.merchantId, attempts: PAYSTACK_SYNC_RETRY_DELAYS_S.length },
    });
    return;
  }
  const apiBase = process.env.API_BASE;
  if (!apiBase) {
    console.warn('[paystack-sync] API_BASE not set — cannot schedule background retry');
    return;
  }
  try {
    await qstash.publishJSON({
      url:   `${apiBase}/jobs/retry-paystack-sync`,
      body:  params,
      delay,
    });
  } catch (err: any) {
    console.warn('[paystack-sync] failed to enqueue background retry:', err.message);
  }
}

/**
 * Ensures that a merchant's bank payout details are mirrored to Paystack
 * as a subaccount. This is critical for NGN settlements to bypass Weave
 * and hit the merchant physically.
 */
export async function syncPaystackSubaccount(merchantId: string): Promise<void> {
  const merchant = await prisma.merchant.findUniqueOrThrow({
    where:   { id: merchantId },
    include: { instruments: true },
  });

  // Find the current default payout instrument
  const instrument = merchant.instruments.find(i => i.id === merchant.defaultPayoutInstrumentId);
  
  if (!instrument || instrument.kind !== 'bank_account') {
    // If they switched to crypto payout, we don't sync to Paystack anymore.
    return;
  }

  try {
    let subaccountCode: string;

    const accountNumber = instrument.bankAccountIdentifier || '';
    // Resolve to Paystack's numeric bank code — tries direct, slug, and SWIFT lookup
    // against the live /bank list (cached 24 h).
    const bankCode = await paystack.resolveBankCode(instrument.bankInstitution || '');

    // Verify the account exists at the bank and use the bank-returned name as the
    // subaccount business_name so it matches the actual account holder.
    const resolved = await paystack.resolveAccount(accountNumber, bankCode);
    const businessName = resolved.account_name;

    if (merchant.paystackSubaccountCode) {
      try {
        await paystack.updateSubaccount(merchant.paystackSubaccountCode, { 
          businessName, 
          settlementBank: bankCode, 
          accountNumber 
        });
        subaccountCode = merchant.paystackSubaccountCode;
      } catch (updateErr: any) {
        // Stale code (e.g. test vs live key switch) — create a fresh one
        if (/not found/i.test(updateErr.message)) {
          subaccountCode = await paystack.createSubaccount({ 
            businessName, 
            settlementBank: bankCode, 
            accountNumber 
          });
        } else {
          throw updateErr;
        }
      }
    } else {
      subaccountCode = await paystack.createSubaccount({ 
        businessName, 
        settlementBank: bankCode, 
        accountNumber 
      });
    }

    await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        paystackSubaccountCode:     subaccountCode,
        paystackSubaccountStatus:   'SYNCED',
        paystackSubaccountSyncedAt: new Date(),
      },
    });
  } catch (err: any) {
    // Persist FAILED so the dashboard can surface it
    await prisma.merchant.update({
      where: { id: merchantId },
      data:  { paystackSubaccountStatus: 'FAILED' },
    });
    console.error(`[paystack-sync] failed for merchant ${merchantId}:`, err.message);
    throw err;
  }
}

export async function ensureMerchantDefaultInstruments() {
  const merchants = await prisma.merchant.findMany();

  for (const merchant of merchants) {
    if (merchant.defaultPayoutInstrumentId) continue; // already set

    // Prefer fiat payout when both env vars are set.
    const fiatInst   = buildFiatInstrument();
    const cryptoInst = buildCryptoInstrument();
    const toCreate   = fiatInst ?? cryptoInst;
    if (!toCreate) continue;

    const inst = await prisma.instrument.create({
      data: { ...toCreate, merchantId: merchant.id, verifiedAt: new Date() },
    });
    await prisma.merchant.update({
      where: { id: merchant.id },
      data:  { defaultPayoutInstrumentId: inst.id },
    });
    console.log(`[bootstrap] merchant ${merchant.name}: payout instrument ${inst.id} (${inst.assetKey})`);
  }
}

function buildFiatInstrument() {
  const institution       = process.env.MERCHANT_PAYOUT_INSTITUTION;
  const accountIdentifier = process.env.MERCHANT_PAYOUT_ACCOUNT_IDENTIFIER;
  const accountName       = process.env.MERCHANT_PAYOUT_ACCOUNT_NAME;
  const currency          = process.env.MERCHANT_PAYOUT_CURRENCY ?? 'NGN';
  if (!institution || !accountIdentifier || !accountName) return null;
  return {
    kind:                  'bank_account',
    assetKey:              fiatKey(currency),
    label:                 'Merchant payout (fiat)',
    bankInstitution:       institution,
    bankAccountIdentifier: accountIdentifier,
    bankAccountName:       accountName,
  };
}

function buildCryptoInstrument() {
  const address = process.env.MERCHANT_PAYOUT_WALLET_ADDRESS;
  const chain   = process.env.MERCHANT_PAYOUT_WALLET_CHAIN ?? 'BASE';
  const token   = process.env.MERCHANT_PAYOUT_WALLET_TOKEN ?? 'USDC';
  if (!address) return null;
  return {
    kind:          'crypto_wallet',
    assetKey:      cryptoKey(chain, token),
    label:         'Merchant payout (crypto)',
    walletAddress: address,
  };
}
