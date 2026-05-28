// Programmatic, redirect-style hosted-checkout sessions. Mirrors Stripe
// Checkout Sessions / Paystack initialize: the merchant's backend creates a
// session, redirects the user to the returned `checkoutUrl`, and the user is
// redirected back to `redirectUrl` once the order completes.

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireApiKey } from '../middleware/auth';
import { apiLimiter, linkCreationLimiter } from '../middleware/rate-limit';

const router = Router();

const DEFAULT_EXPIRES_IN_SEC = 2 * 60 * 60; // 2 hours
const MIN_EXPIRES_IN_SEC     = 5 * 60;       // 5 minutes
const MAX_EXPIRES_IN_SEC     = 24 * 60 * 60; // 24 hours

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value) return false;
  try {
    const u = new URL(value);
    if (u.protocol === 'https:') return true;
    if (process.env.NODE_ENV !== 'production' && u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) return true;
    return false;
  } catch {
    return false;
  }
}

function checkoutBaseUrl(): string {
  return (process.env.PAY_BASE_URL || process.env.DASHBOARD_URL || 'http://localhost:3001').replace(/\/$/, '');
}

function serializeSession(s: any) {
  return {
    ...s,
    amount: s.amount != null ? Number(s.amount) : s.amount,
  };
}

// ── POST /sessions — create a checkout session ──────────────────────────────
router.post('/sessions', requireAuth, linkCreationLimiter, async (req, res) => {
  try {
    const {
      amount, amountIn, sourceAsset, destAsset, reference, metadata,
      redirectUrl, cancelUrl, expiresIn,
    } = req.body ?? {};

    if (amount === undefined || amount === null) {
      return res.status(400).json({ success: false, error: 'amount is required' });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ success: false, error: 'amount must be a positive number' });
    }
    if (typeof destAsset !== 'string' || !destAsset) {
      return res.status(400).json({ success: false, error: 'destAsset is required' });
    }
    if (sourceAsset !== undefined && (typeof sourceAsset !== 'string' || !sourceAsset)) {
      return res.status(400).json({ success: false, error: 'sourceAsset must be a non-empty string when provided' });
    }
    if (amountIn !== undefined && amountIn !== 'source' && amountIn !== 'dest') {
      return res.status(400).json({ success: false, error: 'amountIn must be "source" or "dest"' });
    }
    if (!isHttpsUrl(redirectUrl)) {
      return res.status(400).json({ success: false, error: 'redirectUrl must be a valid HTTPS URL' });
    }
    if (cancelUrl !== undefined && cancelUrl !== null && !isHttpsUrl(cancelUrl)) {
      return res.status(400).json({ success: false, error: 'cancelUrl must be a valid HTTPS URL when provided' });
    }
    if (reference !== undefined && reference !== null && (typeof reference !== 'string' || reference.length > 100)) {
      return res.status(400).json({ success: false, error: 'reference must be a string up to 100 chars' });
    }
    if (metadata !== undefined && metadata !== null && (typeof metadata !== 'object' || Array.isArray(metadata))) {
      return res.status(400).json({ success: false, error: 'metadata must be a JSON object' });
    }

    let ttl = DEFAULT_EXPIRES_IN_SEC;
    if (expiresIn !== undefined && expiresIn !== null) {
      const n = Number(expiresIn);
      if (!Number.isFinite(n) || n < MIN_EXPIRES_IN_SEC || n > MAX_EXPIRES_IN_SEC) {
        return res.status(400).json({ success: false, error: `expiresIn must be between ${MIN_EXPIRES_IN_SEC} and ${MAX_EXPIRES_IN_SEC} seconds` });
      }
      ttl = Math.floor(n);
    }

    const session = await prisma.checkoutSession.create({
      data: {
        merchantId: req.merchantId,
        amount: amt,
        amountIn: amountIn ?? 'dest',
        sourceAsset: sourceAsset ?? null,
        destAsset,
        reference: reference ?? null,
        metadata: metadata ?? undefined,
        redirectUrl,
        cancelUrl: cancelUrl ?? null,
        expiresAt: new Date(Date.now() + ttl * 1000),
        status: 'open',
      },
    });

    return res.json({
      success: true,
      data: {
        id: session.id,
        checkoutUrl: `${checkoutBaseUrl()}/checkout/${session.id}`,
        expiresAt: session.expiresAt.toISOString(),
        status: session.status,
      },
    });
  } catch (err: any) {
    console.error('[checkout] create session error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /sessions/:id — retrieve a session (merchant view) ──────────────────
router.get('/sessions/:id', requireAuth, async (req, res) => {
  try {
    const session = await prisma.checkoutSession.findFirst({
      where: { id: req.params.id, merchantId: req.merchantId },
    });
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

    let orderStatus: string | null = null;
    if (session.orderId) {
      const order = await prisma.order.findUnique({ where: { id: session.orderId }, select: { status: true } });
      orderStatus = order?.status ?? null;
    }

    return res.json({ success: true, data: { ...serializeSession(session), orderStatus } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /sessions/public/:id — hosted page reads this (no merchant auth) ────
router.get('/sessions/public/:id', apiLimiter, async (req, res) => {
  try {
    const session = await prisma.checkoutSession.findUnique({
      where: { id: req.params.id },
      include: { merchant: { select: { name: true, publishableKey: true } } },
    });
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

    return res.json({
      success: true,
      data: {
        id: session.id,
        status: session.status,
        amount: Number(session.amount),
        amountIn: session.amountIn,
        sourceAsset: session.sourceAsset,
        destAsset: session.destAsset,
        expiresAt: session.expiresAt.toISOString(),
        redirectUrl: session.redirectUrl,
        cancelUrl: session.cancelUrl,
        merchantName: session.merchant.name,
        publishableKey: session.merchant.publishableKey,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /sessions/link — hosted page binds an order to a session ──────────
// Called from the hosted checkout page with the merchant's publishable key
// after the widget creates an order. Idempotent.
router.patch('/sessions/link', requireApiKey, async (req, res) => {
  try {
    const { sessionId, orderId } = req.body ?? {};
    if (typeof sessionId !== 'string' || !sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }
    if (typeof orderId !== 'string' || !orderId) {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }

    const session = await prisma.checkoutSession.findFirst({
      where: { id: sessionId, merchantId: req.merchantId },
    });
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

    const order = await prisma.order.findFirst({
      where: { id: orderId, merchantId: req.merchantId },
      select: { id: true },
    });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found for this merchant' });

    // Idempotent: same order already linked → ok. Different order → 409.
    if (session.orderId && session.orderId !== orderId) {
      return res.status(409).json({ success: false, error: 'Session already linked to a different order' });
    }
    if (session.orderId === orderId) {
      return res.json({ success: true, data: serializeSession(session) });
    }

    const updated = await prisma.checkoutSession.update({
      where: { id: sessionId },
      data: { orderId, status: session.status === 'open' ? 'processing' : session.status },
    });

    return res.json({ success: true, data: serializeSession(updated) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /sessions/:id/complete — hosted page marks session done ───────────
router.patch('/sessions/:id/complete', requireApiKey, async (req, res) => {
  try {
    const session = await prisma.checkoutSession.findFirst({
      where: { id: req.params.id, merchantId: req.merchantId },
    });
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

    if (session.status === 'complete') {
      return res.json({ success: true, data: serializeSession(session) });
    }
    if (session.status === 'expired') {
      return res.status(409).json({ success: false, error: 'Session is expired' });
    }

    const updated = await prisma.checkoutSession.update({
      where: { id: session.id },
      data: { status: 'complete' },
    });

    return res.json({ success: true, data: serializeSession(updated) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
