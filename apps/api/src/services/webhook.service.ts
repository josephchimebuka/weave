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

export type WebhookEventType =
  | 'order.completed'
  | 'order.failed'
  | 'order.processing'
  | 'order.created';

export interface WebhookEvent {
  event: WebhookEventType;
  data: {
    id: string;
    reference?: string | null;
    status: string;
    sourceAssetKey: string;
    destAssetKey: string;
    sourceAmount: number;
    destAmount: number | null;
    createdAt: string;
    // Set only when the order was initiated via a hosted CheckoutSession.
    sessionId?: string;
    metadata?: unknown;
    // Merchant-supplied payer identity passthrough. Never verified by Weave.
    customer?: { email?: string; name?: string; externalId?: string } | null;
  };
}

/**
 * Service for dispatching cryptographically signed webhooks to merchant servers.
 *
 * Wire format (matches dashboard /webhook/test endpoint and public docs):
 *   X-Weave-Signature:  sha256=<hex>      // HMAC-SHA256 of `${timestamp}.${rawBody}`
 *   X-Weave-Timestamp:  <epoch seconds>   // Replay protection
 *   X-Weave-Event:      <event type>      // e.g. order.completed
 */
class WebhookService {
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

    const body = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sig = crypto
      .createHmac('sha256', merchant.webhookSecret)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    // Cold-starting serverless endpoints can take >10s to first-respond, so keep
    // this generous. Delivery isn't lost on timeout — we re-throw and QStash retries.
    const TIMEOUT_MS = Number(process.env.WEBHOOK_DISPATCH_TIMEOUT_MS ?? 20000);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(merchant.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'X-Weave-Signature': `sha256=${sig}`,
          'X-Weave-Timestamp': timestamp,
          'X-Weave-Event':     event.event,
          'User-Agent':        'Weave-Webhook-Dispatcher/1.0',
        },
        body,
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Merchant webhook responded with ${res.status}`);
      }

      console.log(`[webhook] dispatched ${event.event} to merchant ${merchantId}`);
    } catch (err: any) {
      // Normalize undici's opaque "This operation was aborted" into an actionable
      // reason so the logs say what actually happened. QStash retries on the throw.
      const isAbort = err?.name === 'AbortError' || /abort/i.test(err?.message ?? '');
      const reason = isAbort
        ? `merchant endpoint did not respond within ${TIMEOUT_MS}ms`
        : err.message;
      console.error(`[webhook] failed to dispatch to merchant ${merchantId}: ${reason}`);
      throw new Error(reason);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async enqueue(merchantId: string, orderId: string | undefined, event: WebhookEvent) {
    const { qstash } = await import('../lib/qstash');
    const baseUrl = process.env.API_BASE || 'http://localhost:4000/api/v1';

    await qstash.publishJSON({
      url: `${baseUrl}/jobs/dispatch-outgoing`,
      body: { merchantId, orderId, event },
    });
  }

  private async buildEvent(orderId: string, eventType: WebhookEventType): Promise<{ merchantId: string; event: WebhookEvent } | null> {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return null;

    // Echo session context when the order originated from a hosted checkout.
    const session = await prisma.checkoutSession.findFirst({
      where: { orderId: order.id },
      select: { id: true, metadata: true },
    });

    return {
      merchantId: order.merchantId,
      event: {
        event: eventType,
        data: {
          id:             order.id,
          reference:      order.reference,
          status:         order.status,
          sourceAssetKey: order.sourceAssetKey,
          destAssetKey:   order.destAssetKey,
          sourceAmount:   Number(order.sourceAmount),
          destAmount:     order.destAmount == null ? null : Number(order.destAmount),
          createdAt:      order.createdAt.toISOString(),
          ...(order.customer ? { customer: order.customer as any } : {}),
          ...(session ? { sessionId: session.id, metadata: session.metadata ?? null } : {}),
        },
      },
    };
  }

  async triggerOrderCompleted(orderId: string) {
    const built = await this.buildEvent(orderId, 'order.completed');
    if (!built) return;
    return this.enqueue(built.merchantId, orderId, built.event);
  }

  async triggerOrderFailed(orderId: string) {
    const built = await this.buildEvent(orderId, 'order.failed');
    if (!built) return;
    return this.enqueue(built.merchantId, orderId, built.event);
  }

  /** @deprecated use triggerOrderCompleted */
  async triggerPaymentSucceeded(orderId: string) {
    return this.triggerOrderCompleted(orderId);
  }
}

export const webhookService = new WebhookService();
