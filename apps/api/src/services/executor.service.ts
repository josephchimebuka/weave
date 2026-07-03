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
import { sandboxDispatch } from './sandbox-executor';
import { qstash } from '../lib/qstash';
import {
  getTreasuryPublicKey,
  isStellarEnabled,
  paymentMemoForOrder,
  scheduleStellarPoll,
} from './stellar.service';

export interface ExecutorInput {
  orderId: string;
  merchantId: string;
  sandboxMode?: boolean;
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

// ── DepositInstruction ──────────────────────────────────────────────────────
// Framework-agnostic equivalent of `nextAction` for direct-API consumers. The
// widget keeps using `nextAction` (with its UI-screen labels); server-to-server
// integrations should read this instead.

export type DepositInstruction =
  | {
      type: 'crypto_transfer';
      depositAddress: string;
      depositMemo: string | null;
      amount: number;
      token: string;
      chain: string;
      expiresAt: string | null;
    }
  | {
      type: 'bank_transfer';
      institution: string;
      accountIdentifier: string;
      accountName: string;
      amountToTransfer: string;
      currency: string;
      expiresAt: string | null;
    }
  | {
      type: 'paystack_popup';
      accessCode: string;
      publicKey: string;
      amount: number;
      reference: string;
    };

export function toDepositInstruction(action: FirstStepAction): DepositInstruction {
  if (action.screen === 'collect_crypto') {
    return {
      type: 'crypto_transfer',
      depositAddress: action.depositAddress ?? '',
      depositMemo: action.depositMemo ?? null,
      amount: action.amount ?? 0,
      token: action.token ?? '',
      chain: action.chain ?? '',
      expiresAt: action.expiresAt ?? null,
    };
  }
  if (action.screen === 'paystack_popup') {
    const d = action.paystackPopupDetails;
    return {
      type: 'paystack_popup',
      accessCode: d?.accessCode ?? '',
      publicKey: d?.publicKey ?? '',
      amount: d?.amount ?? 0,
      reference: d?.reference ?? '',
    };
  }
  // collect_fiat (bank transfer)
  const b = action.bankDetails;
  return {
    type: 'bank_transfer',
    institution: b?.institution ?? '',
    accountIdentifier: b?.accountIdentifier ?? '',
    accountName: b?.accountName ?? '',
    amountToTransfer: b?.amountToTransfer ?? '',
    currency: b?.currency ?? '',
    expiresAt: action.expiresAt ?? null,
  };
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

// ── NEAR Intents self-scheduling poll ───────────────────────────────────────
// Instead of a global every-2-min cron that always wakes the DB, each NEAR
// step schedules its own delayed QStash message. The message checks just that
// one step and re-enqueues only while the step is still pending, stopping as
// soon as it reaches a terminal state. The global /jobs/poll-near cron can
// then be reduced to a 30-min recovery sweep.

const NEAR_POLL_DELAY_S  = Math.round(Number(process.env.NEAR_POLL_INTERVAL_MS ?? 120_000) / 1000);
const NEAR_POLL_MAX_ATTEMPTS = 150; // ~5 hours at default 2-min interval

export async function scheduleNearPoll(params: {
  depositAddress: string;
  depositMemo:    string | null;
  attempt:        number;
}): Promise<void> {
  if (params.attempt > NEAR_POLL_MAX_ATTEMPTS) return;

  const apiBase = process.env.API_BASE;
  if (!apiBase) {
    console.warn('[executor] API_BASE not set — cannot schedule NEAR poll');
    return;
  }

  try {
    await qstash.publishJSON({
      url:   `${apiBase}/jobs/poll-near-step`,
      body:  params,
      delay: NEAR_POLL_DELAY_S,
    });
  } catch (err: any) {
    console.warn('[executor] failed to schedule NEAR poll:', err.message);
  }
}

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
  const senderFeeUsd = Number(pc.senderFee) || (amountIn * (SENDER_FEE_BPS / 10000));
  // Paycrest 'amount' is usually the gross amount in. We subtract the sender fee 
  // to get the net crypto being converted, then multiply by rate to get net fiat.
  const netCrypto = Number(pc.amount) - (Number(pc.senderFee) || 0);
  const fiatSettled = netCrypto * Number(pc.rate);

  return {
    externalId: pc.id,
    amountIn,
    amountOut: Number.isFinite(fiatSettled) && fiatSettled > 0 ? fiatSettled : (amountIn * Number(pc.rate)),
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
    amountOut: Number(pc.amount) * (1 - (SENDER_FEE_BPS + APP_FEE_BPS) / 10000),
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

  const totalRequired = Number(intent.total_amount_in_asset_token) / (10 ** intent.asset_token_decimals);

  return {
    externalId: String(intent.id),
    amountIn: totalRequired,
    amountOut: amountIn,
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

function reconstructResultFromSteps(input: ExecutorInput, steps: any[]): ExecuteResult {
  const first = steps[0];
  const last = steps[steps.length - 1];

  const from = parseAsset(first.fromAsset);
  const nextAction: FirstStepAction = from.kind === 'crypto'
    ? {
      screen: 'collect_crypto',
      depositAddress: first.depositAddress ?? undefined,
      depositMemo: first.depositMemo ?? undefined,
      amount: first.amountIn ?? input.sourceAmount,
      token: from.token,
      chain: from.chain,
      expiresAt: undefined,
    }
    : {
      screen: 'collect_fiat',
      bankDetails: {
        institution: '', // Minimal reconstruction
        accountIdentifier: '',
        accountName: '',
        amountToTransfer: String(first.amountIn ?? first.amountOut ?? 0),
        currency: from.currency,
      },
      expiresAt: undefined,
    };

  const senderFeeUsd = input.usdEquivalent * (SENDER_FEE_BPS / 10000);
  const appFeeUsd = input.usdEquivalent * (APP_FEE_BPS / 10000);
  const bridgeFeeUsd = steps.reduce((s, e) => {
    return s + ((e.provider === 'chainrails' || e.provider === 'nearintents') ? (e.feeUsd ?? 0) : 0);
  }, 0);

  // Stellar collects USDC into treasury; keep the fiat target as destAmount when
  // the order settles to fiat (see executeOrder for the same guard).
  const lastToFiat = parseAsset(last.toAsset).kind === 'fiat';
  const reconStellarFiat = last.provider === 'stellar' && lastToFiat;
  const reconDestAmount = reconStellarFiat && input.destAmountFiat != null
    ? input.destAmountFiat
    : (last.amountOut ?? 0);

  return {
    firstStep: { sequence: 0, provider: first.provider, fromAsset: first.fromAsset, toAsset: first.toAsset },
    nextAction,
    destAmount: reconDestAmount,
    steps: steps.map(e => ({
      sequence: e.sequence,
      externalId: e.externalId,
      amountIn: e.amountIn ?? 0,
      amountOut: e.amountOut ?? 0,
    })),
    feeSummary: { senderFeeUsd, appFeeUsd, bridgeFeeUsd },
  };
}

// ── Orchestrator ────────────────────────────────────────────────────────────

export async function executeOrder(input: ExecutorInput): Promise<ExecuteResult> {
  const { plan, orderId } = input;

  // 1. Idempotency Check
  const existingSteps = await prisma.routeStep.findMany({
    where: { orderId },
    orderBy: { sequence: 'asc' }
  });

  if (existingSteps.length > 0) {
    // If steps already exist AND have externalId, we are done.
    // If they are "pending", it means a race is happening.
    return reconstructResultFromSteps(input, existingSteps);
  }

  // 2. Pre-create steps to lock the order and prevent race conditions.
  try {
    await prisma.routeStep.createMany({
      data: plan.steps.map((s, i) => ({
        orderId: orderId,
        sequence: i,
        provider: s.provider,
        fromAsset: s.fromAsset,
        toAsset: s.toAsset,
        status: 'pending',
      })),
    });
  } catch (err: any) {
    // Unique constraint violation means another request just created them.
    const steps = await prisma.routeStep.findMany({
      where: { orderId },
      orderBy: { sequence: 'asc' }
    });
    return reconstructResultFromSteps(input, steps);
  }

  const last = plan.steps.length - 1;

  // Walk steps last → first, each step's depositAddress feeds the previous.
  const executions: StepExecution[] = new Array(plan.steps.length);
  let downstreamRecipient: string | null = null;
  let exactTargetUsdc: number | null = null;

  console.log(`[executor] executing order ${orderId}: sourceAmount=${input.sourceAmount}, usdEquivalent=${input.usdEquivalent}`);

  for (let i = last; i >= 0; i--) {
    const step = plan.steps[i];
    const amountIn = i === 0 ? input.sourceAmount : input.usdEquivalent;
    const stepRef = `${input.reference}-${i}`;
    let exec: StepExecution;

    console.log(`[executor] step ${i}: provider=${step.provider}, amountIn=${amountIn}`);

    if (input.sandboxMode) {
      exec = sandboxDispatch(step, amountIn, orderId, i) as any;
    } else if (step.provider === 'paystack') {
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
      const { chargeAmountNgn, feeUsd, weaveFeeNgn } = paystack.grossUp(amountIn, rate);

      const paystackRef = `${input.orderId}-${i}`;

      // transaction_charge routes Weave's flat fee (in kobo) to the main Paystack account.
      // The remainder goes to the merchant subaccount. bearer:'subaccount' means Paystack's
      // processing fee is deducted from the merchant's share, not added on top for the payer.
      const txn = await paystack.initializeTransaction({
        email: merchant.email,
        amountNgn: chargeAmountNgn,
        reference: paystackRef,
        subaccount: merchant.paystackSubaccountCode!,
        transactionCharge: Math.round(weaveFeeNgn * 100), // kobo
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
      const from = parseAsset(step.fromAsset);
      if (from.kind === 'crypto') {
        if (!input.destBank) throw new Error('paycrest offramp requires destBank');
        if (!WEAVE_EVM_REFUND_ADDRESS) throw new Error('paycrest offramp requires WEAVE_EVM_REFUND_ADDRESS');
        let paycrestAmountIn = amountIn;
        if (input.destAmountFiat && input.appFeeBps) {
          paycrestAmountIn = input.usdEquivalent * (1 - input.appFeeBps / 10000);
          exactTargetUsdc = paycrestAmountIn;
        }
        exec = await runPaycrestOfframp(step, paycrestAmountIn, stepRef, input.merchantMemo, WEAVE_EVM_REFUND_ADDRESS, input.destBank);
      } else {
        if (!input.refundAccount) throw new Error('paycrest onramp requires refundAccount');
        const recipient = downstreamRecipient || input.destWallet;
        if (!recipient) throw new Error('paycrest onramp requires destWallet or downstreamRecipient');
        exec = await runPaycrestOnramp(step, amountIn, stepRef, input.refundAccount, recipient);
      }
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
    } else if (step.provider === 'stellar') {
      if (!isStellarEnabled()) throw new Error('Stellar treasury is not configured (WEAVE_STELLAR_PUBLIC_KEY)');
      const memo = paymentMemoForOrder(input.orderId);
      const treasury = getTreasuryPublicKey();
      const feeUsd = amountIn * ((SENDER_FEE_BPS + APP_FEE_BPS) / 10000);
      exec = {
        externalId: memo,
        amountIn,
        amountOut: amountIn - feeUsd,
        depositAddress: treasury,
        depositMemo: memo,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        feeUsd,
      };
    } else if (step.provider === 'direct') {
      const from = parseAsset(step.fromAsset);
      if (from.kind !== 'crypto') throw new Error('direct: only crypto supported');
      if (!input.destWallet) throw new Error('direct requires destWallet');
      exec = {
        externalId: `direct:${input.orderId}`,
        amountIn,
        amountOut: amountIn * (1 - (SENDER_FEE_BPS + APP_FEE_BPS) / 10000),
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

  // 4. Populate the pre-created steps with execution results.
  await Promise.all(executions.map((e, i) =>
    prisma.routeStep.update({
      where: { orderId_sequence: { orderId, sequence: i } },
      data: {
        externalId: e.externalId,
        amountIn: e.amountIn,
        amountOut: e.amountOut,
        depositAddress: e.depositAddress,
        depositMemo: e.depositMemo,
        depositBankDetails: e.bankDetails ?? undefined,
        status: i === 0 ? 'awaiting_deposit' : 'pending',
        feeUsd: e.feeUsd,
        startedAt: new Date(),
      },
    })
  ));

  // Schedule a self-driving poll for every NEAR Intents step. Each message
  // re-enqueues itself until the step reaches a terminal state, so the global
  // cron only needs to run as an infrequent recovery sweep.
  if (!input.sandboxMode) {
    for (let i = 0; i < plan.steps.length; i++) {
      if (plan.steps[i].provider === 'nearintents' && executions[i]?.depositAddress) {
        await scheduleNearPoll({
          depositAddress: executions[i].depositAddress!,
          depositMemo:    executions[i].depositMemo ?? null,
          attempt:        1,
        });
      }
      if (plan.steps[i].provider === 'stellar' && executions[i]?.depositMemo) {
        await scheduleStellarPoll({
          orderId: input.orderId,
          memo: executions[i].depositMemo!,
          expectedAmount: executions[i].amountIn,
          attempt: 1,
        });
      }
    }
  }

  // Sandbox: auto-complete all steps instantly — no real money moves.
  if (input.sandboxMode) {
    for (let i = 0; i < plan.steps.length; i++) {
      const eId = executions[i].externalId;
      if (eId) {
        await markStepDone({ provider: plan.steps[i].provider, externalId: eId, amountOut: executions[i].amountOut });
      }
    }
  }

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

  const totalBridgeFee = executions.reduce((s, e, i) => {
    const p = plan.steps[i].provider;
    return s + ((p === 'chainrails' || p === 'nearintents') ? e.feeUsd : 0);
  }, 0);
  const senderFeeUsd = input.usdEquivalent * (SENDER_FEE_BPS / 10000);
  const appFeeUsd = input.usdEquivalent * (APP_FEE_BPS / 10000);

  // The Stellar rail collects USDC into the treasury, so its terminal amountOut
  // is denominated in USDC even when the order settles to fiat. Report the fiat
  // target (destAmountFiat) as destAmount so the receipt/email match the order's
  // dest currency instead of showing the raw USDC figure labelled as NGN.
  const lastToFiat = parseAsset(plan.steps[last].toAsset).kind === 'fiat';
  const stellarFiatCollection = plan.steps[last].provider === 'stellar' && lastToFiat;
  const destAmount = stellarFiatCollection && input.destAmountFiat != null
    ? input.destAmountFiat
    : executions[last].amountOut;

  return {
    firstStep: { sequence: 0, provider: firstStep.provider, fromAsset: firstStep.fromAsset, toAsset: firstStep.toAsset },
    nextAction,
    destAmount,
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
  // Memo-mode NEAR Intents chains (Stellar/XRP/TON/NEAR) share ONE deposit
  // address across every order, so `externalId` alone is ambiguous. Pass the
  // memo to pin the lookup to the exact step. Non-memo steps pass null.
  depositMemo?: string | null;
}) {
  const step = await prisma.routeStep.findFirst({
    where: {
      provider: params.provider,
      externalId: params.externalId,
      ...(params.depositMemo !== undefined ? { depositMemo: params.depositMemo } : {}),
    },
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

  // On completion, overwrite destAmount with the last step's actual confirmed output
  // so merchants see what was truly settled, not the initial quote estimate.
  // Exception: the Stellar rail collects USDC into the treasury, so its amountOut
  // is USDC even when the order settles to fiat — keep the fiat destAmount snapshot
  // set at creation rather than clobbering it with the USDC figure.
  const orderUpdate: Record<string, unknown> = { status: nextOrderStatus };
  if (nextOrderStatus === 'completed') {
    const lastStep = fresh[fresh.length - 1];
    const destIsFiat = step.order.destAssetKey.startsWith('fiat:');
    const stellarFiatCollection = lastStep?.provider === 'stellar' && destIsFiat;
    if (lastStep?.amountOut != null && !stellarFiatCollection) {
      orderUpdate.destAmount = lastStep.amountOut;
    }
  }

  // Use updateMany with a terminal-state guard so this function is idempotent.
  // If two concurrent callers (e.g. an inbound webhook + the GET /orders poll
  // fallback) both race to complete the same step, only the one that actually
  // transitions the order from a non-terminal state fires notifications.
  // The loser gets count=0 and skips the email/webhook entirely.
  const TERMINAL_STATUSES = ['completed', 'failed', 'refunded', 'expired'];
  const { count: transitioned } = await prisma.order.updateMany({
    where: { id: step.orderId, status: { notIn: TERMINAL_STATUSES } },
    data: orderUpdate,
  });

  // ── Roll up linked CheckoutSession ────────────────────────────────────────
  // Mirror the order's terminal state onto any hosted checkout session bound to
  // this order. The hosted page polls/observes the order, so this keeps session
  // state in lockstep without a second round-trip from the client.
  if (transitioned > 0 && (nextOrderStatus === 'completed' || nextOrderStatus === 'failed')) {
    try {
      await prisma.checkoutSession.updateMany({
        where: { orderId: step.orderId, status: { in: ['open', 'processing'] } },
        data: { status: nextOrderStatus === 'completed' ? 'complete' : 'expired' },
      });
    } catch (err: any) {
      console.warn(`[executor] failed to sync checkout session for order ${step.orderId}:`, err.message);
    }
  }

  // ── Notify Merchant ───────────────────────────────────────────────────────
  if (transitioned > 0 && nextOrderStatus === 'completed' && !step.order.sandboxMode) {
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

export async function markStepProgress(params: { provider: string; externalId: string; depositMemo?: string | null }) {
  const step = await prisma.routeStep.findFirst({
    where: {
      provider: params.provider,
      externalId: params.externalId,
      ...(params.depositMemo !== undefined ? { depositMemo: params.depositMemo } : {}),
    },
  });
  if (!step) return null;

  await prisma.$transaction([
    prisma.routeStep.update({
      where: { id: step.id },
      data: { status: 'in_flight' },
    }),
    prisma.order.update({
      where: { id: step.orderId },
      data: { status: 'processing' },
    }),
  ]);

  return { orderId: step.orderId, stepId: step.id };
}

export async function markStepFailed(params: { provider: string; externalId: string; reason?: string; isRefund?: boolean; depositMemo?: string | null }) {
  const step = await prisma.routeStep.findFirst({
    where: {
      provider: params.provider,
      externalId: params.externalId,
      ...(params.depositMemo !== undefined ? { depositMemo: params.depositMemo } : {}),
    },
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
export async function syncOrder(
  orderId: string,
): Promise<{ paycrestStatus: string | null; nearStatus: string | null }> {
  // Raw provider statuses gathered during the sweep. The widget polls
  // GET /orders/:id and keys intermediate UI on these — e.g. NEAR
  // 'INCOMPLETE_DEPOSIT' drives the underpayment warning, and Paycrest
  // 'fulfilled' advances the processing stage. Returning them here is what
  // makes that contract real (previously they were always null).
  const result: { paycrestStatus: string | null; nearStatus: string | null } = {
    paycrestStatus: null,
    nearStatus: null,
  };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { steps: true }
  });
  if (!order || ['completed', 'failed', 'refunded', 'expired'].includes(order.status)) return result;

  const { classifyNearStatus } = await import('./nearintents.service');

  for (const step of order.steps) {
    if (step.status === 'done' || step.status === 'failed') continue;

    try {
      if (step.provider === 'nearintents' && step.depositAddress) {
        console.log(`[sync] checking nearintents step ${step.id} for address ${step.depositAddress}`);
        const status = await nearIntents.getStatus(step.depositAddress, step.depositMemo ?? undefined);
        console.log(`[sync] nearintents status for ${step.id}: ${status.status}`);
        result.nearStatus = status.status;
        const outcome = classifyNearStatus(status.status);
        if (outcome === 'done') {
          const amountOut = Number(status.swapDetails?.amountOutFormatted) || undefined;
          await markStepDone({ provider: 'nearintents', externalId: step.depositAddress, depositMemo: step.depositMemo, amountOut });
        } else if (outcome === 'failed' || outcome === 'refunded') {
          await markStepFailed({ provider: 'nearintents', externalId: step.depositAddress, depositMemo: step.depositMemo, isRefund: outcome === 'refunded' });
        }
      } else if (step.provider === 'paycrest' && step.externalId) {
        console.log(`[sync] checking paycrest step ${step.id} for order ${step.externalId}`);
        const pc = await paycrest.getOrder(step.externalId) as any;
        console.log(`[sync] paycrest status for ${step.id}: ${pc.status} (dir: ${pc.direction})`);
        result.paycrestStatus = pc.status ?? null;

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
          // For offramp (crypto → fiat): pc.amount is the net crypto (fee already deducted), multiply by rate to get fiat
          // For onramp (fiat → crypto): pc.amount is the crypto output, use directly
          let finalAmount = Number(pc.amount);
          if (direction === 'offramp') {
            // Offramp: pc.amount is already net of fees, just convert to fiat using the rate
            finalAmount = Number(pc.amount) * Number(pc.rate);
          }
          await markStepDone({ provider: 'paycrest', externalId: step.externalId, amountOut: finalAmount });
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
      } else if (step.provider === 'chainrails' && step.externalId) {
        console.log(`[sync] checking chainrails step ${step.id} for intent ${step.externalId}`);
        const intent = await chainRails.getIntent(step.externalId);
        console.log(`[sync] chainrails status for ${step.id}: ${intent.intent_status}`);

        if (intent.intent_status === 'COMPLETED') {
          await markStepDone({ provider: 'chainrails', externalId: step.externalId });
        } else if (intent.intent_status === 'FAILED') {
          await markStepFailed({ provider: 'chainrails', externalId: step.externalId });
        }
      } else if (step.provider === 'direct' && step.externalId) {
        console.log(`[sync] checking on-chain for direct step ${step.id} (dest: ${step.depositAddress})`);
        const confirmedAmount = await checkOnChainDirect(step as any);
        if (confirmedAmount != null) {
          console.log(`[sync] direct payment confirmed on-chain: ${confirmedAmount} USDC`);
          await markStepDone({ provider: 'direct', externalId: step.externalId, amountOut: confirmedAmount });
        }
      } else if (step.provider === 'stellar' && step.depositMemo) {
        console.log(`[sync] checking Stellar Horizon for step ${step.id} memo ${step.depositMemo}`);
        const { findMatchingPayment } = await import('./stellar.service');
        const match = await findMatchingPayment({
          memo: step.depositMemo,
          expectedAmount: Number(step.amountIn),
        });
        if (match) {
          console.log(`[sync] Stellar payment confirmed: ${match.txHash}`);
          await markStepDone({
            provider: 'stellar',
            externalId: step.externalId ?? step.depositMemo,
            depositMemo: step.depositMemo,
            amountOut: match.amount,
          });
          // Persist tx hash on the step for merchant dashboard visibility.
          await prisma.routeStep.update({
            where: { id: step.id },
            data: { externalId: match.txHash },
          });
        }
      }
    } catch (err: any) {
      console.warn(`[sync] failed to sync step ${step.id} (${step.provider}):`, err.message);
    }
  }

  return result;
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

async function checkOnChainDirect(step: { toAsset: string; depositAddress: string; amountIn: number }): Promise<number | null> {
  // v1: Only USDC on Base is supported for direct polling
  if (step.toAsset !== 'crypto:BASE:USDC') return null;
  const merchantAddress = step.depositAddress;
  if (!merchantAddress) return null;

  const expectedAmount = step.amountIn;
  if (!expectedAmount) return null;

  try {
    // USDC on Base has 6 decimals
    const expectedSmallest = Math.floor(expectedAmount * 1_000_000);
    const amountHex = '0x' + expectedSmallest.toString(16).padStart(64, '0');
    const merchantHex = '0x' + merchantAddress.toLowerCase().replace('0x', '').padStart(64, '0');

    const rpc = 'https://mainnet.base.org';

    // Get current block to look back
    const blockRes = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] })
    });
    const blockData = await blockRes.json();
    const currentBlock = parseInt(blockData.result, 16);
    const fromBlock = '0x' + (currentBlock - 500).toString(16); // Look back ~500 blocks

    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getLogs',
      params: [{
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer(address,address,uint256)
          null, // from (any)
          merchantHex, // to (merchant)
        ],
        fromBlock,
        toBlock: 'latest'
      }]
    };

    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    const logs = data.result || [];

    // Find a log where the data (amount) matches our expected amount
    // Note: some ERC20s put amount in topics, but USDC puts it in data.
    const match = logs.find((l: any) => l.data.toLowerCase() === amountHex.toLowerCase());
    if (match) return expectedAmount;
  } catch (err: any) {
    console.warn(`[checkOnChainDirect] RPC call failed:`, err.message);
  }

  return null;
}
