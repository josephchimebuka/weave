"use strict";
// On startup, ensure every Merchant has a default payout Instrument that matches
// the MERCHANT_PAYOUT_* env vars — this migrates from env-driven to DB-driven
// payout config without losing the convenience of a single source of truth.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureMerchantDefaultInstruments = ensureMerchantDefaultInstruments;
const prisma_1 = require("./prisma");
const assets_1 = require("./assets");
async function ensureMerchantDefaultInstruments() {
    const merchants = await prisma_1.prisma.merchant.findMany();
    for (const merchant of merchants) {
        if (merchant.defaultPayoutInstrumentId)
            continue; // already set
        // Prefer fiat payout when both env vars are set.
        const fiatInst = buildFiatInstrument();
        const cryptoInst = buildCryptoInstrument();
        const toCreate = fiatInst ?? cryptoInst;
        if (!toCreate)
            continue;
        const inst = await prisma_1.prisma.instrument.create({
            data: { ...toCreate, merchantId: merchant.id, verifiedAt: new Date() },
        });
        await prisma_1.prisma.merchant.update({
            where: { id: merchant.id },
            data: { defaultPayoutInstrumentId: inst.id },
        });
        console.log(`[bootstrap] merchant ${merchant.name}: payout instrument ${inst.id} (${inst.assetKey})`);
    }
}
function buildFiatInstrument() {
    const institution = process.env.MERCHANT_PAYOUT_INSTITUTION;
    const accountIdentifier = process.env.MERCHANT_PAYOUT_ACCOUNT_IDENTIFIER;
    const accountName = process.env.MERCHANT_PAYOUT_ACCOUNT_NAME;
    const currency = process.env.MERCHANT_PAYOUT_CURRENCY ?? 'NGN';
    if (!institution || !accountIdentifier || !accountName)
        return null;
    return {
        kind: 'bank_account',
        assetKey: (0, assets_1.fiatKey)(currency),
        label: 'Merchant payout (fiat)',
        bankInstitution: institution,
        bankAccountIdentifier: accountIdentifier,
        bankAccountName: accountName,
    };
}
function buildCryptoInstrument() {
    const address = process.env.MERCHANT_PAYOUT_WALLET_ADDRESS;
    const chain = process.env.MERCHANT_PAYOUT_WALLET_CHAIN ?? 'BASE';
    const token = process.env.MERCHANT_PAYOUT_WALLET_TOKEN ?? 'USDC';
    if (!address)
        return null;
    return {
        kind: 'crypto_wallet',
        assetKey: (0, assets_1.cryptoKey)(chain, token),
        label: 'Merchant payout (crypto)',
        walletAddress: address,
    };
}
