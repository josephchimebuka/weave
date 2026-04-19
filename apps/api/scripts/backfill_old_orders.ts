// Reads the 20 pre-migration Order rows from /tmp/weave_pre_v1.sql and inserts
// them into the new schema (Order + Instrument + RouteStep).
//
// Usage:
//   pnpm ts-node scripts/backfill_old_orders.ts            # dry-run (default)
//   pnpm ts-node scripts/backfill_old_orders.ts --apply    # writes to DB
//
// Mapping rules (see README at bottom of file for rationale):
//   offramp  BASE/USDC→NGN       → source=crypto_wallet (deposit addr), dest=bank(FBNINGLA/…)
//   offramp  OPTIMISM/ETH→NGN    → same, different assetKey
//   onramp   FIAT/NGN→ (assumed crypto:BASE:USDC from merchant env)

import 'dotenv/config';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const SNAPSHOT_PATH = '/tmp/weave_pre_v1.sql';
const APPLY         = process.argv.includes('--apply');

const MERCHANT_ID              = 'demo';
const MERCHANT_PAYOUT_WALLET   = process.env.MERCHANT_PAYOUT_WALLET_ADDRESS || '';
const MERCHANT_PAYOUT_CHAIN    = (process.env.MERCHANT_PAYOUT_WALLET_CHAIN || 'base').toUpperCase();

type OldOrder = {
  id:                 string;
  clientId:           string;
  type:               'onramp' | 'offramp';
  status:             string;
  sourceChain:        string;
  sourceToken:        string;
  sourceAmount:       number;
  fiatCurrency:       string;
  fiatAmount:         number | null;
  recipientBank:      string | null;
  recipientAccount:   string | null;
  recipientName:      string | null;
  depositAddress:     string | null;
  txHash:             string | null;
  chainrailsIntentId: string | null;
  paycrestOrderId:    string | null;
  chainrailsRampId:   string | null;
  senderFeeUsd:       number | null;
  appFeeUsd:          number | null;
  bridgeFeeUsd:       number | null;
  createdAt:          Date;
  updatedAt:          Date;
};

// ── Snapshot parser ─────────────────────────────────────────────────────────
// The COPY block uses tab-separated values with \N for NULL. We extract the
// lines between `COPY public."Order" ... FROM stdin;` and the terminating `\.`.

function parseSnapshot(): OldOrder[] {
  const sql   = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
  const start = sql.indexOf('COPY public."Order"');
  if (start < 0) throw new Error('Order COPY block not found');
  const fromStdinEnd = sql.indexOf('FROM stdin;', start) + 'FROM stdin;'.length;
  const end          = sql.indexOf('\n\\.', fromStdinEnd);
  const body         = sql.slice(fromStdinEnd, end).trim();

  const n   = (v: string) => (v === '\\N' ? null : v);
  const num = (v: string) => (v === '\\N' ? null : Number(v));

  return body.split('\n').map((line) => {
    const c = line.split('\t');
    return {
      id:                 c[0],
      clientId:           c[1],
      type:               c[2] as 'onramp' | 'offramp',
      status:             c[3],
      sourceChain:        c[4],
      sourceToken:        c[5],
      sourceAmount:       Number(c[6]),
      fiatCurrency:       c[7],
      fiatAmount:         num(c[8]),
      recipientBank:      n(c[9]),
      recipientAccount:   n(c[10]),
      recipientName:      n(c[11]),
      depositAddress:     n(c[12]),
      txHash:             n(c[13]),
      chainrailsIntentId: n(c[14]),
      paycrestOrderId:    n(c[15]),
      chainrailsRampId:   n(c[16]),
      senderFeeUsd:       num(c[17]),
      appFeeUsd:          num(c[18]),
      bridgeFeeUsd:       num(c[19]),
      createdAt:          new Date(c[20].replace(' ', 'T') + 'Z'),
      updatedAt:          new Date(c[21].replace(' ', 'T') + 'Z'),
    };
  });
}

// ── Mapping ─────────────────────────────────────────────────────────────────

type Plan = {
  order: OldOrder;
  sourceAssetKey: string;
  destAssetKey:   string;
  sourceInstrument: {
    kind:     'crypto_wallet' | 'bank_account';
    assetKey: string;
    label:    string;
    walletAddress?:         string | null;
    bankInstitution?:       string | null;
    bankAccountIdentifier?: string | null;
    bankAccountName?:       string | null;
  };
  destInstrument: {
    kind:     'crypto_wallet' | 'bank_account';
    assetKey: string;
    label:    string;
    walletAddress?:         string | null;
    bankInstitution?:       string | null;
    bankAccountIdentifier?: string | null;
    bankAccountName?:       string | null;
  };
  destAmount:  number | null;
  quoteRate:   number | null;
  routeStep: {
    provider:   'paycrest' | 'chainrails';
    fromAsset:  string;
    toAsset:    string;
    externalId: string | null;
  } | null;
};

