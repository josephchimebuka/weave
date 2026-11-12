import { Router, Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { qstashReceiver } from '../lib/qstash';
import { prisma } from '../lib/prisma';
import { markStepDone, markStepFailed, syncAllOpenOrders, syncOrder, scheduleNearPoll, runBachsSplit, scheduleBachsSettle, runBachsWithdrawal, scheduleBachsPayout } from '../services/executor.service';
import { webhookService } from '../services/webhook.service';
import { sendMerchantPaymentNotification, sendCustomerReceiptEmail, sendAdminKYBNotification } from '../services/email.service';
import { nearIntents, classifyNearStatus } from '../services/nearintents.service';
import { syncPaystackSubaccount, schedulePaystackSyncRetry } from '../lib/merchant';
import { inspectMemoPayments, scheduleStellarPoll, STELLAR_POLL_MAX_ATTEMPTS } from '../services/stellar.service';
import { reportStellarDepositShape } from '../services/order-event.service';

const router = Router();

/**
 * Middleware to verify that the request is actually from QStash.
 * Only enforced in production.
 */
const verifyQStash = async (req: Request, res: Response, next: Function) => {
  // Only bypass verification when explicitly opted in via env flag.
  // Never key off NODE_ENV — that would leave staging/misconfigured prod unprotected.
  if (process.env.SKIP_QSTASH_VERIFICATION === 'true') {
    if (process.env.NODE_ENV === 'production') {
      console.error('[jobs] CRITICAL: SKIP_QSTASH_VERIFICATION cannot be true in production');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }
    return next();
  }

  const signature = req.headers['upstash-signature'] as string;
  const rawBody = (req as any).rawBody;
  const body = rawBody !== undefined ? rawBody : (Object.keys(req.body || {}).length === 0 ? '' : JSON.stringify(req.body));

  const apiBase = process.env.API_BASE;
  if (!apiBase) {
    console.error('[jobs] API_BASE is not set — cannot verify QStash signature');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }
  const url = `${apiBase}/jobs${req.path}`;

  const isValid = await qstashReceiver.verify({
    signature,
    body,
    url,
    clockTolerance: 10,
  }).catch(() => false);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid QStash signature' });
  }
  next();
};

// ── Webhook Processing Job ──────────────────────────────────────────────────

const CHAINRAILS_OUTCOME: Record<string, 'done' | 'failed' | 'progress'> = {
  'intent.funded':    'progress',
  'intent.initiated': 'progress',
  'intent.completed': 'done',
  'intent.refunded': 'failed',
  'intent.expired': 'failed',
};

