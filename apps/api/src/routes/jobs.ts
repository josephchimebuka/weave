import { Router, Request, Response } from 'express';
import { qstashReceiver } from '../lib/qstash';
import { prisma } from '../lib/prisma';
import { markStepDone, markStepFailed, syncAllOpenOrders, syncOrder } from '../services/executor.service';
import { webhookService } from '../services/webhook.service';
import { nearIntents, classifyNearStatus } from '../services/nearintents.service';

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

    await markStepDone({ provider: 'paystack', externalId: step.externalId! });

    await prisma.webhookLog.upsert({
      where: logKey,
      create: { orderId: step.orderId, source, event, externalId: txRef, payload: data, processed: true },
      update: { processed: true },
    });

    return res.json({ success: true });
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
  const { merchantId, event } = req.body;

  try {
    await webhookService.dispatch(merchantId, event);
    res.json({ success: true });
  } catch (error: any) {
    // Return 500 so QStash automatically retries based on your QStash configuration
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── NEAR Polling Job ────────────────────────────────────────────────────────

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
      const status = await nearIntents.getStatus(step.depositAddress!, step.depositMemo ?? undefined);
      const outcome = classifyNearStatus(status.status);

      if (outcome === 'done') {
        const amountOut = Number(status.swapDetails?.amountOutFormatted) || undefined;
        await markStepDone({ provider: 'nearintents', externalId: step.depositAddress!, amountOut });
      } else if (outcome === 'failed' || outcome === 'refunded') {
        await markStepFailed({ provider: 'nearintents', externalId: step.depositAddress!, isRefund: outcome === 'refunded' });
      }
    } catch { /* skip err for this loop */ }
  }

  res.json({ success: true, count: openSteps.length });
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
