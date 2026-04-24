"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outgoingWebhookWorker = exports.outgoingWebhookQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../lib/redis");
const webhook_service_1 = require("../services/webhook.service");
const prisma_1 = require("../lib/prisma");
const QUEUE_NAME = 'outgoing_webhooks';
/**
 * BullMQ Queue for handling outgoing merchant webhooks.
 * Includes automatic retry logic with exponential backoff.
 */
exports.outgoingWebhookQueue = new bullmq_1.Queue(QUEUE_NAME, {
    connection: redis_1.redis,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 5000, // 5s, 10s, 20s, 40s, 1.2m
        },
        removeOnComplete: true,
    }
});
/**
 * Worker process for the outgoing webhook queue.
 */
exports.outgoingWebhookWorker = new bullmq_1.Worker(QUEUE_NAME, async (job) => {
    const { merchantId, orderId, event } = job.data;
    console.log(`[webhook-worker] dispatching ${event.type} for merchant ${merchantId} (attempt ${job.attemptsMade + 1})`);
    try {
        // 1. Get merchant to find target URL
        const merchant = await prisma_1.prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { webhookUrl: true },
        });
        if (!merchant?.webhookUrl) {
            console.warn(`[webhook-worker] skipping merchant ${merchantId}: no webhookUrl configured`);
            return;
        }
        // 2. Perform the actual HTTP call
        await webhook_service_1.webhookService.dispatch(merchantId, event);
        // 3. Log success
        await prisma_1.prisma.webhookDelivery.create({
            data: {
                merchantId,
                orderId,
                event: event.type,
                url: merchant.webhookUrl,
                payload: event,
                status: 'success',
                statusCode: 200,
                attempts: job.attemptsMade + 1,
            }
        });
    }
    catch (err) {
        // 4. Log failure (even if we are going to retry)
        const merchant = await prisma_1.prisma.merchant.findUnique({ where: { id: merchantId }, select: { webhookUrl: true } });
        await prisma_1.prisma.webhookDelivery.create({
            data: {
                merchantId,
                orderId,
                event: event.type,
                url: merchant?.webhookUrl || 'unknown',
                payload: event,
                status: job.attemptsMade >= 4 ? 'failed' : 'retrying',
                statusCode: err.response?.status || 500,
                response: err.message,
                attempts: job.attemptsMade + 1,
            }
        });
        // Re-throw so BullMQ triggers the retry
        throw err;
    }
}, { connection: redis_1.redis });
exports.outgoingWebhookWorker.on('failed', (job, err) => {
    console.error(`[webhook-worker] job ${job?.id} failed ultimately:`, err.message);
});
