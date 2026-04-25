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
import { nearIntents } from './nearintents.service';
import { sendMerchantPaymentNotification } from './email.service';
import { parseAsset } from '../lib/assets';
import type { RoutePlan, RoutePlanStep } from './router.service';

export interface ExecutorInput {
  orderId:          string;
  plan:             RoutePlan;
  sourceAmount:     number;
  // USD-equivalent of sourceAmount. Used as the amountIn for every step past
  // the first, since all intermediate legs are USDC on Base (≈ USD). Without
  // it, a SOL→USDC→NGN route would hand Paycrest the SOL figure (0.006)
  // instead of the USDC figure (~0.52) and Paycrest's rate validation fails.
  usdEquivalent:    number;
  destAmountFiat?:  number;
  appFeeBps?:       number;
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
  depositMemo?:    string;                // crypto — required for XRP/TON/XLM/NEAR when using NEAR Intents
  amount?:         number;                // crypto
  token?:          string;                // crypto
  chain?:          string;                // crypto
  bankDetails?: {                          // fiat
    institution:       string;
    accountIdentifier: string;
    accountName:       string;
    amountToTransfer:  string;
    currency:          string;
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

const SENDER_FEE_BPS      = Number(process.env.SENDER_FEE_BPS      ?? 75);
const APP_FEE_BPS         = Number(process.env.APP_FEE_BPS         ?? 10);
// Matches the same env the quote endpoint uses for its gross-up. NEAR will
// abort the swap if it can't deliver amountOut within this tolerance of the
// quoted figure, so the buffer the quote baked in must equal (or exceed) what
// we ask NEAR to honour here — otherwise the order can complete with less
// USDC than we priced for and the merchant underpays.
const SLIPPAGE_BUFFER_BPS = Number(process.env.SLIPPAGE_BUFFER_BPS ?? 200);

// Paycrest validates refundAddress as an EVM address because its refund leg
// sits on Base (USDC). The user's origin-chain refund address (e.g. Solana)
// is not acceptable there — we route Paycrest refunds to a system-owned Base
// wallet instead. The user's own refundAddress still flows to NEAR Intents,
// which needs it valid on the origin chain.
const WEAVE_EVM_REFUND_ADDRESS = process.env.WEAVE_EVM_REFUND_ADDRESS ?? '';

// ── Provider dispatchers ────────────────────────────────────────────────────

interface StepExecution {
  externalId:     string | null;
  amountIn:       number;
  amountOut:      number;
  depositAddress: string | null;
  depositMemo:    string | null;
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
  // pc.amount is the net crypto figure (post-senderFee); pc.rate is fiat/crypto.
  // Their product is the fiat amount the merchant receives.
  const fiatSettled = Number(pc.amount) * Number(pc.rate);
  return {
    externalId:     pc.id,
    amountIn,
    amountOut:      Number.isFinite(fiatSettled) && fiatSettled > 0 ? fiatSettled : amountIn,
    depositAddress: prov.receiveAddress,
    depositMemo:    null,
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
    depositMemo:    null,
    expiresAt:      prov.validUntil,
    feeUsd:         senderFeeUsd,
    bankDetails: {
      institution:       prov.institution,
      accountIdentifier: prov.accountIdentifier,
      accountName:       prov.accountName,
      amountToTransfer:  prov.amountToTransfer,
      currency:          prov.currency,
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
    depositMemo:    null,
    expiresAt:      intent.expires_at,
    feeUsd:         Number(intent.fees_in_usd) || 0,
  };
}

// NEAR Intents cross-chain swap. Each quote returns a deposit address (+ memo
// on some chains) where the funder sends the source token. NEAR routes, swaps
// and bridges in the background, then delivers the destination asset to our
// provided `recipient` (the next hop — Paycrest's receive address, or the
// merchant wallet for crypto payouts).
async function runNearIntentsSwap(
  step:                RoutePlanStep,
  amountIn:            number,
  downstreamRecipient: string,
  refundAddress:       string,
  ref:                 string,
  exactOutputTarget?:  number,
  appFeeBps?:          number,
): Promise<StepExecution> {
  const from = parseAsset(step.fromAsset);
  const to   = parseAsset(step.toAsset);
  if (from.kind !== 'crypto' || to.kind !== 'crypto') throw new Error('nearintents: asset mismatch');
  if (!downstreamRecipient) throw new Error('nearintents: missing downstream recipient');
  if (!refundAddress)       throw new Error('nearintents: missing refundTo');

  const WEAVE_EVM_REFUND_ADDRESS = process.env.WEAVE_EVM_REFUND_ADDRESS || refundAddress;

  const resp = await nearIntents.createQuote({
    sourceAssetKey: step.fromAsset,
    destAssetKey:   step.toAsset,
    amount:         exactOutputTarget ?? amountIn, // Target output amount or fallback to input amount
    swapType:       exactOutputTarget ? 'EXACT_OUTPUT' : 'EXACT_INPUT',
    refundTo:       refundAddress,
    recipient:      downstreamRecipient,
    slippageBps:    exactOutputTarget ? undefined : SLIPPAGE_BUFFER_BPS, // EXACT_OUTPUT leaves slippage risk to solver
    appFee:         appFeeBps && exactOutputTarget ? { recipient: WEAVE_EVM_REFUND_ADDRESS, fee: appFeeBps } : undefined,
    referral:       `weave-${ref}`.toLowerCase().slice(0, 32),
  });

  const amountOut = Number(resp.quote.amountOutFormatted) || amountIn;

  return {
    externalId:     resp.quote.depositAddress,
    amountIn:       exactOutputTarget ? Number(resp.quote.amountInFormatted) || amountIn : amountIn,
    amountOut,
    depositAddress: resp.quote.depositAddress,
    depositMemo:    resp.quote.depositMemo ?? null,
    expiresAt:      resp.quote.deadline,
    feeUsd:         Math.max(0, Number(resp.quote.amountInUsd) - Number(resp.quote.amountOutUsd)) || 0,
  };
}

// ── Orchestrator ────────────────────────────────────────────────────────────

export async function executeOrder(input: ExecutorInput): Promise<ExecuteResult> {
  const { plan } = input;
  const last = plan.steps.length - 1;

  // Walk steps last → first, each step's depositAddress feeds the previous.
  const executions: StepExecution[] = new Array(plan.steps.length);
  let downstreamRecipient: string | null = null;
  let exactTargetUsdc: number | null = null;

  for (let i = last; i >= 0; i--) {
    const step     = plan.steps[i];
    // Step 0 consumes the user's source-asset deposit. Downstream steps operate
    // on USDC-on-Base (the only intermediate we route through today), so the
    // USD-equivalent is the correct figure to hand them.
    const amountIn = i === 0 ? input.sourceAmount : input.usdEquivalent;
    let exec: StepExecution;

    if (step.provider === 'paycrest') {
      const from = parseAsset(step.fromAsset);
      if (from.kind === 'crypto') {
        if (!input.destBank) throw new Error('paycrest offramp requires destBank');
        if (!WEAVE_EVM_REFUND_ADDRESS) throw new Error('paycrest offramp requires WEAVE_EVM_REFUND_ADDRESS');
        
        // Exact Output anchoring: Since we computed exact usdc equivalent and stripped appFeeUsd to get target Paycrest USDC,
        // we previously relied on input.appFeeUsd. However, we now calculate the target dynamically.
        // Wait, input.usdEquivalent is the TOTAL user pays. We need Paycrest Target!
        // targetUsdc = usdEquivalent * (1 - appFeeBps / 10000)
        let paycrestAmountIn = amountIn;
        if (input.destAmountFiat && input.appFeeBps) {
          paycrestAmountIn = input.usdEquivalent * (1 - input.appFeeBps / 10000);
          exactTargetUsdc = paycrestAmountIn;
        }
        
        exec = await runPaycrestOfframp(step, paycrestAmountIn, input.reference, input.merchantMemo, WEAVE_EVM_REFUND_ADDRESS, input.destBank);
      } else {
        if (!input.refundAccount) throw new Error('paycrest onramp requires refundAccount');
        const recipient = downstreamRecipient || input.destWallet;
        if (!recipient)           throw new Error('paycrest onramp requires destWallet or downstreamRecipient');
        exec = await runPaycrestOnramp(step, amountIn, input.reference, input.refundAccount, recipient);
      }
    } else if (step.provider === 'chainrails') {
      if (!downstreamRecipient) throw new Error('chainrails step needs downstreamRecipient');
      exec = await runChainRailsBridge(step, amountIn, downstreamRecipient, input.refundAddress ?? '', input.reference);
    } else if (step.provider === 'nearintents') {
      // For the external-wallet flow the user may not have a refund address
      // until they pick one. Fall back to destWallet — if the swap fails, at
      // least the refund lands somewhere the merchant can recover from.
      const refundTo = input.refundAddress || input.destWallet || downstreamRecipient || '';
      exec = await runNearIntentsSwap(
        step, 
        amountIn, 
        downstreamRecipient ?? input.destWallet ?? '', 
        refundTo, 
        input.reference,
        exactTargetUsdc ?? undefined,
        input.appFeeBps
      );
    } else if (step.provider === 'direct') {
      const from = parseAsset(step.fromAsset);
      if (from.kind !== 'crypto') throw new Error('direct: only crypto supported');
      if (!input.destWallet)      throw new Error('direct requires destWallet');
      exec = {
        externalId:     null,
        amountIn,
        amountOut:      amountIn,
        depositAddress: input.destWallet,
        depositMemo:    null,
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
          depositMemo:    executions[i].depositMemo,
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
          depositMemo:    firstExec.depositMemo ?? undefined,
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

  // Fee rollup. Bridge-category fees come from either ChainRails (EVM bridge)
  // or NEAR Intents (any-chain swap+bridge). Paycrest fees flow through
  // senderFee/appFee so they're excluded here.
  const totalBridgeFee = executions.reduce((s, e, i) => {
    const p = plan.steps[i].provider;
    return s + ((p === 'chainrails' || p === 'nearintents') ? e.feeUsd : 0);
  }, 0);
  // Fee basis is the USD-equivalent of the order, not sourceAmount (which is
  // in source-asset units — e.g. SOL — and would produce meaningless figures).
  const senderFeeUsd = input.usdEquivalent * (SENDER_FEE_BPS / 10000);
  const appFeeUsd    = input.usdEquivalent * (APP_FEE_BPS    / 10000);

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

  // ── Notify Merchant ───────────────────────────────────────────────────────
  if (nextOrderStatus === 'completed') {
    const { webhookService } = await import('./webhook.service');
    // Fire and forget so we don't block the webhook worker
    Promise.all([
      sendMerchantPaymentNotification(step.orderId),
      webhookService.triggerPaymentSucceeded(step.orderId)
    ]).catch(err => {
        console.error(`[executor] failed to trigger merchant notifications:`, err.message);
    });
  }

  return { orderId: step.orderId, stepId: step.id, orderStatus: nextOrderStatus };
}

export async function markStepFailed(params: { provider: string; externalId: string; reason?: string; isRefund?: boolean }) {
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
      data:  { status: params.isRefund ? 'refunded' : 'failed' },
    }),
  ]);

  return { orderId: step.orderId, stepId: step.id };
}
