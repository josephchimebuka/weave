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
import { paystack } from './paystack.service';
import { sendMerchantPaymentNotification } from './email.service';
import { parseAsset } from '../lib/assets';
import type { RoutePlan, RoutePlanStep } from './router.service';

export interface ExecutorInput {
  orderId: string;
  merchantId: string;
  plan: RoutePlan;
  sourceAmount: number;
  // USD-equivalent of sourceAmount. Used as the amountIn for every step past
  // the first, since all intermediate legs are USDC on Base (≈ USD). Without
  // it, a SOL→USDC→NGN route would hand Paycrest the SOL figure (0.006)
  // instead of the USDC figure (~0.52) and Paycrest's rate validation fails.
  usdEquivalent: number;
  destAmountFiat?: number;
  appFeeBps?: number;
  reference: string;
  merchantMemo: string;
  // Source-side context, set per source-asset kind:
  refundAddress?: string;  // crypto source
  refundAccount?: { institution: string; accountIdentifier: string; accountName: string }; // fiat source
  // Destination-side context, set per dest-asset kind:
  destBank?: { institution: string; accountIdentifier: string; accountName: string }; // fiat dest
  destWallet?: string;  // crypto dest
}

export interface FirstStepAction {
  screen: 'collect_crypto' | 'collect_fiat' | 'paystack_popup';
  depositAddress?: string;                // crypto
  depositMemo?: string;                // crypto — required for XRP/TON/XLM/NEAR when using NEAR Intents
  amount?: number;                // crypto
  token?: string;                // crypto
  chain?: string;                // crypto
  bankDetails?: {                          // fiat
    institution: string;
    accountIdentifier: string;
    accountName: string;
    amountToTransfer: string;
    currency: string;
  };
  paystackPopupDetails?: {
    accessCode: string;
    publicKey: string;
    amount: number;       // gross NGN — shown to payer
    reference: string;
  };
  expiresAt?: string;
}

export interface ExecuteResult {
  firstStep: { sequence: number; provider: string; fromAsset: string; toAsset: string };
  nextAction: FirstStepAction;
  destAmount: number;
  steps: Array<{ sequence: number; externalId: string | null; amountIn: number; amountOut: number }>;
  feeSummary: { senderFeeUsd: number; appFeeUsd: number; bridgeFeeUsd: number };
}

const SENDER_FEE_BPS = Number(process.env.SENDER_FEE_BPS ?? 75);
const APP_FEE_BPS = Number(process.env.APP_FEE_BPS ?? 10);
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
  externalId: string | null;
  amountIn: number;
  amountOut: number;
  depositAddress: string | null;
  depositMemo: string | null;
  expiresAt: string | null;
  feeUsd: number;
  bankDetails?: FirstStepAction['bankDetails'];
  note?: string;
}

