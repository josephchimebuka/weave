import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';

declare global {
  namespace Express {
    interface Request {
      merchantId: string;
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
    const merchant = await prisma.merchant.findUnique({ where: { publishableKey: key } });
    if (!merchant) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }
    req.merchantId = merchant.id;
    return next();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Auth service error' });
  }
}

// ── KeyPair (secret key) ─────────────────────────────────────────────────────
// Used by server-to-server integrations: merchant's own backend → Weave API.
// x-public-key: pk_live_...  (identifies the key pair)
// x-secret-key: sk_live_...  (never stored plaintext; compared via hash)
export async function requireKeyPair(req: Request, res: Response, next: NextFunction) {
  const publicKey = (req.headers['x-public-key'] as string | undefined)?.trim();
  const secretKey = (req.headers['x-secret-key'] as string | undefined)?.trim();

  if (!publicKey || !secretKey) {
    return res.status(401).json({
      success: false,
      error: 'Missing x-public-key and/or x-secret-key headers',
    });
  }

  try {
    const keyPair = await prisma.keyPair.findFirst({
      where: { publicKey, isActive: true },
    });
    if (!keyPair) {
      return res.status(401).json({ success: false, error: 'Invalid public key' });
    }

    const hashedSecretKey = crypto.createHash('sha256').update(secretKey).digest('hex');
    if (!crypto.timingSafeEqual(
      Buffer.from(keyPair.hashedSecretKey, 'hex'),
      Buffer.from(hashedSecretKey, 'hex'),
    )) {
      return res.status(401).json({ success: false, error: 'Invalid secret key' });
    }

    req.merchantId = keyPair.merchantId;
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
    return next();
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Auth service error' });
  }
}

// ── Combined auth ────────────────────────────────────────────────────────────
// Tries: publishable API key → server keypair → session token.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey      = req.headers['x-api-key'] as string | undefined;
  const sessionToken = req.headers['x-session-token'] as string | undefined;
  const publicKey   = req.headers['x-public-key'] as string | undefined;
  const secretKey   = req.headers['x-secret-key'] as string | undefined;

  if (apiKey) return requireApiKey(req, res, next);
  if (publicKey && secretKey) return requireKeyPair(req, res, next);
  if (sessionToken) return requireSession(req, res, next);

  return res.status(401).json({
    success: false,
    error: 'Authentication required (x-api-key, x-public-key/x-secret-key, or x-session-token)',
  });
}
