// Resolve an instrument reference from the request body. Callers may pass:
//   • { instrumentId: "..." }       — use an existing Instrument row
//   • { inline: { assetKey, ... } } — create a new Instrument row owned by
//                                     the merchant (merchantId)

import { prisma } from './prisma';

export interface InlineInstrument {
  assetKey:               string;
  kind:                   'bank_account' | 'crypto_wallet';
  label?:                 string;
  bankInstitution?:       string;
  bankAccountIdentifier?: string;
  bankAccountName?:       string;
  walletAddress?:         string;
}

export type InstrumentRef =
  | { instrumentId: string }
  | { inline: InlineInstrument };

export async function resolveInstrument(
  ref:        InstrumentRef,
  merchantId: string | null,
) {
  if ('instrumentId' in ref) {
    const inst = await prisma.instrument.findUnique({ where: { id: ref.instrumentId } });
    // Use a generic message for both missing and unauthorized to prevent enumeration
    if (!inst) throw new Error('instrument not found');
    // Merchant-owned instruments must belong to the requesting merchant
    if (inst.merchantId && merchantId && inst.merchantId !== merchantId) {
      throw new Error('instrument not found');
    }
    return inst;
  }

  const d = ref.inline;
  // walletAddress is optional for crypto_wallet: the 'external' deposit flow
  // does not know the sender's address at order-creation time.
  // Bank fields are optional for bank_account: Paystack DVA flows don't require
  // payer bank details. The executor enforces them only when Paycrest needs a refund account.

  return prisma.instrument.create({
    data: {
      merchantId,
      kind:                  d.kind,
      assetKey:              d.assetKey,
      label:                 d.label,
      bankInstitution:       d.bankInstitution,
      bankAccountIdentifier: d.bankAccountIdentifier,
      bankAccountName:       d.bankAccountName,
      walletAddress:         d.walletAddress,
    },
  });
}

export function bankFromInstrument(inst: {
  bankInstitution: string | null;
  bankAccountIdentifier: string | null;
  bankAccountName: string | null;
}) {
  if (!inst.bankInstitution || !inst.bankAccountIdentifier || !inst.bankAccountName) return null;
  return {
    institution:       inst.bankInstitution,
    accountIdentifier: inst.bankAccountIdentifier,
    accountName:       inst.bankAccountName,
  };
}
