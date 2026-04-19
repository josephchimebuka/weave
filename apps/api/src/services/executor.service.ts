// Creates provider resources for every step of an Order and persists the
// RouteStep rows. Runs at order creation time so the widget gets a fully
// resolved deposit target (QR address or bank details) immediately.
//
// Creation order is REVERSE of execution order: the final step's deposit
// address becomes the previous step's recipient, so we build the chain from
// the destination back to the user-facing entry point.

import { prisma } from '../lib/prisma';
import { paycrest } from './paycrest.service';
import { chainRails } from './chainrails.service';
import { parseAsset } from '../lib/assets';
import type { RoutePlan, RoutePlanStep } from './router.service';

export interface ExecutorInput {
  orderId:          string;
  plan:             RoutePlan;
  sourceAmount:     number;
  reference:        string;
  merchantMemo:     string;
  // Source-side context, set per source-asset kind:
  refundAddress?:   string;  // crypto source
  refundAccount?:   { institution: string; accountIdentifier: string; accountName: string }; // fiat source
  // Destination-side context, set per dest-asset kind:
  destBank?:        { institution: string; accountIdentifier: string; accountName: string }; // fiat dest
  destWallet?:      string;  // crypto dest
}

// Minimum unit for a user-facing step that needs UI.
export interface FirstStepAction {
  screen:         'collect_crypto' | 'collect_fiat';
  depositAddress?: string;                // crypto
  amount?:         number;                // crypto
  token?:          string;                // crypto
  chain?:          string;                // crypto
  bankDetails?: {                          // fiat
    institution:       string;
    accountIdentifier: string;
    accountName:       string;
    amountToTransfer:  string;
    currency:          string;
    reference:         string;
  };
  expiresAt?:      string;
}

export interface ExecuteResult {
  firstStep:   { sequence: number; provider: string; fromAsset: string; toAsset: string };
  nextAction:  FirstStepAction;
  destAmount:  number;
  steps:       Array<{ sequence: number; externalId: string | null; amountIn: number; amountOut: number }>;
  feeSummary:  { senderFeeUsd: number; appFeeUsd: number; bridgeFeeUsd: number };
}

const SENDER_FEE_BPS = Number(process.env.SENDER_FEE_BPS ?? 75);
const APP_FEE_BPS    = Number(process.env.APP_FEE_BPS    ?? 10);

// ── Provider dispatchers ────────────────────────────────────────────────────

interface StepExecution {
  externalId:     string | null;
  amountIn:       number;
  amountOut:      number;
  depositAddress: string | null;
  expiresAt:      string | null;
  feeUsd:         number;
  bankDetails?:   FirstStepAction['bankDetails'];
  note?:          string;
}

async function runPaycrestOfframp(
  step:         RoutePlanStep,
  amountIn:     number,
  ref:          string,
  memo:         string,
  refundAddress: string,
  destBank:     NonNullable<ExecutorInput['destBank']>,
): Promise<StepExecution> {
  const from = parseAsset(step.fromAsset);
  const to   = parseAsset(step.toAsset);
  if (from.kind !== 'crypto' || to.kind !== 'fiat') throw new Error('paycrest offramp: asset mismatch');

  const pc = await paycrest.createOfframpOrder({
    amount:        String(amountIn),
    amountIn:      'crypto',
    token:         from.token,
    network:       from.chain.toLowerCase(),
    refundAddress,
    fiatCurrency:  to.currency,
    recipient: {
      institution:       destBank.institution,
      accountIdentifier: destBank.accountIdentifier,
      accountName:       destBank.accountName,
      memo,
    },
    reference: ref,
  });

  const prov = pc.providerAccount as { receiveAddress: string; validUntil: string };
  const senderFeeUsd = amountIn * (SENDER_FEE_BPS / 10000);
  return {
    externalId:     pc.id,
    amountIn,
    amountOut:      Number(pc.amount) || amountIn,           // fiat amount settled
    depositAddress: prov.receiveAddress,
    expiresAt:      prov.validUntil,
    feeUsd:         senderFeeUsd,
  };
}