async function runPaycrestOfframp(
  step: RoutePlanStep,
  amountIn: number,
  ref: string,
  memo: string,
  refundAddress: string,
  destBank: NonNullable<ExecutorInput['destBank']>,
): Promise<StepExecution> {
  const from = parseAsset(step.fromAsset);
  const to = parseAsset(step.toAsset);
  if (from.kind !== 'crypto' || to.kind !== 'fiat') throw new Error('paycrest offramp: asset mismatch');

  const pc = await paycrest.createOfframpOrder({
    amount: String(amountIn),
    amountIn: 'crypto',
    token: from.token,
    network: from.chain.toLowerCase(),
    refundAddress,
    fiatCurrency: to.currency,
    recipient: {
      institution: destBank.institution,
      accountIdentifier: destBank.accountIdentifier,
      accountName: destBank.accountName,
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
    externalId: pc.id,
    amountIn,
    amountOut: Number.isFinite(fiatSettled) && fiatSettled > 0 ? fiatSettled : amountIn,
    depositAddress: prov.receiveAddress,
    depositMemo: null,
    expiresAt: prov.validUntil,
    feeUsd: senderFeeUsd,
  };
}

async function runPaycrestOnramp(
  step: RoutePlanStep,
  amountIn: number,
  ref: string,
  refundAccount: NonNullable<ExecutorInput['refundAccount']>,
  destWallet: string,
): Promise<StepExecution> {
  const from = parseAsset(step.fromAsset);
  const to = parseAsset(step.toAsset);
  if (from.kind !== 'fiat' || to.kind !== 'crypto') throw new Error('paycrest onramp: asset mismatch');

  const pc = await paycrest.createOnrampOrder({
    amount: String(amountIn),
    fiatCurrency: from.currency,
    refundAccount,
    cryptoCurrency: to.token,
    cryptoNetwork: to.chain.toLowerCase(),
    cryptoRecipient: destWallet,
    reference: ref,
  });

  const prov = pc.providerAccount as {
    institution: string; accountIdentifier: string; accountName: string;
    amountToTransfer: string; currency: string; validUntil: string;
  };
  const senderFeeUsd = amountIn * (SENDER_FEE_BPS / 10000);
  return {
    externalId: pc.id,
    amountIn,
    amountOut: Number(prov.amountToTransfer) || amountIn,
    depositAddress: null,
    depositMemo: null,
    expiresAt: prov.validUntil,
    feeUsd: senderFeeUsd,
    bankDetails: {
      institution: prov.institution,
      accountIdentifier: prov.accountIdentifier,
      accountName: prov.accountName,
      amountToTransfer: prov.amountToTransfer,
      currency: prov.currency,
    },
  };
}

async function runChainRailsBridge(
  step: RoutePlanStep,
  amountIn: number,
  downstreamRecipient: string,
  refundAddress: string,
  ref: string,
): Promise<StepExecution> {
  const from = parseAsset(step.fromAsset);
  const to = parseAsset(step.toAsset);
  if (from.kind !== 'crypto' || to.kind !== 'crypto') throw new Error('chainrails: asset mismatch');

  const intent = await chainRails.createIntent({
    sourceChain: from.chain,
    sourceToken: from.token,
    amount: amountIn,
    destinationChain: to.chain,
    destinationToken: to.token,
    recipient: downstreamRecipient,
    refundAddress,
    metadata: { orderId: ref },
  });

  return {
    externalId: String(intent.id),
    amountIn,
    amountOut: amountIn, // bridge fees accounted separately
    depositAddress: intent.intent_address,
    depositMemo: null,
    expiresAt: intent.expires_at,
    feeUsd: Number(intent.fees_in_usd) || 0,
  };
}

// NEAR Intents cross-chain swap. Each quote returns a deposit address (+ memo
// on some chains) where the funder sends the source token. NEAR routes, swaps
// and bridges in the background, then delivers the destination asset to our
// provided `recipient` (the next hop — Paycrest's receive address, or the
// merchant wallet for crypto payouts).
async function runNearIntentsSwap(
  step: RoutePlanStep,
  amountIn: number,
  downstreamRecipient: string,
  refundAddress: string,
  ref: string,
  exactOutputTarget?: number,
  appFeeBps?: number,
): Promise<StepExecution> {
  const from = parseAsset(step.fromAsset);
  const to = parseAsset(step.toAsset);
  if (from.kind !== 'crypto' || to.kind !== 'crypto') throw new Error('nearintents: asset mismatch');
  if (!downstreamRecipient) throw new Error('nearintents: missing downstream recipient');
  if (!refundAddress) throw new Error('nearintents: missing refundTo');

  const WEAVE_EVM_REFUND_ADDRESS = process.env.WEAVE_EVM_REFUND_ADDRESS || refundAddress;

  try {
    const resp = await nearIntents.createQuote({
      sourceAssetKey: step.fromAsset,
      destAssetKey: step.toAsset,
      amount: exactOutputTarget ?? amountIn, // Target output amount or fallback to input amount
      swapType: exactOutputTarget ? 'EXACT_OUTPUT' : 'EXACT_INPUT',
      refundTo: refundAddress,
      recipient: downstreamRecipient,
      slippageBps: exactOutputTarget ? undefined : SLIPPAGE_BUFFER_BPS, // EXACT_OUTPUT leaves slippage risk to solver
      appFee: appFeeBps && exactOutputTarget ? { recipient: WEAVE_EVM_REFUND_ADDRESS, fee: appFeeBps } : undefined,
      referral: `weave-${ref}`.toLowerCase().slice(0, 32),
    });

    const amountOut = Number(resp.quote.amountOutFormatted) || amountIn;

    return {
      externalId: resp.quote.depositAddress,
      amountIn: exactOutputTarget ? Number(resp.quote.amountInFormatted) || amountIn : amountIn,
      amountOut,
      depositAddress: resp.quote.depositAddress,
      depositMemo: resp.quote.depositMemo ?? null,
      expiresAt: resp.quote.deadline,
      feeUsd: Math.max(0, Number(resp.quote.amountInUsd) - Number(resp.quote.amountOutUsd)) || 0,
    };
  } catch (err: any) {
    if (err.message.includes('400') && err.message.toLowerCase().includes('failed to get quote')) {
      throw new Error('The amount is too low for a cross-chain payment. Please try a higher amount (approx. $1.00 USD minimum).');
    }
    throw err;
  }
}

// ── Orchestrator ────────────────────────────────────────────────────────────

export async function executeOrder(input: ExecutorInput): Promise<ExecuteResult> {
  const { plan, orderId } = input;

  // 1. Idempotency Check: If we already have recorded steps for this order,
  //    reconstruct the ExecuteResult from them instead of calling providers again.
  const existingSteps = await prisma.routeStep.findMany({
    where: { orderId },
    orderBy: { sequence: 'asc' }
  });

  if (existingSteps.length > 0) {
    const first = existingSteps[0];
    const last = existingSteps[existingSteps.length - 1];

    // Reconstruct nextAction from stored data
    const from = parseAsset(first.fromAsset);
    const nextAction: FirstStepAction = {
      screen: first.provider === 'paystack' ? 'paystack_popup' : (from.kind === 'crypto' ? 'collect_crypto' : 'collect_fiat'),
      depositAddress: first.depositAddress ?? undefined,
      depositMemo: first.depositMemo ?? undefined,
      amount: Number(first.amountIn || input.sourceAmount),
      token: from.kind === 'crypto' ? from.token : '',
      chain: from.kind === 'crypto' ? from.chain : '',
      bankDetails: (from.kind === 'fiat' && first.provider !== 'paystack') ? {
        institution: '',
        accountIdentifier: '',
        accountName: '',
        amountToTransfer: String(first.amountOut || 0),
        currency: from.currency,
      } : undefined,
      paystackPopupDetails: first.provider === 'paystack' ? (first as any).paystackPopupDetails : undefined,
      expiresAt: '',
    };

    const senderFeeUsd = input.usdEquivalent * (SENDER_FEE_BPS / 10000);
    const appFeeUsd = input.usdEquivalent * (APP_FEE_BPS / 10000);
    const bridgeFeeUsd = existingSteps.reduce((s, e, i) => {
      const p = existingSteps[i].provider;
      return s + ((p === 'chainrails' || p === 'nearintents') ? (e.feeUsd ?? 0) : 0);
    }, 0);

    return {
      firstStep: { sequence: 0, provider: first.provider, fromAsset: first.fromAsset, toAsset: first.toAsset },
      nextAction,
      destAmount: last.amountOut ?? 0,
      steps: existingSteps.map(e => ({
        sequence: e.sequence,
        externalId: e.externalId,
        amountIn: e.amountIn ?? 0,
        amountOut: e.amountOut ?? 0,
      })),
      feeSummary: { senderFeeUsd, appFeeUsd, bridgeFeeUsd },
    };
  }

  const last = plan.steps.length - 1;

  // Walk steps last → first, each step's depositAddress feeds the previous.
  const executions: StepExecution[] = new Array(plan.steps.length);
  let downstreamRecipient: string | null = null;
  let exactTargetUsdc: number | null = null;

  for (let i = last; i >= 0; i--) {
    const step = plan.steps[i];
    const amountIn = i === 0 ? input.sourceAmount : input.usdEquivalent;
    const stepRef = `${input.reference}-${i}`;
    let exec: StepExecution;

    if (step.provider === 'paystack') {
      // Guard: merchant must have a SYNCED subaccount so funds route to their bank
      const merchant = await prisma.merchant.findUniqueOrThrow({
        where: { id: input.merchantId },
      });
      if (merchant.paystackSubaccountStatus !== 'SYNCED') {
        throw new Error(
          `Merchant ${input.merchantId} Paystack subaccount not synced. Status: ${merchant.paystackSubaccountStatus}`
        );
      }

      // Gross-up: payer pays net + Paystack fee so the merchant receives exactly amountIn
      const rate = input.destAmountFiat ? (input.destAmountFiat / input.usdEquivalent) : 1500;
      const { chargeAmountNgn, feeUsd, weaveFeeNgn, paystackFeeNgn } = paystack.grossUp(amountIn, rate);

      const paystackRef = `${input.orderId}-${i}`;

      // Initialize a standard Paystack transaction with a Split.
      // Weave takes its app fee (main account), Merchant gets target + paystack fee (subaccount).
      // Since bearer_type is subaccount, Paystack takes its cut from the merchant's share.
      const txn = await paystack.initializeTransaction({
        email: 'admin@dewdroplabs.com',
        amountNgn: chargeAmountNgn,
        reference: paystackRef,
        split: {
          type: 'flat',
          bearer_type: 'subaccount',
          subaccounts: [
            {
              subaccount: merchant.paystackSubaccountCode!,
              share: Math.round((amountIn + paystackFeeNgn) * 100)
            }
          ]
        },
      });

      exec = {
        externalId: paystackRef,
        amountIn,
        amountOut: amountIn,
        depositAddress: null,
        depositMemo: null,
        expiresAt: null,
        feeUsd,
      };

      (exec as any).paystackPopupDetails = {
        accessCode: txn.access_code,
        publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
        amount: chargeAmountNgn,
        reference: paystackRef,
      };
    } else if (step.provider === 'paycrest') {
      if (!input.refundAccount) throw new Error('paycrest onramp requires refundAccount');
      const recipient = downstreamRecipient || input.destWallet;
      if (!recipient) throw new Error('paycrest onramp requires destWallet or downstreamRecipient');
      exec = await runPaycrestOnramp(step, amountIn, stepRef, input.refundAccount, recipient);
    } else if (step.provider === 'chainrails') {
      if (!downstreamRecipient) throw new Error('chainrails step needs downstreamRecipient');
      exec = await runChainRailsBridge(step, amountIn, downstreamRecipient, input.refundAddress ?? '', stepRef);
    } else if (step.provider === 'nearintents') {
      const from = parseAsset(step.fromAsset);
      const sourceIsEvm = from.kind === 'crypto' && ['BASE', 'ETHEREUM', 'ARBITRUM', 'OPTIMISM', 'POLYGON', 'BSC', 'AVALANCHE'].includes(from.chain.toUpperCase());
      const refundTo = input.refundAddress || (sourceIsEvm ? (input.destWallet || downstreamRecipient) : '');

      if (!refundTo) {
        throw new Error(`Refund address is required for ${from.kind === 'crypto' ? from.chain : from.currency} payments.`);
      }

      exec = await runNearIntentsSwap(
        step,
        amountIn,
        downstreamRecipient ?? input.destWallet ?? '',
        refundTo,
        stepRef,
        exactTargetUsdc ?? undefined,
        input.appFeeBps
      );
    } else if (step.provider === 'direct') {
      const from = parseAsset(step.fromAsset);
      if (from.kind !== 'crypto') throw new Error('direct: only crypto supported');
      if (!input.destWallet) throw new Error('direct requires destWallet');
      exec = {
        externalId: null,
        amountIn,
        amountOut: amountIn,
        depositAddress: input.destWallet,
        depositMemo: null,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        feeUsd: 0,
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
          orderId: input.orderId,
          sequence: i,
          provider: step.provider,
          fromAsset: step.fromAsset,
          toAsset: step.toAsset,
          amountIn: executions[i].amountIn,
          amountOut: executions[i].amountOut,
          feeUsd: executions[i].feeUsd,
          externalId: executions[i].externalId,
          depositAddress: executions[i].depositAddress,
          depositMemo: executions[i].depositMemo,
          paystackDvaBank: (executions[i] as any).paystackDetails?.bankName,
          paystackDvaAcct: (executions[i] as any).paystackDetails?.accountNumber,
          paystackDvaRef: (executions[i] as any).paystackDetails?.reference,
          dvaExpiresAt: (executions[i] as any).paystackDetails?.expiresAt,
          status: 'awaiting_deposit',
          startedAt: new Date(),
        } as any,
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
        screen: 'collect_crypto',
        depositAddress: firstExec.depositAddress ?? undefined,
        depositMemo: firstExec.depositMemo ?? undefined,
        amount: firstExec.amountIn,
        token: firstFrom.token,
        chain: firstFrom.chain,
        expiresAt: firstExec.expiresAt ?? undefined,
      }
      : firstStep.provider === 'paystack'
        ? {
          screen: 'paystack_popup',
          paystackPopupDetails: (firstExec as any).paystackPopupDetails,
          expiresAt: firstExec.expiresAt ?? undefined,
        }
        : {
          screen: 'collect_fiat',
          bankDetails: firstExec.bankDetails,
          expiresAt: firstExec.expiresAt ?? undefined,
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
  const appFeeUsd = input.usdEquivalent * (APP_FEE_BPS / 10000);

  return {
    firstStep: { sequence: 0, provider: firstStep.provider, fromAsset: firstStep.fromAsset, toAsset: firstStep.toAsset },
    nextAction,
    destAmount: executions[last].amountOut,
    steps: executions.map((e, i) => ({
      sequence: i,
      externalId: e.externalId,
      amountIn: e.amountIn,
      amountOut: e.amountOut,
    })),
    feeSummary: { senderFeeUsd, appFeeUsd, bridgeFeeUsd: totalBridgeFee },
  };
}

// ── Webhook-driven step advance ─────────────────────────────────────────────
//
// Called by the QStash worker when a provider webhook arrives. Marks the
// RouteStep done and rolls the Order up when every step is complete.

export async function markStepDone(params: {
  provider: string;
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
      status: 'done',
      completedAt: new Date(),
      ...(params.amountOut != null ? { amountOut: params.amountOut } : {}),
    },
  });

  // Refetch steps to get the latest statuses.
  const fresh = await prisma.routeStep.findMany({ where: { orderId: step.orderId }, orderBy: { sequence: 'asc' } });
  const allDone = fresh.every((s: any) => s.id === step.id ? true : s.status === 'done');
  const anyFailed = fresh.some((s: any) => s.status === 'failed');
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
      data: { status: 'failed', completedAt: new Date() },
    }),
    prisma.order.update({
      where: { id: step.orderId },
      data: { status: params.isRefund ? 'refunded' : 'failed' },
    }),
  ]);

  return { orderId: step.orderId, stepId: step.id };
}