router.post('/process-webhook', verifyQStash, async (req, res) => {
  const { source, event, data } = req.body;

  // ── Paystack DVA bank transfers ────────────────────────────────────────────
  // DVA payments are matched by virtual account number from the webhook, not
  // by a reference we set at order creation (which is unknown to Paystack).
  if (source === 'paystack') {
    if (event !== 'charge.success') {
      return res.status(200).json({ skipped: true, reason: 'unhandled event' });
    }

    const txRef = String(data?.reference ?? '');
    if (!txRef) return res.status(200).json({ skipped: true, reason: 'missing reference' });

    const logKey = { source_event_externalId: { source, event, externalId: txRef } };
    const existing = await prisma.webhookLog.findUnique({ where: logKey });
    if (existing?.processed) return res.status(200).json({ skipped: true, reason: 'already processed' });

    // Popup flow: reference = our paystackRef stored in externalId
    let step = await prisma.routeStep.findFirst({
      where: { provider: 'paystack', externalId: txRef },
      select: { id: true, orderId: true, externalId: true },
    });

    if (!step) return res.status(200).json({ skipped: true, reason: 'no step found' });

    await markStepDone({ provider: 'paystack', externalId: step.externalId!, paymentChannel: data?.channel ?? null });

    await prisma.webhookLog.upsert({
      where: logKey,
      create: { orderId: step.orderId, source, event, externalId: txRef, payload: data, processed: true },
      update: { processed: true },
    });

    return res.json({ success: true });
  }

  // ── Bachs Connect (NGN collect → split) ────────────────────────────────────
  if (source === 'bachs') {
    // `data` is the full webhook envelope { id, type, account?, data }.
    const evt = data?.data ?? {};

    if (event === 'collection.succeeded') {
      const checkoutId = String(evt?.checkout_id ?? '');
      const chargeId   = String(evt?.charge_id ?? '');
      if (!checkoutId) return res.status(200).json({ skipped: true, reason: 'missing checkout_id' });

      const logKey = { source_event_externalId: { source, event, externalId: checkoutId } };
      const existing = await prisma.webhookLog.findUnique({ where: logKey });
      if (existing?.processed) return res.status(200).json({ skipped: true, reason: 'already processed' });

      const step = await prisma.routeStep.findFirst({
        where: { provider: 'bachs', externalId: checkoutId, sequence: 0 },
        select: { id: true, orderId: true, order: { select: { sandboxMode: true } } },
      });
      if (!step) return res.status(200).json({ skipped: true, reason: 'no collection step found' });

      // Tag the collection step with the charge id (= transfer_group for the
      // split + reconciliation).
      if (chargeId) {
        await prisma.routeStep.update({ where: { id: step.id }, data: { transferGroup: chargeId } });
      }

      // Collection done → single-step order COMPLETES. Sandbox orders MOCK the split +
      // payout (no live money) exactly like syncOrder does; only LIVE orders schedule
      // the real deferred split. This keeps a sandbox webhook from ever driving a live
      // transfer even if it reaches this handler.
      await markStepDone({ provider: 'bachs', externalId: checkoutId });
      if (step.order.sandboxMode) {
        await prisma.order.update({
          where: { id: step.orderId },
          data:  { bachsSplitStatus: 'settled', bachsSplitAt: new Date(), bachsPayoutStatus: 'paid', bachsPayoutAt: new Date() },
        });
      } else {
        await prisma.order.update({ where: { id: step.orderId }, data: { bachsSplitStatus: 'pending' } });
        await scheduleBachsSettle({ orderId: step.orderId, attempt: 1 });
      }

      await prisma.webhookLog.upsert({
        where: logKey,
        create: { orderId: step.orderId, source, event, externalId: checkoutId, payload: data, processed: true },
        update: { processed: true },
      });
      return res.json({ success: true });
    }

    if (event === 'collection.failed') {
      const checkoutId = String(evt?.checkout_id ?? '');
      if (!checkoutId) return res.status(200).json({ skipped: true, reason: 'missing checkout_id' });
      await markStepFailed({ provider: 'bachs', externalId: checkoutId });
      return res.json({ success: true });
    }

    if (event === 'transfer.created') {
      // Split-settled backup: runBachsSplit persists this synchronously, but if it
      // created the transfer at Bachs then crashed before persisting, this webhook
      // records it. Match the order by transfer_group (= the charge id we tagged
      // on the collection step). Idempotent.
      const transferId    = String(evt?.id ?? '');
      const transferGroup = String(evt?.transfer_group ?? '');
      if (!transferId || !transferGroup) return res.status(200).json({ skipped: true, reason: 'missing transfer fields' });

      const step = await prisma.routeStep.findFirst({
        where: { provider: 'bachs', transferGroup, sequence: 0 },
        select: { orderId: true },
      });
      if (step) {
        await prisma.order.updateMany({
          where: { id: step.orderId, bachsSplitStatus: { not: 'settled' } },
          data:  { bachsSplitStatus: 'settled', bachsSplitTransferId: transferId, bachsSplitAt: new Date() },
        });
      }
      return res.json({ success: true });
    }

    if (event === 'capability.updated') {
      // Connect event: the origin is the connected account (top-level `account`).
      const accountId  = String(data?.account ?? evt?.account ?? '');
      const capability = String(evt?.capability ?? '');
      const status     = String(evt?.status ?? '');
      const field = capability === 'transfers' ? 'bachsTransfersStatus'
                  : capability === 'payouts'   ? 'bachsPayoutsStatus'
                  : null;
      if (accountId && field) {
        await prisma.merchant.updateMany({
          where: { bachsConnectedAccountId: accountId },
          data:  { [field]: status },
        });
      }
      return res.json({ success: true });
    }

    return res.status(200).json({ skipped: true, reason: 'unhandled bachs event' });
  }

  // ── Paycrest + ChainRails ──────────────────────────────────────────────────
  const externalId = String(
    source === 'chainrails' ? (data?.data?.id ?? '') : (data?.data?.id ?? data?.id ?? data?.reference ?? '')
  );
  if (!externalId) return res.status(200).json({ skipped: true, reason: 'missing externalId' });

  let outcome: 'done' | 'failed' | 'progress' = 'progress';

  if (source === 'paycrest') {
    const payload = data?.data ?? data;
    const direction = payload?.direction || '';

    if (['payment_order.validated', 'payment_order.settled', 'payment_order.completed', 'payment_order.paid'].includes(event)) {
      if (direction === 'offramp' && event === 'payment_order.validated') outcome = 'done';
      else if (event === 'payment_order.settled') outcome = 'done';
      else if (event === 'payment_order.completed' || event === 'payment_order.paid') outcome = 'done';
    } else if (['payment_order.failed', 'payment_order.expired', 'payment_order.refunded'].includes(event)) {
      outcome = 'failed';
    }
  } else {
    outcome = CHAINRAILS_OUTCOME[event] ?? 'progress';
  }

  if (outcome === 'progress') return res.status(200).json({ skipped: true, reason: 'unhandled event' });

  // Idempotency gate
  const logKey = { source_event_externalId: { source, event, externalId } };
  const existing = await prisma.webhookLog.findUnique({ where: logKey });
  if (existing?.processed) return res.status(200).json({ skipped: true, reason: 'already processed' });

  const step = await prisma.routeStep.findFirst({
    where: { provider: source, externalId },
    select: { orderId: true },
  });
  if (!step) return res.status(200).json({ skipped: true, reason: 'no step found' });

  if (outcome === 'done') {
    let amountOut: number | undefined = undefined;
    if (source === 'paycrest') {
      const payload = data?.data ?? data;
      const direction = payload?.direction || '';
      // For offramp (crypto → fiat): pc.amount is already net of fees, multiply by rate to get fiat
      // For onramp (fiat → crypto): use the crypto amount directly
      if (direction === 'offramp') {
        amountOut = Number(payload?.amount) * Number(payload?.rate);
      } else {
        amountOut = Number(payload?.amount);
      }
    }
    await markStepDone({ provider: source, externalId, amountOut });
  } else if (outcome === 'failed') {
    await markStepFailed({ provider: source, externalId });
  } else if (outcome === 'progress') {
    const { markStepProgress } = await import('../services/executor.service');
    await markStepProgress({ provider: source, externalId });
  }

  await prisma.webhookLog.upsert({
    where: logKey,
    create: { orderId: step.orderId, source, event, externalId, payload: data, processed: true },
    update: { processed: true },
  });

  res.json({ success: true });
});