async function runPaycrestOnramp(
  step:          RoutePlanStep,
  amountIn:      number,
  ref:           string,
  refundAccount: NonNullable<ExecutorInput['refundAccount']>,
  destWallet:    string,
): Promise<StepExecution> {
  const from = parseAsset(step.fromAsset);
  const to   = parseAsset(step.toAsset);
  if (from.kind !== 'fiat' || to.kind !== 'crypto') throw new Error('paycrest onramp: asset mismatch');

  const pc = await paycrest.createOnrampOrder({
    amount:          String(amountIn),
    fiatCurrency:    from.currency,
    refundAccount,
    cryptoCurrency:  to.token,
    cryptoNetwork:   to.chain.toLowerCase(),
    cryptoRecipient: destWallet,
    reference:       ref,
  });

  const prov = pc.providerAccount as {
    institution: string; accountIdentifier: string; accountName: string;
    amountToTransfer: string; currency: string; validUntil: string;
  };
  const senderFeeUsd = amountIn * (SENDER_FEE_BPS / 10000);
  return {
    externalId:     pc.id,
    amountIn,
    amountOut:      Number(prov.amountToTransfer) || amountIn,
    depositAddress: null,
    expiresAt:      prov.validUntil,
    feeUsd:         senderFeeUsd,
    bankDetails: {
      institution:       prov.institution,
      accountIdentifier: prov.accountIdentifier,
      accountName:       prov.accountName,
      amountToTransfer:  prov.amountToTransfer,
      currency:          prov.currency,
      reference:         ref,
    },
  };
}

async function runChainRailsBridge(
  step:                RoutePlanStep,
  amountIn:            number,
  downstreamRecipient: string,
  refundAddress:       string,
  ref:                 string,
): Promise<StepExecution> {
  const from = parseAsset(step.fromAsset);
  const to   = parseAsset(step.toAsset);
  if (from.kind !== 'crypto' || to.kind !== 'crypto') throw new Error('chainrails: asset mismatch');

  const intent = await chainRails.createIntent({
    sourceChain:      from.chain,
    sourceToken:      from.token,
    amount:           amountIn,
    destinationChain: to.chain,
    destinationToken: to.token,
    recipient:        downstreamRecipient,
    refundAddress,
    metadata:         { orderId: ref },
  });

  return {
    externalId:     String(intent.id),
    amountIn,
    amountOut:      amountIn, // bridge fees accounted separately
    depositAddress: intent.intent_address,
    expiresAt:      intent.expires_at,
    feeUsd:         Number(intent.fees_in_usd) || 0,
  };
}

// ── Orchestrator ────────────────────────────────────────────────────────────

