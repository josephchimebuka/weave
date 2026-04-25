// NEAR Intents has no webhooks — state is pull-only via GET /v0/status. This
// worker ticks every POLL_INTERVAL_MS, scans open RouteSteps with provider
// 'nearintents', and polls each status. Terminal states drive step/order
// transitions via markStepDone / markStepFailed (the same helpers the webhook
// worker uses) so the downstream rollup logic stays in one place.
//
// Rate limit: 1Click allows ~1 request / 5s per partner JWT, so we stagger
// polls inside a tick rather than fire them in parallel. At the default 15s
// tick with ~2s per step, we can service ~7 open NEAR steps per cycle before
// a step waits a full cycle for its turn. Fine for MVP; if we outgrow it,
// switch to per-step delayed jobs with exponential backoff.

import { Queue, Worker } from 'bullmq';
import { prisma } from '../lib/prisma';
import { nearIntents, classifyNearStatus } from '../services/nearintents.service';
import { markStepDone, markStepFailed } from '../services/executor.service';
import { redis } from '../lib/redis';

const QUEUE_NAME       = 'weave-nearintents-poll';
const POLL_INTERVAL_MS = Number(process.env.NEAR_POLL_INTERVAL_MS ?? 15_000);
const PER_STEP_DELAY_MS = 2_000;  // stagger between per-step polls inside one tick

export const nearPollerQueue = new Queue(QUEUE_NAME, { connection: redis });

// Repeatable tick job. BullMQ dedupes by the jobId we pass, so restarts don't
// fan out duplicate schedulers.
async function scheduleTick() {
  await nearPollerQueue.add(
    'tick',
    {},
    {
      repeat:       { every: POLL_INTERVAL_MS },
      jobId:        'weave-nearintents-tick',
      removeOnComplete: true,
      removeOnFail:     true,
    },
  );
}

// ── Worker ──────────────────────────────────────────────────────────────────

const worker = new Worker(QUEUE_NAME, async () => {
  const openSteps = await prisma.routeStep.findMany({
    where: {
      provider: 'nearintents',
      status:   { notIn: ['done', 'failed'] },
      depositAddress: { not: null },
    },
    orderBy: { updatedAt: 'asc' },  // oldest first so nothing starves
    take:    10,                    // cap the tick's work so we don't blow the rate limit
  });

  for (let i = 0; i < openSteps.length; i++) {
    const step = openSteps[i];
    if (i > 0) await sleep(PER_STEP_DELAY_MS);
    try {
      await pollOne(step);
    } catch (err: any) {
      console.warn(`[nearpoll] ${step.id} ${step.depositAddress}: ${err.message}`);
    }
  }
}, { connection: redis });

worker.on('failed', (job, err) => {
  console.error(`[nearpoll] job ${job?.id} failed:`, err.message);
});

// Boot the scheduler once when this module is first imported (index.ts does it).
scheduleTick().catch(err => console.error('[nearpoll] schedule failed:', err));

// ── Core poll ───────────────────────────────────────────────────────────────

async function pollOne(step: {
  id: string; depositAddress: string | null; depositMemo: string | null; externalId: string | null; status: string;
}) {
  if (!step.depositAddress) return;

  const status = await nearIntents.getStatus(step.depositAddress, step.depositMemo ?? undefined);
  const outcome = classifyNearStatus(status.status);

  if (outcome === 'done') {
    const amountOut = Number(status.swapDetails?.amountOutFormatted) || undefined;
    await markStepDone({ provider: 'nearintents', externalId: step.depositAddress, amountOut });
    console.log(`[nearpoll] ${step.depositAddress} → SUCCESS`);
  } else if (outcome === 'failed' || outcome === 'refunded') {
    await markStepFailed({ provider: 'nearintents', externalId: step.depositAddress, isRefund: outcome === 'refunded' });
    console.log(`[nearpoll] ${step.depositAddress} → ${status.status}`);
  } else if (step.status === 'awaiting_deposit' && status.status === 'KNOWN_DEPOSIT_TX') {
    // Promote to in_flight so the dashboard/widget reflect that funds landed.
    await prisma.routeStep.update({
      where: { id: step.id },
      data:  { status: 'in_flight' },
    });
  }
}

// ── Utility ─────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// Expose a cleanup hook for tests; not used in production.
export async function stopNearPoller() {
  await worker.close();
  await nearPollerQueue.close();
}
