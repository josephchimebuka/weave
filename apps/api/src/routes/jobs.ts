import { Router, Request, Response } from 'express';
import { qstashReceiver } from '../lib/qstash';
import { prisma } from '../lib/prisma';
import { markStepDone, markStepFailed } from '../services/executor.service';
import { webhookService } from '../services/webhook.service';
import { nearIntents, classifyNearStatus } from '../services/nearintents.service';

const router = Router();

/**
 * Middleware to verify that the request is actually from QStash.
 * Only enforced in production.
 */
const verifyQStash = async (req: Request, res: Response, next: Function) => {
  if (process.env.NODE_ENV === 'development') return next();

  const signature = req.headers['upstash-signature'] as string;
  const body = (req as any).rawBody || JSON.stringify(req.body);

  const isValid = await qstashReceiver.verify({
    signature,
    body,
  }).catch(() => false);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid QStash signature' });
  }
  next();
};

// ── Webhook Processing Job ──────────────────────────────────────────────────

const PAYCREST_OUTCOME: Record<string, 'done' | 'failed' | 'progress'> = {
  'payment_order.settled':   'done',
  'payment_order.refunding': 'failed',
  'payment_order.refunded':  'failed',
  'payment_order.expired':   'failed',
};

const CHAINRAILS_OUTCOME: Record<string, 'done' | 'failed' | 'progress'> = {
  'intent.completed': 'done',
  'intent.refunded':  'failed',
  'intent.expired':   'failed',
};

router.post('/process-webhook', verifyQStash, async (req, res) => {
  const { source, event, data } = req.body;

  const externalId = String(
    source === 'chainrails' ? (data?.data?.id ?? '') : (data?.data?.id ?? data?.id ?? '')
  );
  
  if (!externalId) return res.status(200).json({ skipped: true, reason: 'missing externalId' });

  const outcome = source === 'paycrest' ? PAYCREST_OUTCOME[event] : CHAINRAILS_OUTCOME[event];
  if (!outcome || outcome === 'progress') return res.status(200).json({ skipped: true, reason: 'unhandled event' });

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
    const amountOut = source === 'paycrest' ? Number(data?.data?.amount) || undefined : undefined;
    await markStepDone({ provider: source, externalId, amountOut });
  } else if (outcome === 'failed') {
    await markStepFailed({ provider: source, externalId });
  }

  await prisma.webhookLog.upsert({
    where:  logKey,
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
  const openSteps = await prisma.routeStep.findMany({
    where: {
      provider: 'nearintents',
      status:   { notIn: ['done', 'failed'] },
      depositAddress: { not: null },
    },
    take: 10,
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

export default router;