export async function executeOrder(input: ExecutorInput): Promise<ExecuteResult> {
  const { plan } = input;
  const last = plan.steps.length - 1;

  // Walk steps last → first, each step's depositAddress feeds the previous.
  const executions: StepExecution[] = new Array(plan.steps.length);
  let downstreamRecipient: string | null = null;

  for (let i = last; i >= 0; i--) {
    const step     = plan.steps[i];
    const amountIn = i === 0 ? input.sourceAmount : (executions[i + 1]?.amountOut ?? input.sourceAmount);

    let exec: StepExecution;

    if (step.provider === 'paycrest') {
      const from = parseAsset(step.fromAsset);
      if (from.kind === 'crypto') {
        if (!input.destBank) throw new Error('paycrest offramp requires destBank');
        exec = await runPaycrestOfframp(step, amountIn, input.reference, input.merchantMemo, input.refundAddress ?? '', input.destBank);
      } else {
        if (!input.refundAccount) throw new Error('paycrest onramp requires refundAccount');
        if (!input.destWallet)    throw new Error('paycrest onramp requires destWallet');
        exec = await runPaycrestOnramp(step, amountIn, input.reference, input.refundAccount, input.destWallet);
      }
    } else if (step.provider === 'chainrails') {
      if (!downstreamRecipient) throw new Error('chainrails step needs downstreamRecipient');
      exec = await runChainRailsBridge(step, amountIn, downstreamRecipient, input.refundAddress ?? '', input.reference);
    } else if (step.provider === 'direct') {
      const from = parseAsset(step.fromAsset);
      if (from.kind !== 'crypto') throw new Error('direct: only crypto supported');
      if (!input.destWallet)      throw new Error('direct requires destWallet');
      exec = {
        externalId:     null,
        amountIn,
        amountOut:      amountIn,
        depositAddress: input.destWallet,
        expiresAt:      new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        feeUsd:         0,
      };
    } else {
      throw new Error(`executor: unsupported provider ${step.provider}`);
    }

    executions[i] = exec;
    if (exec.depositAddress) downstreamRecipient = exec.depositAddress;
  }

  // Persist RouteStep rows (after all providers succeeded, so we don't leave
  // half-created orders pointing at nothing).
  await prisma.$transaction(
    plan.steps.map((step, i) =>
      prisma.routeStep.create({
        data: {
          orderId:     input.orderId,
          sequence:    i,
          provider:    step.provider,
          fromAsset:   step.fromAsset,
          toAsset:     step.toAsset,
          amountIn:    executions[i].amountIn,
          amountOut:   executions[i].amountOut,
          feeUsd:      executions[i].feeUsd,
          externalId:  executions[i].externalId,
          depositAddress: executions[i].depositAddress,
          status:      'awaiting_deposit',
          startedAt:   new Date(),
        },
      })
    )
  );

  // Build the nextAction from step 0 (the user-facing step).
  const firstExec = executions[0];
  const firstStep = plan.steps[0];
  const firstFrom = parseAsset(firstStep.fromAsset);
  const nextAction: FirstStepAction =
    firstFrom.kind === 'crypto'
      ? {
          screen:         'collect_crypto',
          depositAddress: firstExec.depositAddress ?? undefined,
          amount:         firstExec.amountIn,
          token:          firstFrom.token,
          chain:          firstFrom.chain,
          expiresAt:      firstExec.expiresAt ?? undefined,
        }
      : {
          screen:      'collect_fiat',
          bankDetails: firstExec.bankDetails,
          expiresAt:   firstExec.expiresAt ?? undefined,
        };

  // Fee rollup.
  const totalBridgeFee = executions.reduce((s, e, i) =>
    s + (plan.steps[i].provider === 'chainrails' ? e.feeUsd : 0), 0);
  const senderFeeUsd = input.sourceAmount * (SENDER_FEE_BPS / 10000);
  const appFeeUsd    = input.sourceAmount * (APP_FEE_BPS    / 10000);

  return {
    firstStep:  { sequence: 0, provider: firstStep.provider, fromAsset: firstStep.fromAsset, toAsset: firstStep.toAsset },
    nextAction,
    destAmount: executions[last].amountOut,
    steps: executions.map((e, i) => ({
      sequence:   i,
      externalId: e.externalId,
      amountIn:   e.amountIn,
      amountOut:  e.amountOut,
    })),
    feeSummary: { senderFeeUsd, appFeeUsd, bridgeFeeUsd: totalBridgeFee },
  };
}

// ── Webhook-driven step advance ─────────────────────────────────────────────
//
// Called by the BullMQ worker when a provider webhook arrives. Marks the
// RouteStep done and rolls the Order up when every step is complete.

export async function markStepDone(params: {
  provider:   string;
  externalId: string;
  amountOut?: number;
}) {
  const step = await prisma.routeStep.findFirst({
    where: { provider: params.provider, externalId: params.externalId },
    include: { order: { include: { steps: true } } },
  });
  if (!step) return null;

  await prisma.routeStep.update({
    where: { id: step.id },
    data: {
      status:      'done',
      completedAt: new Date(),
      ...(params.amountOut != null ? { amountOut: params.amountOut } : {}),
    },
  });

  // Refetch steps to get the latest statuses.
  const fresh = await prisma.routeStep.findMany({ where: { orderId: step.orderId }, orderBy: { sequence: 'asc' } });
  const allDone = fresh.every(s => s.id === step.id ? true : s.status === 'done');
  const anyFailed = fresh.some(s => s.status === 'failed');

  const nextOrderStatus = anyFailed ? 'failed' : allDone ? 'completed' : 'processing';
  await prisma.order.update({ where: { id: step.orderId }, data: { status: nextOrderStatus } });

  return { orderId: step.orderId, stepId: step.id, orderStatus: nextOrderStatus };
}

export async function markStepFailed(params: { provider: string; externalId: string; reason?: string }) {
  const step = await prisma.routeStep.findFirst({
    where: { provider: params.provider, externalId: params.externalId },
  });
  if (!step) return null;

  await prisma.$transaction([
    prisma.routeStep.update({
      where: { id: step.id },
      data:  { status: 'failed', completedAt: new Date() },
    }),
    prisma.order.update({
      where: { id: step.orderId },
      data:  { status: 'failed' },
    }),
  ]);

  return { orderId: step.orderId, stepId: step.id };
}
