"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.nearPollerQueue = void 0;
exports.stopNearPoller = stopNearPoller;
const bullmq_1 = require("bullmq");
const prisma_1 = require("../lib/prisma");
const nearintents_service_1 = require("../services/nearintents.service");
const executor_service_1 = require("../services/executor.service");
const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
};
const QUEUE_NAME = 'weave-nearintents-poll';
const POLL_INTERVAL_MS = Number(process.env.NEAR_POLL_INTERVAL_MS ?? 15_000);
const PER_STEP_DELAY_MS = 2_000; // stagger between per-step polls inside one tick
exports.nearPollerQueue = new bullmq_1.Queue(QUEUE_NAME, { connection });
// Repeatable tick job. BullMQ dedupes by the jobId we pass, so restarts don't
// fan out duplicate schedulers.
async function scheduleTick() {
    await exports.nearPollerQueue.add('tick', {}, {
        repeat: { every: POLL_INTERVAL_MS },
        jobId: 'weave-nearintents-tick',
        removeOnComplete: true,
        removeOnFail: true,
    });
}
// ── Worker ──────────────────────────────────────────────────────────────────
const worker = new bullmq_1.Worker(QUEUE_NAME, async () => {
    const openSteps = await prisma_1.prisma.routeStep.findMany({
        where: {
            provider: 'nearintents',
            status: { notIn: ['done', 'failed'] },
            depositAddress: { not: null },
        },
        orderBy: { updatedAt: 'asc' }, // oldest first so nothing starves
        take: 10, // cap the tick's work so we don't blow the rate limit
    });
    for (let i = 0; i < openSteps.length; i++) {
        const step = openSteps[i];
        if (i > 0)
            await sleep(PER_STEP_DELAY_MS);
        try {
            await pollOne(step);
        }
        catch (err) {
            console.warn(`[nearpoll] ${step.id} ${step.depositAddress}: ${err.message}`);
        }
    }
}, { connection });
worker.on('failed', (job, err) => {
    console.error(`[nearpoll] job ${job?.id} failed:`, err.message);
});
// Boot the scheduler once when this module is first imported (index.ts does it).
scheduleTick().catch(err => console.error('[nearpoll] schedule failed:', err));
// ── Core poll ───────────────────────────────────────────────────────────────
async function pollOne(step) {
    if (!step.depositAddress)
        return;
    const status = await nearintents_service_1.nearIntents.getStatus(step.depositAddress, step.depositMemo ?? undefined);
    const outcome = (0, nearintents_service_1.classifyNearStatus)(status.status);
    if (outcome === 'done') {
        const amountOut = Number(status.swapDetails?.amountOutFormatted) || undefined;
        await (0, executor_service_1.markStepDone)({ provider: 'nearintents', externalId: step.depositAddress, amountOut });
        console.log(`[nearpoll] ${step.depositAddress} → SUCCESS`);
    }
    else if (outcome === 'failed' || outcome === 'refunded') {
        await (0, executor_service_1.markStepFailed)({ provider: 'nearintents', externalId: step.depositAddress, isRefund: outcome === 'refunded' });
        console.log(`[nearpoll] ${step.depositAddress} → ${status.status}`);
    }
    else if (step.status === 'awaiting_deposit' && status.status === 'KNOWN_DEPOSIT_TX') {
        // Promote to in_flight so the dashboard/widget reflect that funds landed.
        await prisma_1.prisma.routeStep.update({
            where: { id: step.id },
            data: { status: 'in_flight' },
        });
    }
}
// ── Utility ─────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
// Expose a cleanup hook for tests; not used in production.
async function stopNearPoller() {
    await worker.close();
    await exports.nearPollerQueue.close();
}
