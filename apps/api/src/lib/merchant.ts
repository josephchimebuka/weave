// On startup, make sure every Client has a payout Instrument that matches
// the MERCHANT_PAYOUT_* env vars — this is how we migrate from the old
// env-driven merchant config to the Instrument-based model without losing
// the convenience of a single source of truth in .env.

import { prisma } from './prisma';
import { cryptoKey, fiatKey } from './assets';

export async function ensureMerchantDefaultInstruments() {
  const clients = await prisma.client.findMany();

  for (const client of clients) {
    if (client.defaultPayoutInstrumentId) continue; // already set

    // Pick whichever payout config is populated in env. Fiat wins if both
    // are set — merchants who care about crypto payouts will configure the
    // Instrument explicitly via the dashboard later.
    const fiatInst = buildFiatMerchantInstrument();
    const cryptoInst = buildCryptoMerchantInstrument();
    const toCreate = fiatInst ?? cryptoInst;
    if (!toCreate) continue;

    const inst = await prisma.instrument.create({
      data: { ...toCreate, ownerType: 'merchant', merchantId: client.id, verifiedAt: new Date() },
    });
    await prisma.client.update({
      where: { id: client.id },
      data:  { defaultPayoutInstrumentId: inst.id },
    });
    console.log(`[bootstrap] merchant ${client.name}: payout instrument ${inst.id} (${inst.assetKey})`);
  }
}

function buildFiatMerchantInstrument() {
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

function buildCryptoMerchantInstrument() {
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