// ── Synchronization Logic ───────────────────────────────────────────────────

/**
 * Manually fetches the current status of an order's steps from providers
 * and advances the state machine if it has moved.
 */
export async function syncOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { steps: true }
  });
  if (!order || ['completed', 'failed', 'refunded', 'expired'].includes(order.status)) return;

  const { classifyNearStatus } = await import('./nearintents.service');

  for (const step of order.steps) {
    if (step.status === 'done' || step.status === 'failed') continue;

    try {
      if (step.provider === 'nearintents' && step.depositAddress) {
        console.log(`[sync] checking nearintents step ${step.id} for address ${step.depositAddress}`);
        const status = await nearIntents.getStatus(step.depositAddress, step.depositMemo ?? undefined);
        console.log(`[sync] nearintents status for ${step.id}: ${status.status}`);
        const outcome = classifyNearStatus(status.status);
        if (outcome === 'done') {
          const amountOut = Number(status.swapDetails?.amountOutFormatted) || undefined;
          await markStepDone({ provider: 'nearintents', externalId: step.depositAddress, amountOut });
        } else if (outcome === 'failed' || outcome === 'refunded') {
          await markStepFailed({ provider: 'nearintents', externalId: step.depositAddress, isRefund: outcome === 'refunded' });
        }
      } else if (step.provider === 'paycrest' && step.externalId) {
        console.log(`[sync] checking paycrest step ${step.id} for order ${step.externalId}`);
        const pc = await paycrest.getOrder(step.externalId) as any;
        console.log(`[sync] paycrest status for ${step.id}: ${pc.status} (dir: ${pc.direction})`);

        const direction = pc.direction || '';
        const status = pc.status.toLowerCase();

        // Documentation Poll rules:
        // validated -> offramp complete
        // settled -> onramp or fully complete
        const isDone = (direction === 'offramp' && status === 'validated') ||
          (['settled', 'completed', 'paid', 'successful'].includes(status));

        const isFailed = ['expired', 'failed', 'cancelled'].includes(status);
        const isRefund = ['refunded', 'refunding'].includes(status);

        if (isDone) {
          await markStepDone({ provider: 'paycrest', externalId: step.externalId, amountOut: Number(pc.amount) });
        } else if (isFailed || isRefund) {
          await markStepFailed({ provider: 'paycrest', externalId: step.externalId, isRefund });
        }
      } else if (step.provider === 'paystack' && step.externalId) {
        console.log(`[sync] checking paystack step ${step.id} for ref ${step.externalId}`);
        const ps = await paystack.verifyTransaction(step.externalId);
        console.log(`[sync] paystack status for ${step.id}: ${ps.status}`);

        if (ps.status === 'success') {
          await markStepDone({ provider: 'paystack', externalId: step.externalId, amountOut: ps.amount / 100 });
        } else if (['failed', 'abandoned'].includes(ps.status)) {
          await markStepFailed({ provider: 'paystack', externalId: step.externalId });
        }
      }
    } catch (err: any) {
      console.warn(`[sync] failed to sync step ${step.id} (${step.provider}):`, err.message);
    }
  }
}

/**
 * Utility to sweep all "processing" orders from the last 24h and fix them.
 */
export async function syncAllOpenOrders() {
  const stuck = await prisma.order.findMany({
    where: {
      status: { in: ['processing', 'awaiting_deposit'] },
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    },
    select: { id: true }
  });

  for (const order of stuck) {
    try {
      await syncOrder(order.id);
    } catch (err: any) {
      console.error(`[sync] failed for order ${order.id}:`, err.message);
    }
  }
}
