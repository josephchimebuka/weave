// SEP-24 hosted deposit/withdrawal — the anchor half of the Pollar corridor.
//
// Every SEP-24 transaction is a thin envelope over one Weave Order:
//   deposit     NGN bank transfer → Paycrest onramp → USDC(Base) → NEAR/treasury → USDC(Stellar) → user's account
//   withdrawal  user's USDC(Stellar) → NEAR/treasury → USDC(Base) → Paycrest offramp → NGN bank
// The Order is created from the hosted interactive page (same public-proxy +
// publishable-key path as /pay and /cashout) and linked back here; SEP-24
// `status` is then *derived* from the order's steps on every read, so the
// existing webhook/poll machinery drives the anchor for free.
// Spec: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md

import crypto from 'crypto';
import type { Order, RouteStep, StellarAnchorTransaction } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { STELLAR_SIMULATOR_LABEL, STELLAR_SIMULATOR_PROVIDER } from './stellar-simulator.service';
import {
  STELLAR_ANCHOR_MERCHANT_EMAIL,
  STELLAR_ANCHOR_SANDBOX,
  STELLAR_NETWORK,
  STELLAR_USDC_ISSUER,
  SEP24_NGN_MAX, SEP24_NGN_MIN, SEP24_USDC_MAX, SEP24_USDC_MIN,
} from '../lib/stellar-anchor-config';

export type Sep24Kind = 'deposit' | 'withdrawal';

// ── Anchor merchant ─────────────────────────────────────────────────────────
// Anchor-originated orders need an owning Merchant (API key, audit, dashboard).
// A dedicated system merchant is created on first use; it never logs in.

let anchorMerchantCache: { id: string; publishableKey: string; sandboxPublishableKey: string | null } | null = null;

export async function ensureStellarAnchorMerchant() {
  if (anchorMerchantCache) return anchorMerchantCache;
  let m = await prisma.merchant.findUnique({
    where: { email: STELLAR_ANCHOR_MERCHANT_EMAIL },
    select: { id: true, publishableKey: true, sandboxPublishableKey: true },
  });
  if (!m) {
    m = await prisma.merchant.create({
      data: {
        email:                 STELLAR_ANCHOR_MERCHANT_EMAIL,
        name:                  'Weave Stellar Anchor',
        passwordHash:          null,                    // system account — no dashboard login
        kycLevel:              'verified',              // uncapped; the anchor is Weave itself
        emailVerifiedAt:       new Date(),
        publishableKey:        'pk_live_' + crypto.randomBytes(24).toString('hex'),
        sandboxPublishableKey: 'pk_test_' + crypto.randomBytes(24).toString('hex'),
      },
      select: { id: true, publishableKey: true, sandboxPublishableKey: true },
    });
    console.log(`[stellar-anchor] created system merchant ${m.id}`);
  } else if (!m.sandboxPublishableKey) {
    m = await prisma.merchant.update({
      where: { id: m.id },
      data:  { sandboxPublishableKey: 'pk_test_' + crypto.randomBytes(24).toString('hex') },
      select: { id: true, publishableKey: true, sandboxPublishableKey: true },
    });
  }
  anchorMerchantCache = m;
  return m;
}

/** The publishable key the interactive page should use (sandbox vs live). */
export async function anchorPublishableKey(): Promise<string> {
  const m = await ensureStellarAnchorMerchant();
  return STELLAR_ANCHOR_SANDBOX ? (m.sandboxPublishableKey ?? m.publishableKey) : m.publishableKey;
}

// ── /info ───────────────────────────────────────────────────────────────────

export function sep24Info() {
  return {
    deposit: {
      USDC: {
        enabled: true,
        // Deposit amounts are expressed in the on-chain asset per spec; the
        // interactive page collects NGN and shows the USDC the user will receive.
        min_amount: SEP24_USDC_MIN,
        max_amount: SEP24_USDC_MAX,
        fee_fixed: 0,
        fee_percent: 0.85,          // SENDER_FEE_BPS + APP_FEE_BPS
      },
    },
    withdraw: {
      USDC: {
        enabled: true,
        min_amount: SEP24_USDC_MIN,
        max_amount: SEP24_USDC_MAX,
        fee_fixed: 0,
        fee_percent: 0.85,
      },
    },
    fee: { enabled: false, description: 'Fees are folded into the quoted amount on the interactive page.' },
    features: { account_creation: false, claimable_balances: false },
    // Non-standard hint for integrators: the fiat side of every corridor.
    corridors: [
      { country: 'NG', fiat: 'NGN', rail: 'bank_transfer', min_fiat: SEP24_NGN_MIN, max_fiat: SEP24_NGN_MAX },
    ],
  };
}

