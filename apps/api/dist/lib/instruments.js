"use strict";
// Resolve an instrument reference from the request body. Callers may pass:
//   • { instrumentId: "..." }                          — use an existing row
//   • { inline: { assetKey, kind, ... } }              — create a new row
//
// For anonymous checkouts the inline path creates a user-owned instrument
// with userId=null; once the user logs in later we can adopt it.
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveInstrument = resolveInstrument;
exports.bankFromInstrument = bankFromInstrument;
const prisma_1 = require("./prisma");
async function resolveInstrument(ref, ownerType, ownerId) {
    if ('instrumentId' in ref) {
        const inst = await prisma_1.prisma.instrument.findUnique({ where: { id: ref.instrumentId } });
        if (!inst)
            throw new Error(`instrument ${ref.instrumentId} not found`);
        return inst;
    }
    const d = ref.inline;
    if (d.kind === 'bank_account' && (!d.bankInstitution || !d.bankAccountIdentifier || !d.bankAccountName)) {
        throw new Error('inline bank_account requires bankInstitution, bankAccountIdentifier, bankAccountName');
    }
    // walletAddress is optional for crypto_wallet: the 'external' flow doesn't
    // know the sender's address at order-creation time. Callers that need it
    // (e.g. ChainRails in the 'self' flow) validate at their own boundary.
    return prisma_1.prisma.instrument.create({
        data: {
            ownerType,
            userId: ownerType === 'user' ? ownerId : null,
            merchantId: ownerType === 'merchant' ? ownerId : null,
            kind: d.kind,
            assetKey: d.assetKey,
            label: d.label,
            bankInstitution: d.bankInstitution,
            bankAccountIdentifier: d.bankAccountIdentifier,
            bankAccountName: d.bankAccountName,
            walletAddress: d.walletAddress,
        },
    });
}
function bankFromInstrument(inst) {
    if (!inst.bankInstitution || !inst.bankAccountIdentifier || !inst.bankAccountName)
        return null;
    return {
        institution: inst.bankInstitution,
        accountIdentifier: inst.bankAccountIdentifier,
        accountName: inst.bankAccountName,
    };
}
