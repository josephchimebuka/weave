import { Queue, Worker } from 'bullmq';
import { prisma } from '../lib/prisma';
import { markStepDone, markStepFailed } from '../services/executor.service';

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
};

export const webhookQueue = new Queue('weave-webhooks', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff:  { type: 'exponential', delay: 2_000 },
    removeOnComplete: 100,
    removeOnFail:     500,
  },
});

// ── Event classification ────────────────────────────────────────────────────
// Provider events bucket into three outcomes against our RouteStep lifecycle:
// "done" (this step succeeded), "failed", or "progress" (log but don't transition).

type Outcome = 'done' | 'failed' | 'progress';

const PAYCREST_OUTCOME: Record<string, Outcome> = {
  'payment_order.deposited': 'progress',
  'payment_order.pending':   'progress',
  'payment_order.validated': 'progress',
  'payment_order.settling':  'progress',
  'payment_order.settled':   'done',
  'payment_order.refunding': 'failed',
  'payment_order.refunded':  'failed',
  'payment_order.expired':   'failed',
};

const CHAINRAILS_OUTCOME: Record<string, Outcome> = {
  'intent.funded':    'progress',
  'intent.initiated': 'progress',
  'intent.completed': 'done',
  'intent.refunded':  'failed',
  'intent.expired':   'failed',
};

// ── Worker ──────────────────────────────────────────────────────────────────

const worker = new Worker('weave-webhooks', async (job) => {
  const { source, event, data } = job.data as {
    source: 'chainrails' | 'paycrest';
    event:  string;
    data:   any;
  };

  const externalId = String(
    source === 'chainrails'
      ? (data?.data?.id ?? '')
      : (data?.data?.id ?? data?.id ?? '')
  );
  if (!externalId) return console.error(`[${source}] missing external id`);

  const outcome =
    source === 'paycrest'  ? PAYCREST_OUTCOME[event]  :
    source === 'chainrails' ? CHAINRAILS_OUTCOME[event] :
    undefined;
  if (!outcome) return console.log(`[${source}] unhandled event ${event}`);

  // Idempotency gate.
  const logKey = { source_event_externalId: { source, event, externalId } };
  const existing = await prisma.webhookLog.findUnique({ where: logKey });
  if (existing?.processed) return console.log(`[${source}] ${event} ${externalId} already processed`);

  // Resolve the RouteStep this webhook belongs to, so we can log it against
  // the right Order.
  const step = await prisma.routeStep.findFirst({
    where: { provider: source, externalId },
    select: { orderId: true },
  });
  if (!step) {
    console.error(`[${source}] no RouteStep for ${externalId}`);
    return;
  }

  if (outcome === 'done') {
    const amountOut = source === 'paycrest' ? Number(data?.data?.amount) || undefined : undefined;
    const result = await markStepDone({ provider: source, externalId, amountOut });
    console.log(`[${source}] ${event} ${externalId} → step done, order=${result?.orderStatus}`);
  } else if (outcome === 'failed') {
    const result = await markStepFailed({ provider: source, externalId });
    console.log(`[${source}] ${event} ${externalId} → step failed, order=${result?.orderId}`);
  } else {
    console.log(`[${source}] ${event} ${externalId} → progress`);
  }

  await prisma.webhookLog.upsert({
    where:  logKey,
    create: { orderId: step.orderId, source, event, externalId, payload: data, processed: true },
    update: { processed: true },
  });
}, { connection, concurrency: 5 });

worker.on('failed', (job, err) => {
  console.error(`[queue] job ${job?.id} failed:`, err.message);
});