// ── Status projection ───────────────────────────────────────────────────────

type OrderWithSteps = Order & { steps: RouteStep[] };

const TERMINAL_ORDER = new Set(['completed', 'failed', 'refunded', 'expired']);

/**
 * Map a Weave order onto the SEP-24 status vocabulary. Deposits and
 * withdrawals share most of it; the difference is which hop is "the user's".
 */
export function deriveSep24Status(kind: Sep24Kind, order: OrderWithSteps | null): string {
  if (!order) return 'incomplete';
  switch (order.status) {
    case 'completed': return 'completed';
    case 'failed':    return 'error';
    case 'refunded':  return 'refunded';
    case 'expired':   return 'expired';
  }
  const steps = [...order.steps].sort((a, b) => a.sequence - b.sequence);
  const first = steps[0];
  if (order.status === 'awaiting_deposit' || first?.status === 'awaiting_deposit') {
    // Waiting on the user: bank transfer (deposit) or Stellar payment (withdrawal).
    return 'pending_user_transfer_start';
  }
  // Funds are in flight through our providers.
  const active = steps.find(s => s.status !== 'done');
  if (!active) return 'pending_anchor';
  if (kind === 'deposit') {
    // Last hop delivers USDC on Stellar → that's the Stellar network leg.
    return active.sequence === steps.length - 1 ? 'pending_stellar' : 'pending_anchor';
  }
  // withdrawal: the Paycrest fiat leg is "external" (bank rail); everything before is ours.
  return active.provider === 'paycrest' ? 'pending_external' : 'pending_anchor';
}

// ── Serialization ───────────────────────────────────────────────────────────

const num = (v: unknown) => (v == null ? null : Number(v));
const str = (v: unknown) => (v == null ? null : String(Number(v)));

/**
 * SEP-24 transaction object. `more_info_url` points at the hosted status page.
 */
export function serializeSep24Transaction(
  tx: StellarAnchorTransaction & { order: OrderWithSteps | null },
  moreInfoUrl: string,
) {
  const order = tx.order;
  const status = deriveSep24Status(tx.kind as Sep24Kind, order);
  const steps = order ? [...order.steps].sort((a, b) => a.sequence - b.sequence) : [];
  const first = steps[0];

  // Amounts: prefer the order's live figures over what the user typed.
  const amountIn  = order ? num(order.sourceAmount) : num(tx.amountIn);
  const amountOut = order ? (num(order.destAmount) ?? num(tx.amountOut)) : num(tx.amountOut);
  const fee = order
    ? (num(order.senderFeeUsd) ?? 0) + (num(order.appFeeUsd) ?? 0) + (num(order.bridgeFeeUsd) ?? 0)
    : num(tx.amountFee);

  const base: Record<string, unknown> = {
    id:                       tx.id,
    kind:                     tx.kind,
    status,
    status_eta:               status.startsWith('pending') && order ? estimateEtaSeconds(order) : null,
    more_info_url:            moreInfoUrl,
    amount_in:                str(amountIn),
    amount_in_asset:          tx.kind === 'deposit' ? 'iso4217:NGN' : stellarAssetId(),
    amount_out:               str(amountOut),
    amount_out_asset:         tx.kind === 'deposit' ? stellarAssetId() : 'iso4217:NGN',
    amount_fee:               fee == null ? null : String(fee),
    amount_fee_asset:         'iso4217:USD',
    started_at:               tx.startedAt.toISOString(),
    completed_at:             tx.completedAt?.toISOString() ?? (order?.status === 'completed' ? order.updatedAt.toISOString() : null),
    updated_at:               (order?.updatedAt ?? tx.updatedAt).toISOString(),
    stellar_transaction_id:   tx.stellarTransactionId,
    external_transaction_id:  tx.externalTransactionId ?? (steps.find(s => s.provider === 'paycrest')?.externalId ?? null),
    message:                  tx.message ?? (steps.some(s => s.provider === STELLAR_SIMULATOR_PROVIDER) ? STELLAR_SIMULATOR_LABEL : null),
    refunded:                 tx.refunded || order?.status === 'refunded',
    // Non-standard but useful to integrators: the underlying Weave order id.
    weave_order_id:           order?.id ?? null,
  };

  if (tx.kind === 'deposit') {
    // Where the user wires NGN (Paycrest onramp virtual account) — echoed for
    // wallets that render deposit instructions natively.
    const bank = (first?.depositBankDetails ?? null) as Record<string, string> | null;
    base.to = tx.account;
    if (bank) {
      base.deposit_instructions = {
        bank_name: bank.institution, account_number: bank.accountIdentifier,
        account_name: bank.accountName, amount: bank.amountToTransfer, currency: bank.currency,
      };
    }
  } else {
    base.from = tx.account;
    base.withdraw_anchor_account = tx.withdrawAnchorAccount ?? first?.depositAddress ?? null;
    base.withdraw_memo           = tx.withdrawMemo ?? first?.depositMemo ?? null;
    base.withdraw_memo_type      = tx.withdrawMemoType ?? (first?.depositMemo ? 'text' : null);
  }
  return base;
}

