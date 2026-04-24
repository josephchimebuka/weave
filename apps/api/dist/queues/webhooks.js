"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookQueue = void 0;
const bullmq_1 = require("bullmq");
const prisma_1 = require("../lib/prisma");
const executor_service_1 = require("../services/executor.service");
const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
};
exports.webhookQueue = new bullmq_1.Queue('weave-webhooks', {
    connection,
    defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
    },
});
const PAYCREST_OUTCOME = {
    'payment_order.deposited': 'progress',
    'payment_order.pending': 'progress',
    'payment_order.validated': 'progress',
    'payment_order.settling': 'progress',
    'payment_order.settled': 'done',
    'payment_order.refunding': 'failed',
    'payment_order.refunded': 'failed',
    'payment_order.expired': 'failed',
};
const CHAINRAILS_OUTCOME = {
    'intent.funded': 'progress',
    'intent.initiated': 'progress',
    'intent.completed': 'done',
    'intent.refunded': 'failed',
    'intent.expired': 'failed',
};
// ── Worker ──────────────────────────────────────────────────────────────────
const worker = new bullmq_1.Worker('weave-webhooks', async (job) => {
    const { source, event, data } = job.data;
    const externalId = String(source === 'chainrails'
        ? (data?.data?.id ?? '')
        : (data?.data?.id ?? data?.id ?? ''));
    if (!externalId)
        return console.error(`[${source}] missing external id`);
    const outcome = source === 'paycrest' ? PAYCREST_OUTCOME[event] :
        source === 'chainrails' ? CHAINRAILS_OUTCOME[event] :
            undefined;
    if (!outcome)
        return console.log(`[${source}] unhandled event ${event}`);
    // Idempotency gate.
    const logKey = { source_event_externalId: { source, event, externalId } };
    const existing = await prisma_1.prisma.webhookLog.findUnique({ where: logKey });
    if (existing?.processed)
        return console.log(`[${source}] ${event} ${externalId} already processed`);
    // Resolve the RouteStep this webhook belongs to, so we can log it against
    // the right Order.
    const step = await prisma_1.prisma.routeStep.findFirst({
        where: { provider: source, externalId },
        select: { orderId: true },
    });
    if (!step) {
        console.error(`[${source}] no RouteStep for ${externalId}`);
        return;
    }
    if (outcome === 'done') {
        const amountOut = source === 'paycrest' ? Number(data?.data?.amount) || undefined : undefined;
        const result = await (0, executor_service_1.markStepDone)({ provider: source, externalId, amountOut });
        console.log(`[${source}] ${event} ${externalId} → step done, order=${result?.orderStatus}`);
    }
    else if (outcome === 'failed') {
        const result = await (0, executor_service_1.markStepFailed)({ provider: source, externalId });
        console.log(`[${source}] ${event} ${externalId} → step failed, order=${result?.orderId}`);
    }
    else {
        console.log(`[${source}] ${event} ${externalId} → progress`);
    }
    await prisma_1.prisma.webhookLog.upsert({
        where: logKey,
        create: { orderId: step.orderId, source, event, externalId, payload: data, processed: true },
        update: { processed: true },
    });
}, { connection, concurrency: 5 });
worker.on('failed', (job, err) => {
    console.error(`[queue] job ${job?.id} failed:`, err.message);
});
