// Resolve an instrument reference from the request body. Callers may pass:
//   • { instrumentId: "..." }                          — use an existing row
//   • { inline: { assetKey, kind, ... } }              — create a new row
//
// For anonymous checkouts the inline path creates a user-owned instrument
// with userId=null; once the user logs in later we can adopt it.

import { prisma } from './prisma';

export interface InlineInstrument {
  assetKey:            string;
  kind:                'bank_account' | 'crypto_wallet';
  label?:              string;
  bankInstitution?:       string;
  bankAccountIdentifier?: string;
  bankAccountName?:       string;
  walletAddress?:         string;
}

export type InstrumentRef =
  | { instrumentId: string }
  | { inline: InlineInstrument };

export async function resolveInstrument(
  ref:       InstrumentRef,
  ownerType: 'user' | 'merchant',
  ownerId:   string | null,
) {
  if ('instrumentId' in ref) {
    const inst = await prisma.instrument.findUnique({ where: { id: ref.instrumentId } });
    if (!inst) throw new Error(`instrument ${ref.instrumentId} not found`);
    return inst;
  }

  const d = ref.inline;
  if (d.kind === 'bank_account' && (!d.bankInstitution || !d.bankAccountIdentifier || !d.bankAccountName)) {
    throw new Error('inline bank_account requires bankInstitution, bankAccountIdentifier, bankAccountName');
  }
  if (d.kind === 'crypto_wallet' && !d.walletAddress) {
    throw new Error('inline crypto_wallet requires walletAddress');
  }

  return prisma.instrument.create({
    data: {
      ownerType,
      userId:     ownerType === 'user'     ? ownerId : null,
      merchantId: ownerType === 'merchant' ? ownerId : null,
      kind:       d.kind,
      assetKey:   d.assetKey,
      label:      d.label,
      bankInstitution:       d.bankInstitution,
      bankAccountIdentifier: d.bankAccountIdentifier,
      bankAccountName:       d.bankAccountName,
      walletAddress:         d.walletAddress,
    },
  });
}

export function bankFromInstrument(inst: { bankInstitution: string | null; bankAccountIdentifier: string | null; bankAccountName: string | null }) {
  if (!inst.bankInstitution || !inst.bankAccountIdentifier || !inst.bankAccountName) return null;
  return {
    institution:       inst.bankInstitution,
    accountIdentifier: inst.bankAccountIdentifier,
    accountName:       inst.bankAccountName,
  };
}