function plan(o: OldOrder): Plan {
  if (o.type === 'offramp') {
    const sourceAssetKey = `crypto:${o.sourceChain}:${o.sourceToken}`;
    const destAssetKey   = `fiat:${o.fiatCurrency}`;
    return {
      order: o,
      sourceAssetKey,
      destAssetKey,
      sourceInstrument: {
        kind:          'crypto_wallet',
        assetKey:      sourceAssetKey,
        label:         `Legacy deposit ${o.id.slice(0, 8)}`,
        walletAddress: o.depositAddress,
      },
      destInstrument: {
        kind:                  'bank_account',
        assetKey:              destAssetKey,
        label:                 o.recipientName ?? 'Legacy bank',
        bankInstitution:       o.recipientBank,
        bankAccountIdentifier: o.recipientAccount,
        bankAccountName:       o.recipientName,
      },
      destAmount: o.fiatAmount,
      quoteRate:  o.fiatAmount != null ? o.fiatAmount / o.sourceAmount : null,
      routeStep: o.paycrestOrderId
        ? { provider: 'paycrest', fromAsset: sourceAssetKey, toAsset: destAssetKey, externalId: o.paycrestOrderId }
        : null,
    };
  }

  // onramp: sourceAsset is fiat, destAsset assumed crypto:BASE:USDC (merchant default)
  const sourceAssetKey = `fiat:${o.sourceToken}`;
  const destAssetKey   = `crypto:${MERCHANT_PAYOUT_CHAIN}:USDC`;
  return {
    order: o,
    sourceAssetKey,
    destAssetKey,
    sourceInstrument: {
      kind:     'bank_account',
      assetKey: sourceAssetKey,
      label:    'Legacy guest bank transfer',
    },
    destInstrument: {
      kind:          'crypto_wallet',
      assetKey:      destAssetKey,
      label:         'Merchant payout wallet',
      walletAddress: MERCHANT_PAYOUT_WALLET,
    },
    destAmount: null, // old schema didn't record delivered crypto amount
    quoteRate:  null,
    routeStep: o.chainrailsIntentId
      ? { provider: 'chainrails', fromAsset: sourceAssetKey, toAsset: destAssetKey, externalId: o.chainrailsIntentId }
      : null,
  };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const rows   = parseSnapshot();
  const plans  = rows.map(plan);

  console.log(`Parsed ${rows.length} old orders from snapshot.\n`);
  console.log('Mapping preview:');
  console.log('─'.repeat(100));
  for (const p of plans) {
    const o = p.order;
    console.log(
      `${o.id.slice(0, 8)} ${o.type.padEnd(7)} ${o.status.padEnd(17)} ` +
      `${p.sourceAssetKey.padEnd(22)} → ${p.destAssetKey.padEnd(18)} ` +
      `${o.sourceAmount} → ${p.destAmount ?? '?'}`,
    );
  }
  console.log('─'.repeat(100));

  if (!APPLY) {
    console.log('\nDRY RUN. Re-run with --apply to write to DB.');
    return;
  }

  const prisma = new PrismaClient();
  try {
    let inserted = 0;
    for (const p of plans) {
      const o = p.order;
      await prisma.$transaction(async (tx) => {
        const src = await tx.instrument.create({
          data: {
            ownerType:             'merchant',
            merchantId:            MERCHANT_ID,
            kind:                  p.sourceInstrument.kind,
            assetKey:              p.sourceInstrument.assetKey,
            label:                 p.sourceInstrument.label,
            walletAddress:         p.sourceInstrument.walletAddress         ?? null,
            bankInstitution:       p.sourceInstrument.bankInstitution       ?? null,
            bankAccountIdentifier: p.sourceInstrument.bankAccountIdentifier ?? null,
            bankAccountName:       p.sourceInstrument.bankAccountName       ?? null,
            createdAt:             o.createdAt,
          },
        });
        const dst = await tx.instrument.create({
          data: {
            ownerType:             'merchant',
            merchantId:            MERCHANT_ID,
            kind:                  p.destInstrument.kind,
            assetKey:              p.destInstrument.assetKey,
            label:                 p.destInstrument.label,
            walletAddress:         p.destInstrument.walletAddress         ?? null,
            bankInstitution:       p.destInstrument.bankInstitution       ?? null,
            bankAccountIdentifier: p.destInstrument.bankAccountIdentifier ?? null,
            bankAccountName:       p.destInstrument.bankAccountName       ?? null,
            createdAt:             o.createdAt,
          },
        });
        await tx.order.create({
          data: {
            id:                 o.id,
            clientId:           o.clientId,
            sourceInstrumentId: src.id,
            destInstrumentId:   dst.id,
            sourceAssetKey:     p.sourceAssetKey,
            destAssetKey:       p.destAssetKey,
            sourceAmount:       o.sourceAmount,
            destAmount:         p.destAmount,
            quoteRate:          p.quoteRate,
            status:             o.status,
            senderFeeUsd:       o.senderFeeUsd,
            appFeeUsd:          o.appFeeUsd,
            bridgeFeeUsd:       o.bridgeFeeUsd,
            createdAt:          o.createdAt,
            updatedAt:          o.updatedAt,
          },
        });
        if (p.routeStep) {
          await tx.routeStep.create({
            data: {
              orderId:    o.id,
              sequence:   0,
              provider:   p.routeStep.provider,
              fromAsset:  p.routeStep.fromAsset,
              toAsset:    p.routeStep.toAsset,
              externalId: p.routeStep.externalId,
              status:     o.status === 'completed' ? 'done' : o.status === 'refunded' ? 'failed' : 'pending',
              createdAt:  o.createdAt,
              updatedAt:  o.updatedAt,
            },
          });
        }
      });
      inserted++;
    }
    console.log(`\nInserted ${inserted} orders.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