function estimateEtaSeconds(order: OrderWithSteps): number {
  const plan = order.routePlan as { totalExpectedSecs?: number } | null;
  return plan?.totalExpectedSecs ?? 180;
}

// SEP-38 asset identification format for the on-chain side.
function stellarAssetId(): string {
  return `stellar:USDC:${STELLAR_USDC_ISSUER[STELLAR_NETWORK]}`;
}

// ── Linking an order to a transaction ───────────────────────────────────────

/**
 * Bind a freshly created Weave order to an anchor transaction. Verifies the
 * order belongs to the anchor merchant and that its Stellar side is the
 * SEP-10 authenticated account, then snapshots the user-facing coordinates.
 */
export async function linkOrderToAnchorTx(tx: StellarAnchorTransaction, orderId: string) {
  const merchant = await ensureStellarAnchorMerchant();
  const order = await prisma.order.findFirst({
    where: { id: orderId, merchantId: merchant.id },
    include: { steps: { orderBy: { sequence: 'asc' } }, sourceInstrument: true, destInstrument: true },
  });
  if (!order) throw new Error('order not found for anchor merchant');
  if (tx.orderId && tx.orderId !== order.id) throw new Error('transaction already linked to a different order');

  const stellarSide = tx.kind === 'deposit' ? order.destInstrument : order.sourceInstrument;
  if (stellarSide.assetKey !== 'crypto:STELLAR:USDC') throw new Error('order is not a Stellar USDC corridor');
  if (tx.kind === 'deposit' && stellarSide.walletAddress !== tx.account) {
    throw new Error('deposit destination does not match the authenticated account');
  }

  const first = order.steps[0];
  return prisma.stellarAnchorTransaction.update({
    where: { id: tx.id },
    data: {
      orderId:   order.id,
      amountIn:  order.sourceAmount,
      amountOut: order.destAmount,
      ...(tx.kind === 'withdrawal' ? {
        withdrawAnchorAccount: first?.depositAddress ?? null,
        withdrawMemo:          first?.depositMemo ?? null,
        withdrawMemoType:      first?.depositMemo ? 'text' : null,
      } : {}),
      externalTransactionId: order.steps.find(s => s.provider === 'paycrest')?.externalId ?? null,
    },
    include: { order: { include: { steps: true } } },
  });
}

/** Refresh the persisted status/completedAt from the order (idempotent). */
export async function syncAnchorTxFromOrder(txId: string) {
  const tx = await prisma.stellarAnchorTransaction.findUnique({
    where: { id: txId },
    include: { order: { include: { steps: true } } },
  });
  if (!tx) return null;
  const status = deriveSep24Status(tx.kind as Sep24Kind, tx.order);
  if (status !== tx.status || (tx.order && TERMINAL_ORDER.has(tx.order.status) && !tx.completedAt)) {
    return prisma.stellarAnchorTransaction.update({
      where: { id: tx.id },
      data: {
        status,
        completedAt: status === 'completed' ? new Date() : tx.completedAt,
        amountOut:   tx.order?.destAmount ?? tx.amountOut,
        refunded:    tx.order?.status === 'refunded' ? true : tx.refunded,
      },
      include: { order: { include: { steps: true } } },
    });
  }
  return tx;
}
