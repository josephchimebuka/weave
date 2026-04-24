import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { webhookService, type WebhookEvent } from '../services/webhook.service';
import { prisma } from '../lib/prisma';

const QUEUE_NAME = 'outgoing_webhooks';

/**
 * BullMQ Queue for handling outgoing merchant webhooks.
 * Includes automatic retry logic with exponential backoff.
 */
export const outgoingWebhookQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type:    'exponential',
      delay:   5000, // 5s, 10s, 20s, 40s, 1.2m
    },
    removeOnComplete: true,
  }
});

interface WebhookJobData {
  merchantId: string;
  orderId?:    string;
  event:      WebhookEvent;
}

/**
 * Worker process for the outgoing webhook queue.
 */
export const outgoingWebhookWorker = new Worker(
  QUEUE_NAME,
  async (job: Job<WebhookJobData>) => {
    const { merchantId, orderId, event } = job.data;

    console.log(`[webhook-worker] dispatching ${event.type} for merchant ${merchantId} (attempt ${job.attemptsMade + 1})`);

    try {
      // 1. Get merchant to find target URL
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { webhookUrl: true },
      });

      if (!merchant?.webhookUrl) {
         console.warn(`[webhook-worker] skipping merchant ${merchantId}: no webhookUrl configured`);
         return;
      }

      // 2. Perform the actual HTTP call
      await webhookService.dispatch(merchantId, event);

      // 3. Log success
      await prisma.webhookDelivery.create({
        data: {
          merchantId,
          orderId,
          event:      event.type,
          url:        merchant.webhookUrl,
          payload:    event as any,
          status:     'success',
          statusCode: 200,
          attempts:   job.attemptsMade + 1,
        }
      });

    } catch (err: any) {
      // 4. Log failure (even if we are going to retry)
      const merchant = await prisma.merchant.findUnique({ where: { id: merchantId }, select: { webhookUrl: true } });
      
      await prisma.webhookDelivery.create({
        data: {
          merchantId,
          orderId,
          event:      event.type,
          url:        merchant?.webhookUrl || 'unknown',
          payload:    event as any,
          status:     job.attemptsMade >= 4 ? 'failed' : 'retrying',
          statusCode: err.response?.status || 500,
          response:   err.message,
          attempts:   job.attemptsMade + 1,
        }
      });

      // Re-throw so BullMQ triggers the retry
      throw err;
    }
  },
  { connection: redis }
);

outgoingWebhookWorker.on('failed', (job, err) => {
  console.error(`[webhook-worker] job ${job?.id} failed ultimately:`, err.message);
});