// ── Outgoing Webhook Job ────────────────────────────────────────────────────

router.post('/dispatch-outgoing', verifyQStash, async (req, res) => {
  const { deliveryId, merchantId, event } = req.body;

  try {
    if (deliveryId) {
      await webhookService.dispatch(deliveryId);
    } else if (merchantId && event) {
      // Back-compat: messages enqueued before delivery tracking carried the raw
      // { merchantId, event }. Materialize a delivery row, then dispatch it.
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { webhookUrl: true, webhookSecret: true },
      });
      if (merchant?.webhookUrl && merchant.webhookSecret) {
        const d = await prisma.webhookDelivery.create({
          data: {
            merchantId,
            orderId: event?.data?.id ?? null,
            event:   event.event,
            url:     merchant.webhookUrl,
            payload: event,
            status:  'retrying',
            attempts: 0,
          },
        });
        await webhookService.dispatch(d.id);
      }
    }
    res.json({ success: true });
  } catch (error: any) {
    // Return 500 so QStash automatically retries based on your QStash configuration
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Order-completed notifications (merchant email + customer receipt + webhook) ──
// Fired once by executor.service.ts right after an order transitions to
// 'completed'. Runs through QStash (rather than in-process fire-and-forget) so a
// transient DB blip during any of the three steps gets a real retry instead of
// silently dropping the notification forever.
router.post('/notify-order-completed', verifyQStash, async (req, res) => {
  const { orderId } = req.body as { orderId: string };
  if (!orderId) return res.status(400).json({ error: 'missing orderId' });

  const [merchantEmailOk, customerEmailOk] = await Promise.all([
    sendMerchantPaymentNotification(orderId),
    sendCustomerReceiptEmail(orderId),
  ]);

  let webhookOk = true;
  try {
    await webhookService.triggerPaymentSucceeded(orderId);
  } catch (err: any) {
    webhookOk = false;
    console.error(`[jobs] notify-order-completed: webhook trigger failed for order ${orderId}:`, err.message);
  }

  if (!merchantEmailOk || !customerEmailOk || !webhookOk) {
    // This handler returns 500 itself (for QStash retry) rather than throwing,
    // so it never reaches Sentry's Express handler — capture explicitly. This
    // is exactly the class of silent failure that dropped notifications before.
    Sentry.captureMessage('notify-order-completed: a notification step failed', {
      level: 'error',
      tags: { job: 'notify-order-completed' },
      extra: { orderId, merchantEmailOk, customerEmailOk, webhookOk },
    });
    // Return 500 so QStash retries the whole job. Steps that already succeeded
    // are cheap/harmless to re-run (at worst, a duplicate transactional email) —
    // far preferable to the previous silent, permanent drop.
    return res.status(500).json({ success: false, merchantEmailOk, customerEmailOk, webhookOk });
  }
  res.json({ success: true });
});

// ── Admin KYB notification (reliable delivery) ──────────────────────────────
// Enqueued by POST /verification/submit. The admin alert MUST land (it carries
// the review magic link), so it runs here behind QStash retries rather than as
// an in-process fire-and-forget that dies on the first transient Resend blip.
router.post('/notify-admin-kyb', verifyQStash, async (req, res) => {
  const { verificationId } = req.body as { verificationId: string };
  if (!verificationId) return res.status(400).json({ error: 'missing verificationId' });

  const ok = await sendAdminKYBNotification(verificationId);
  if (!ok) {
    Sentry.captureMessage('notify-admin-kyb: admin KYB email failed to send', {
      level: 'error',
      tags: { job: 'notify-admin-kyb' },
      extra: { verificationId },
    });
    // 500 → QStash retries. Re-sending is harmless (at worst a duplicate admin
    // email) and far better than permanently dropping the review link.
    return res.status(500).json({ success: false });
  }
  res.json({ success: true });
});

// ── NEAR per-step poll (event-driven) ───────────────────────────────────────
// Scheduled by executeOrder at order creation time. Checks a single NEAR step
// and re-enqueues itself until the step is terminal. This replaces the global
// sweep as the primary polling mechanism; /poll-near is now a recovery sweep.

router.post('/poll-near-step', verifyQStash, async (req, res) => {
  const { depositAddress, depositMemo, attempt } = req.body as {
    depositAddress: string;
    depositMemo:    string | null;
    attempt:        number;
  };

  if (!depositAddress) {
    return res.status(400).json({ error: 'missing depositAddress' });
  }

  // Bail early if the step already reached a terminal state (e.g. webhook beat us to it).
  const step = await prisma.routeStep.findFirst({
    where: {
      provider:       'nearintents',
      depositAddress,
      status:         { notIn: ['done', 'failed'] },
    },
    select: { id: true },
  });

  if (!step) {
    return res.json({ success: true, stopped: true, reason: 'step already terminal' });
  }

  try {
    const status  = await nearIntents.getStatus(depositAddress, depositMemo ?? undefined);
    const outcome = classifyNearStatus(status.status);

    if (outcome === 'done') {
      const amountOut = Number(status.swapDetails?.amountOutFormatted) || undefined;
      await markStepDone({ provider: 'nearintents', externalId: depositAddress, depositMemo: depositMemo ?? null, amountOut });
      return res.json({ success: true, outcome: 'done' });
    }

    if (outcome === 'failed' || outcome === 'refunded') {
      await markStepFailed({ provider: 'nearintents', externalId: depositAddress, depositMemo: depositMemo ?? null, isRefund: outcome === 'refunded' });
      return res.json({ success: true, outcome });
    }

    // Deposit seen but swap not yet complete → mark in-flight so the timeline
    // gets a "deposit detected" moment (markStepProgress emits it once, guarded).
    // NEAR is poll-only with no webhook, so this is the only place to catch it.
    if (['KNOWN_DEPOSIT_TX', 'PROCESSING', 'INCOMPLETE_DEPOSIT'].includes(status.status)) {
      const { markStepProgress } = await import('../services/executor.service');
      await markStepProgress({ provider: 'nearintents', externalId: depositAddress, depositMemo: depositMemo ?? null });
    }

    // Still pending — re-schedule the next check.
    await scheduleNearPoll({ depositAddress, depositMemo, attempt: attempt + 1 });
    return res.json({ success: true, outcome: 'progress', nextAttempt: attempt + 1 });
  } catch (err: any) {
    // Re-schedule even on provider errors so a transient failure doesn't
    // silently kill the polling chain for this order.
    await scheduleNearPoll({ depositAddress, depositMemo, attempt: attempt + 1 });
    return res.json({ success: true, rescheduled: true, error: err.message });
  }
});

// ── NEAR sweep (recovery safety net) ────────────────────────────────────────
// Catches any steps whose self-scheduled chain broke (e.g. QStash message
// lost). Change the Upstash cron from */2 to */30 — this no longer needs to
// be the primary poll; it just sweeps up stragglers.

router.post('/poll-near', verifyQStash, async (req, res) => {
  const openStepsCount = await prisma.routeStep.count({
    where: {
      provider: 'nearintents',
      status: { notIn: ['done', 'failed'] },
      depositAddress: { not: null },
    },
  });

  if (openStepsCount === 0) {
    return res.json({ success: true, count: 0, skipped: true });
  }

  const openSteps = await prisma.routeStep.findMany({
    where: {
      provider: 'nearintents',
      status: { notIn: ['done', 'failed'] },
      depositAddress: { not: null },
    },
    take: 15,
    orderBy: { createdAt: 'asc' },
  });

  for (const step of openSteps) {
    try {
      const status  = await nearIntents.getStatus(step.depositAddress!, step.depositMemo ?? undefined);
      const outcome = classifyNearStatus(status.status);

      if (outcome === 'done') {
        const amountOut = Number(status.swapDetails?.amountOutFormatted) || undefined;
        await markStepDone({ provider: 'nearintents', externalId: step.depositAddress!, depositMemo: step.depositMemo, amountOut });
      } else if (outcome === 'failed' || outcome === 'refunded') {
        await markStepFailed({ provider: 'nearintents', externalId: step.depositAddress!, depositMemo: step.depositMemo, isRefund: outcome === 'refunded' });
      }
    } catch { /* skip this step */ }
  }

  res.json({ success: true, count: openSteps.length });
});

// ── Stellar per-step poll (Horizon payment detection) ───────────────────────

router.post('/poll-stellar-step', verifyQStash, async (req, res) => {
  const { orderId, memo, expectedAmount, attempt } = req.body as {
    orderId: string;
    memo: string;
    expectedAmount: number;
    attempt: number;
  };

  if (!orderId || !memo) {
    return res.status(400).json({ error: 'missing orderId or memo' });
  }

  const step = await prisma.routeStep.findFirst({
    where: {
      orderId,
      provider: 'stellar',
      depositMemo: memo,
      status: { notIn: ['done', 'failed'] },
    },
    select: { id: true, amountIn: true, externalId: true, createdAt: true },
  });

  if (!step) {
    return res.json({ success: true, stopped: true, reason: 'step already terminal or not found' });
  }

  try {
    const insp = await inspectMemoPayments({
      memo,
      expectedAmount: expectedAmount ?? Number(step.amountIn),
      since: step.createdAt,
    });
    await reportStellarDepositShape(orderId, insp);

    if (insp.status === 'matched') {
      const txHash = insp.payments[0].txHash;
      await markStepDone({
        provider: 'stellar',
        externalId: step.externalId ?? memo,
        depositMemo: memo,
        amountOut: insp.total,
      });
      await prisma.routeStep.update({
        where: { id: step.id },
        data: { externalId: txHash },
      });
      return res.json({ success: true, outcome: 'done', txHash });
    }

    if (attempt >= STELLAR_POLL_MAX_ATTEMPTS) {
      return res.json({ success: true, stopped: true, reason: 'max attempts reached' });
    }

    await scheduleStellarPoll({ orderId, memo, expectedAmount: expectedAmount ?? Number(step.amountIn), attempt: attempt + 1 });
    return res.json({ success: true, outcome: 'pending', nextAttempt: attempt + 1 });
  } catch (err: any) {
    if (attempt < STELLAR_POLL_MAX_ATTEMPTS) {
      await scheduleStellarPoll({ orderId, memo, expectedAmount, attempt: attempt + 1 });
    }
    return res.json({ success: true, rescheduled: true, error: err.message });
  }
});

// ── Treasury → Paycrest (after Stellar wallet collection) ───────────────────

router.post('/bridge-stellar-treasury', verifyQStash, async (req, res) => {
  const { orderId } = req.body as { orderId?: string };
  if (!orderId) return res.status(400).json({ error: 'missing orderId' });

  try {
    const { bridgeTreasuryUsdcToPaycrest } = await import('../services/stellar-treasury-bridge.service');
    const result = await bridgeTreasuryUsdcToPaycrest(orderId);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[jobs] bridge-stellar-treasury failed:', err.message);
    try {
      const { recordServerEvent } = await import('../services/order-event.service');
      recordServerEvent(orderId, 'treasury.bridge.failed', 'Treasury bridge failed', {
        error: String(err?.message ?? err),
      });
    } catch { /* ignore */ }
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── Paystack subaccount re-sync (background retry) ──────────────────────────
// Scheduled by schedulePaystackSyncRetry when a setup-time sync fails, so a
// transient Paystack blip self-heals before any customer reaches checkout.
// Re-enqueues itself on the backoff schedule until SYNCED or the schedule runs out.

router.post('/retry-paystack-sync', verifyQStash, async (req, res) => {
  const { merchantId, attempt } = req.body as { merchantId: string; attempt: number };
  if (!merchantId) {
    return res.status(400).json({ error: 'missing merchantId' });
  }

  const merchant = await prisma.merchant.findUnique({
    where:  { id: merchantId },
    select: { paystackSubaccountStatus: true },
  });
  if (!merchant) {
    return res.json({ success: true, stopped: true, reason: 'merchant not found' });
  }
  if (merchant.paystackSubaccountStatus === 'SYNCED') {
    return res.json({ success: true, stopped: true, reason: 'already synced' });
  }

  try {
    await syncPaystackSubaccount(merchantId);
    return res.json({ success: true, synced: true, attempt });
  } catch (err: any) {
    // syncPaystackSubaccount already persisted FAILED + logged; back off and retry.
    await schedulePaystackSyncRetry({ merchantId, attempt: (attempt ?? 1) + 1 });
    return res.json({ success: true, rescheduled: true, nextAttempt: (attempt ?? 1) + 1, error: err.message });
  }
});

// ── Bachs deferred split settlement ─────────────────────────────────────────
// Scheduled by the collection.succeeded webhook. Transfers the vendor its share
// once the collection has settled into our available balance, self-rescheduling
// on the settlement cadence until the funds are available (or attempts run out).

router.post('/bachs-settle', verifyQStash, async (req, res) => {
  const { orderId, attempt } = req.body as { orderId: string; attempt: number };
  if (!orderId) return res.status(400).json({ error: 'missing orderId' });

  try {
    const result = await runBachsSplit(orderId);
    if (result.status === 'waiting') {
      // Funds not yet settled — check again next cycle.
      await scheduleBachsSettle({ orderId, attempt: (attempt ?? 1) + 1 });
      return res.json({ success: true, rescheduled: true, nextAttempt: (attempt ?? 1) + 1, reason: result.reason });
    }
    return res.json({ success: true, ...result });
  } catch (err: any) {
    // Transient failure (e.g. Bachs API blip) — reschedule rather than drop the
    // split, so a vendor's money is never silently stranded in our balance.
    await scheduleBachsSettle({ orderId, attempt: (attempt ?? 1) + 1 });
    return res.json({ success: true, rescheduled: true, error: err.message });
  }
});

// ── Bachs split recovery sweep ──────────────────────────────────────────────
// Backstop for the self-scheduling settle chain: a Bachs order COMPLETES at
// collection (customer paid), so its pending split is not a "processing" order
// the sync-all sweep would touch. If the settle chain's QStash message is ever
// lost, the vendor's share would sit stranded in our balance. This sweep re-drives
// any completed Bachs order whose split is still pending. Wire to an infrequent
// QStash cron (e.g. hourly). Live orders only — sandbox splits are mocked settled.

router.post('/bachs-settle-sweep', verifyQStash, async (req, res) => {
  const stuck = await prisma.order.findMany({
    where: {
      sandboxMode:      false,
      bachsSplitStatus: 'pending',
      status:           'completed',
    },
    select: { id: true },
    take: 25,
    orderBy: { createdAt: 'asc' },
  });

  let settled = 0, waiting = 0;
  for (const o of stuck) {
    try {
      const result = await runBachsSplit(o.id);
      if (result.status === 'settled') settled++;
      else if (result.status === 'waiting') { waiting++; await scheduleBachsSettle({ orderId: o.id, attempt: 1 }); }
    } catch (err: any) {
      console.warn(`[jobs] bachs-settle-sweep failed for ${o.id}:`, err.message);
    }
  }

  res.json({ success: true, swept: stuck.length, settled, waiting });
});

// ── Bachs payout (withdrawal to vendor bank) ────────────────────────────────
// Fired after the split settles (behind the BACHS_PAYOUT_HOLD_S hold window).
// Withdraws the vendor's share from their connected-account balance to their bank.
router.post('/bachs-payout', verifyQStash, async (req, res) => {
  const { orderId, attempt } = req.body as { orderId: string; attempt: number };
  if (!orderId) return res.status(400).json({ error: 'missing orderId' });

  try {
    const result = await runBachsWithdrawal(orderId);
    if (result.status === 'waiting' || result.status === 'blocked') {
      // Balance not yet available, or destination not yet resolvable — retry.
      // 'blocked' also self-heals once the merchant fixes their payout bank.
      await scheduleBachsPayout({ orderId, attempt: (attempt ?? 1) + 1 });
      return res.json({ success: true, rescheduled: true, nextAttempt: (attempt ?? 1) + 1, status: result.status, reason: result.reason });
    }
    return res.json({ success: true, ...result });
  } catch (err: any) {
    // Transient failure (e.g. Bachs API blip) — reschedule so the vendor's money
    // is never stranded in their connected-account balance.
    await scheduleBachsPayout({ orderId, attempt: (attempt ?? 1) + 1 });
    return res.json({ success: true, rescheduled: true, error: err.message });
  }
});

// ── Bachs payout recovery sweep ─────────────────────────────────────────────
// Backstop for the self-scheduling payout chain: re-drives any order whose split
// has settled but whose payout is still pending/blocked (a lost QStash message,
// or a previously-blocked destination the merchant has since fixed). Wire to an
// infrequent QStash cron. Live orders only — sandbox payouts are mocked paid.
router.post('/bachs-payout-sweep', verifyQStash, async (req, res) => {
  const stuck = await prisma.order.findMany({
    where: {
      sandboxMode:      false,
      bachsSplitStatus: 'settled',
      bachsPayoutStatus: { in: ['pending', 'blocked'] },
    },
    select: { id: true },
    take: 25,
    orderBy: { createdAt: 'asc' },
  });

  let paid = 0, waiting = 0, blocked = 0;
  for (const o of stuck) {
    try {
      const result = await runBachsWithdrawal(o.id);
      if (result.status === 'paid') paid++;
      else if (result.status === 'waiting') { waiting++; await scheduleBachsPayout({ orderId: o.id, attempt: 1 }); }
      else if (result.status === 'blocked') blocked++;
    } catch (err: any) {
      console.warn(`[jobs] bachs-payout-sweep failed for ${o.id}:`, err.message);
    }
  }

  res.json({ success: true, swept: stuck.length, paid, waiting, blocked });
});

// ── Expire Checkout Sessions ────────────────────────────────────────────────

router.post('/expire-checkout-sessions', verifyQStash, async (req, res) => {
  const result = await prisma.checkoutSession.updateMany({
    where: {
      status: 'open',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'expired' },
  });

  res.json({ success: true, count: result.count });
});

// ── Cleanup Abandoned Payments ──────────────────────────────────────────────

router.post('/cleanup-expired', verifyQStash, async (req, res) => {
  const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);

  const result = await prisma.order.updateMany({
    where: {
      status: 'awaiting_deposit',
      createdAt: { lt: fiveHoursAgo }
    },
    data: { status: 'expired' }
  });

  res.json({ success: true, count: result.count });
});

// ── Sync Jobs ───────────────────────────────────────────────────────────────

router.post('/sync-all', verifyQStash, async (req, res) => {
  await syncAllOpenOrders();
  res.json({ success: true });
});

router.post('/sync-order/:id', verifyQStash, async (req, res) => {
  await syncOrder(req.params.id);
  res.json({ success: true });
});

export default router;
