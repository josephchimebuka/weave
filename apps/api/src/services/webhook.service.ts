import crypto from 'crypto';
import { URL } from 'url';
import { prisma } from '../lib/prisma';

function isSafeWebhookUrl(urlStr: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const h = parsed.hostname.toLowerCase();
  // Block loopback, RFC 1918, link-local, AWS IMDS, and common internal hostnames
  if (h === 'localhost') return false;
  if (/^127\./.test(h)) return false;
  if (/^10\./.test(h)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
  if (/^192\.168\./.test(h)) return false;
  if (/^169\.254\./.test(h)) return false;
  if (h === '::1' || h === '[::1]') return false;
  if (/^fc00:/i.test(h) || /^fe80:/i.test(h)) return false;
  return true;
}

export interface WebhookEvent {
  id:        string;
  type:      'payment.succeeded' | 'payment.failed';
  timestamp: string;
  data:      any;
}

/**
 * Service for dispatching cryptographically signed webhooks to merchant servers.
 */
class WebhookService {
  /**
   * Signs a payload using the merchant's webhook secret.
   * Signature is sent in the 'x-weave-signature' header.
   */
  private sign(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Dispatches an event to a merchant.
   * In production, this should be called through a QStash worker to handle retries.
   */
  async dispatch(merchantId: string, event: WebhookEvent) {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { webhookUrl: true, webhookSecret: true },
    });

    if (!merchant?.webhookUrl || !merchant?.webhookSecret) {
      return; // Merchant hasn't configured webhooks
    }

    if (!isSafeWebhookUrl(merchant.webhookUrl)) {
      console.error(`[webhook] blocked unsafe webhookUrl for merchant ${merchantId}: ${merchant.webhookUrl}`);
      throw new Error('Merchant webhook URL is not a safe public HTTPS address');
    }

    const payload = JSON.stringify(event);
    const signature = this.sign(payload, merchant.webhookSecret);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(merchant.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'X-Weave-Signature': signature,
          'X-Weave-Event':     event.type,
          'User-Agent':        'Weave-Webhook-Dispatcher/1.0',
        },
        body:    payload,
        signal:  controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Merchant webhook responded with ${res.status}`);
      }

      console.log(`[webhook] dispatched ${event.type} to merchant ${merchantId}`);
    } catch (err: any) {
      console.error(`[webhook] failed to dispatch to merchant ${merchantId}:`, err.message);
      // Re-throw so the QStash worker knows to retry
      throw err;
    }
  }

  /**
   * Enqueues an event for background dispatch.
   */
  async enqueue(merchantId: string, orderId: string | undefined, event: WebhookEvent) {
    const { qstash } = await import('../lib/qstash');
    
    // Fallback to local dev host if API_BASE is missing
    const baseUrl = process.env.API_BASE || 'http://localhost:4000/api/v1';

    await qstash.publishJSON({
      url: `${baseUrl}/jobs/dispatch-outgoing`,
      body: {
        merchantId,
        orderId,
        event
      }
    });
  }

  /**
   * Convenience method to trigger a payment.succeeded event.
   */
  async triggerPaymentSucceeded(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { merchant: true },
    });

    if (!order) return;

    const event: WebhookEvent = {
      id:        crypto.randomUUID(),
      type:      'payment.succeeded',
      timestamp: new Date().toISOString(),
      data: {
        id:             order.id,
        reference:      order.reference,
        status:         order.status,
        sourceAsset:    order.sourceAssetKey,
        sourceAmount:   order.sourceAmount,
        destAsset:      order.destAssetKey,
        destAmount:     order.destAmount,
        completedAt:    order.updatedAt,
      }
    };

    return this.enqueue(order.merchantId, order.id, event);
  }
}

export const webhookService = new WebhookService();
