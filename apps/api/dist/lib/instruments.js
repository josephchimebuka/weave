"use strict";
// Resolve an instrument reference from the request body. Callers may pass:
//   • { instrumentId: "..." }       — use an existing Instrument row
//   • { inline: { assetKey, ... } } — create a new Instrument row owned by
//                                     the merchant (merchantId)
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveInstrument = resolveInstrument;
exports.bankFromInstrument = bankFromInstrument;
const prisma_1 = require("./prisma");
async function resolveInstrument(ref, merchantId) {
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
    // walletAddress is optional for crypto_wallet: the 'external' deposit flow
    // does not know the sender's address at order-creation time.
    return prisma_1.prisma.instrument.create({
        data: {
            merchantId,
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
