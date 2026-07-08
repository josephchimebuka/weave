import crypto from 'crypto';
import { URL } from 'url';
import { prisma } from '../lib/prisma';

export function isSafeWebhookUrl(urlStr: string): boolean {
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

// How many delivery attempts before a failing webhook is considered terminally
// failed (surfaced as 'failed' rather than 'retrying'). Also shown in the UI.
export const WEBHOOK_MAX_ATTEMPTS = Number(process.env.WEBHOOK_MAX_ATTEMPTS ?? 5);

/**
 * Service for dispatching cryptographically signed webhooks to merchant servers.
 *
 * Every attempt is recorded on a WebhookDelivery row so merchants can inspect
 * delivery history and manually resend from the dashboard.
 *
 * Wire format (matches dashboard /webhook/test endpoint and public docs):
 *   X-Weave-Signature:  sha256=<hex>      // HMAC-SHA256 of `${timestamp}.${rawBody}`
 *   X-Weave-Timestamp:  <epoch seconds>   // Replay protection
 *   X-Weave-Event:      <event type>      // e.g. order.completed
 */
class WebhookService {
  /**
   * Send a single delivery (identified by its WebhookDelivery row) and record
   * the outcome. Re-throws on failure so the QStash worker returns 500 and retries.
   */
  async dispatch(deliveryId: string): Promise<void> {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { merchant: { select: { webhookSecret: true } } },
    });
    if (!delivery) return;

    const secret = delivery.merchant.webhookSecret;
    if (!secret) return; // Nothing to sign with — merchant cleared their config.

    const attempt = delivery.attempts + 1;
    let statusCode: number | null = null;
    let response = '';
    let ok = false;
    let errorReason: string | null = null;

    if (!isSafeWebhookUrl(delivery.url)) {
      errorReason = 'blocked: webhook URL is not a safe public HTTPS address';
    } else {
      const body = JSON.stringify(delivery.payload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const sig = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');

      // Cold-starting serverless endpoints can take >10s to first-respond.
      const TIMEOUT_MS = Number(process.env.WEBHOOK_DISPATCH_TIMEOUT_MS ?? 20000);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(delivery.url, {
          method: 'POST',
          headers: {
            'Content-Type':      'application/json',
            'X-Weave-Signature': `sha256=${sig}`,
            'X-Weave-Timestamp': timestamp,
            'X-Weave-Event':     delivery.event,
            'User-Agent':        'Weave-Webhook-Dispatcher/1.0',
          },
          body,
          signal: controller.signal,
        });
        statusCode = res.status;
        response = (await res.text().catch(() => '')).slice(0, 4000);
        ok = res.ok;
        if (!ok) errorReason = `merchant endpoint responded ${res.status}`;
      } catch (err: any) {
        // Normalize undici's opaque "This operation was aborted" into something readable.
        const isAbort = err?.name === 'AbortError' || /abort/i.test(err?.message ?? '');
        errorReason = isAbort
          ? `merchant endpoint did not respond within ${TIMEOUT_MS}ms`
          : (err?.message ?? 'request failed');
      } finally {
        clearTimeout(timeoutId);
      }
    }

    const status = ok ? 'success' : (attempt >= WEBHOOK_MAX_ATTEMPTS ? 'failed' : 'retrying');
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { attempts: attempt, statusCode, response: response || errorReason || null, status },
    });

    if (!ok) {
      console.error(`[webhook] delivery ${deliveryId} → merchant ${delivery.merchantId} failed (attempt ${attempt}): ${errorReason}`);
      throw new Error(errorReason || 'webhook delivery failed');
    }
    console.log(`[webhook] delivered ${delivery.event} → merchant ${delivery.merchantId} (delivery ${deliveryId}, attempt ${attempt})`);
  }

  /**
   * Create a WebhookDelivery row for `event` and enqueue its first attempt.
   * Returns the delivery id, or null when the merchant has no endpoint configured.
   */
  async enqueue(merchantId: string, orderId: string | undefined, event: WebhookEvent): Promise<string | null> {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { webhookUrl: true, webhookSecret: true },
    });
    if (!merchant?.webhookUrl || !merchant?.webhookSecret) return null;

    const delivery = await prisma.webhookDelivery.create({
      data: {
        merchantId,
        orderId: orderId ?? null,
        event:   event.event,
        url:     merchant.webhookUrl,
        payload: event as any,
        status:  'retrying',
        attempts: 0,
      },
    });

    await this.enqueueDelivery(delivery.id);
    return delivery.id;
  }

  /** Publish a delivery id to the QStash dispatch job. */
  private async enqueueDelivery(deliveryId: string): Promise<void> {
    const { qstash } = await import('../lib/qstash');
    const baseUrl = process.env.API_BASE || 'http://localhost:4000/api/v1';
    try {
      await qstash.publishJSON({
        url:  `${baseUrl}/jobs/dispatch-outgoing`,
        body: { deliveryId },
      });
    } catch (err: any) {
      console.error(`[webhook] failed to enqueue delivery ${deliveryId}:`, err.message);
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data:  { status: 'failed', response: `enqueue failed: ${err.message}` },
      }).catch(() => {});
    }
  }

  /**
   * Manually re-send an existing delivery. Runs inline so the dashboard gets the
   * fresh outcome immediately. Scoped to the owning merchant. Returns the updated
   * delivery row, or null if not found for this merchant.
   */
  async resend(deliveryId: string, merchantId: string) {
    const original = await prisma.webhookDelivery.findFirst({
      where:  { id: deliveryId, merchantId },
      select: { event: true, orderId: true, payload: true },
    });
    if (!original) return null;

    // Resend goes to the merchant's CURRENT endpoint (where they're configured to
    // receive now), not the possibly-stale URL of the original attempt.
    const merchant = await prisma.merchant.findUnique({
      where:  { id: merchantId },
      select: { webhookUrl: true },
    });
    if (!merchant?.webhookUrl) return 'no_endpoint' as const;

    // Each resend is its OWN delivery row, so the history preserves the original
    // attempt and shows every resend as a separate, newest-first entry.
    const resent = await prisma.webhookDelivery.create({
      data: {
        merchantId,
        orderId:  original.orderId,
        event:    original.event,
        url:      merchant.webhookUrl,
        payload:  original.payload as any,
        status:   'retrying',
        attempts: 0,
      },
    });

    try {
      await this.dispatch(resent.id);
    } catch {
      // A manual resend is a one-shot (no QStash auto-retry chain), so a failure
      // is terminal — normalize 'retrying' → 'failed' so the row isn't misleading.
      await prisma.webhookDelivery.updateMany({
        where: { id: resent.id, status: 'retrying' },
        data:  { status: 'failed' },
      });
    }
    return prisma.webhookDelivery.findUnique({ where: { id: resent.id } });
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
