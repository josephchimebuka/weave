import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import type { Merchant } from '@prisma/client';
import { prisma } from '../lib/prisma';

declare global {
  namespace Express {
    interface Request {
      merchantId: string;
      sandboxMode: boolean;
      // Set only when the auth strategy already loaded the full Merchant row
      // (API key, session) — route handlers can reuse it to skip a redundant
      // re-fetch. Not set for secret-key auth, which only loads a KeyPair.
      merchant?: Merchant;
    }
  }
}

// ── API Key (publishable key) ────────────────────────────────────────────────
// Used by the browser widget. Looks up Merchant.publishableKey.
// Safe to expose in frontend JS — scoped to creating/reading own orders.
export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = (req.headers['x-api-key'] as string | undefined)?.trim();
  if (!key) {
    return res.status(401).json({ success: false, error: 'Missing x-api-key header' });
  }

  try {
    const liveMerchant = await prisma.merchant.findUnique({ where: { publishableKey: key } });
    if (liveMerchant) {
      req.merchantId = liveMerchant.id;
      req.sandboxMode = false;
      req.merchant = liveMerchant;
      return next();
    }

    const sandboxMerchant = await prisma.merchant.findFirst({ where: { sandboxPublishableKey: key } });
    if (sandboxMerchant) {
      req.merchantId = sandboxMerchant.id;
      req.sandboxMode = true;
      req.merchant = sandboxMerchant;
      return next();
    }

    return res.status(401).json({ success: false, error: 'Invalid API key' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Auth service error' });
  }
}

// ── KeyPair (secret key) ─────────────────────────────────────────────────────
// Used by server-to-server integrations: merchant's own backend → Weave API.
// x-secret-key: sk_live_... / sk_test_...  (the credential; never stored plaintext)
// x-public-key: pk_live_... / pk_test_...  (OPTIONAL — when sent, must match the
//               resolved pair; useful for AWS-style key-id/secret conventions)
// The secret key alone identifies the pair: its sha256 hash is a deterministic,
// indexed lookup, so no public key is required to authenticate (Stripe-style DX).
// A sandbox pair (isSandbox=true) puts the request in sandbox mode, so backend/SDK
// integrations can drive checkout sessions and orders end-to-end against sandbox.
export async function requireKeyPair(req: Request, res: Response, next: NextFunction) {
  const publicKey = (req.headers['x-public-key'] as string | undefined)?.trim();
  const secretKey = (req.headers['x-secret-key'] as string | undefined)?.trim();

  if (!secretKey) {
    return res.status(401).json({
      success: false,
      error: 'Missing x-secret-key header',
    });
  }

  try {
    // Match on the hash, not the plaintext: sha256 is preimage-resistant, so a
    // direct equality lookup on the stored hash is safe (no timing side-channel
    // on the secret itself — the attacker only controls the preimage).
    const hashedSecretKey = crypto.createHash('sha256').update(secretKey).digest('hex');
    const keyPair = await prisma.keyPair.findFirst({
      where: { hashedSecretKey, isActive: true },
    });
    if (!keyPair) {
      return res.status(401).json({ success: false, error: 'Invalid secret key' });
    }

    // If a public key was supplied, it must belong to this pair — guards against
    // accidentally mixing a live public key with a sandbox secret, or vice-versa.
    if (publicKey && publicKey !== keyPair.publicKey) {
      return res.status(401).json({ success: false, error: 'Public key does not match secret key' });
    }

    req.merchantId = keyPair.merchantId;
    req.sandboxMode = keyPair.isSandbox;
    return next();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Auth service error' });
  }
}

// ── Session (dashboard) ──────────────────────────────────────────────────────
// Used by the dashboard UI. Session token issued at login.
export async function requireSession(req: Request, res: Response, next: NextFunction) {
  const token = (req.headers['x-session-token'] as string | undefined)?.trim();
  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing x-session-token header' });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { merchant: true },
    });

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' });
    }

    req.merchantId = session.merchantId;
    req.sandboxMode = false;
    req.merchant = session.merchant;
    return next();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Auth service error' });
  }
}

// ── Combined auth ────────────────────────────────────────────────────────────
// Tries: publishable API key → server secret key → session token.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey      = req.headers['x-api-key'] as string | undefined;
  const sessionToken = req.headers['x-session-token'] as string | undefined;
  const secretKey   = req.headers['x-secret-key'] as string | undefined;

  if (apiKey) return requireApiKey(req, res, next);
  // The secret key stands alone — the public key is optional (see requireKeyPair).
  if (secretKey) return requireKeyPair(req, res, next);
  if (sessionToken) return requireSession(req, res, next);

  return res.status(401).json({
    success: false,
    error: 'Authentication required (x-api-key, x-secret-key, or x-session-token)',
  });
}
