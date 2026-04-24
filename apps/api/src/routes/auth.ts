import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { 
  sendWelcomeEmail, 
  sendOtpEmail, 
  sendPasswordResetEmail,
  sendAdminKYBNotification 
} from '../services/email.service';
import { authLimiter } from '../middleware/rate-limit';

const router = Router();

const SESSION_TTL_HOURS = Number(process.env.AUTH_SESSION_TTL_HOURS ?? 24);
const RESET_TTL_MINUTES = Number(process.env.AUTH_RESET_TTL_MINUTES ?? 15);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashCode(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, encoded: string | null | undefined): boolean {
  if (!encoded) return false;
  const [algo, salt, storedHash] = encoded.split('$');
  if (algo !== 'scrypt' || !salt || !storedHash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(storedHash, 'hex');
  const b = Buffer.from(candidate, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function createSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function createOtpCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function generatePublishableKey(): string {
  return 'pk_live_' + crypto.randomBytes(24).toString('hex');
}

function generateSecretKey(): string {
  return 'sk_live_' + crypto.randomBytes(32).toString('hex');
}

function pickPublicMerchant(m: { id: string; email: string; name: string; publishableKey: string; createdAt: Date; updatedAt: Date }) {
  return {
    id:             m.id,
    email:          m.email,
    name:           m.name,
    publishableKey: m.publishableKey,
    createdAt:      m.createdAt,
    updatedAt:      m.updatedAt,
  };
}

async function issueSession(merchantId: string) {
  const token     = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
  const session   = await prisma.session.create({
    data: { merchantId, token, expiresAt },
  });
  return { token: session.token, expiresAt: session.expiresAt };
}

// ── POST /api/v1/auth/signup ─────────────────────────────────────────────────
router.post('/signup', authLimiter, async (req, res) => {
  const email    = normalizeEmail(String(req.body?.email    ?? ''));
  const password = String(req.body?.password ?? '');
  const name     = String(req.body?.name     ?? email.split('@')[0]);

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, error: 'password must be at least 8 characters' });
  }

  try {
    const existing = await prisma.merchant.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'account already exists' });
    }

    const publishableKey = generatePublishableKey();
    const secretKey      = generateSecretKey();
    const hashedSecret   = hashCode(secretKey);

    // Create Merchant + KeyPair in one transaction so signup is atomic.
    const { merchant, session } = await prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.create({
        data: {
          email,
          name,
          kycLevel:      'none',
          passwordHash:  hashPassword(password),
          publishableKey,
        },
      });
      await tx.keyPair.create({
        data: {
          publicKey:      publishableKey,
          hashedSecretKey: hashedSecret,
          merchantId:     merchant.id,
          isActive:       true,
        },
      });
      const token     = createSessionToken();
      const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
      const session   = await tx.session.create({
        data: { merchantId: merchant.id, token, expiresAt },
      });
      return { merchant, session };
    });

    sendWelcomeEmail(email, name).catch(err =>
      console.error('[signup] welcome email error:', err.message),
    );

    return res.json({
      success: true,
      data: {
        merchant: pickPublicMerchant(merchant),
        session:  { token: session.token, expiresAt: session.expiresAt },
        // Secret key is shown exactly once — merchant must store it.
        secretKey,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/v1/auth/login ──────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res) => {
  const email    = normalizeEmail(String(req.body?.email    ?? ''));
  const password = String(req.body?.password ?? '');

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'email and password are required' });
  }

  try {
    const merchant = await prisma.merchant.findUnique({ where: { email } });
    if (!merchant || !verifyPassword(password, merchant.passwordHash)) {
      return res.status(401).json({ success: false, error: 'invalid email or password' });
    }

    const session = await issueSession(merchant.id);
    return res.json({
      success: true,
      data: {
        merchant: pickPublicMerchant(merchant),
        session,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/v1/auth/session ─────────────────────────────────────────────────
router.get('/session', async (req, res) => {
  const token = String(req.headers['x-session-token'] ?? '');
  if (!token) return res.status(401).json({ success: false, error: 'missing x-session-token header' });

  try {
    const session = await prisma.session.findUnique({
      where:   { token },
      include: { merchant: true },
    });
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      return res.status(401).json({ success: false, error: 'invalid or expired session' });
    }
    return res.json({
      success: true,
      data: {
        user:    pickPublicMerchant(session.merchant),  // alias for dashboard compatibility
        session: { token: session.token, expiresAt: session.expiresAt },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/v1/auth/forgot-password ────────────────────────────────────────
router.post('/forgot-password', authLimiter, async (req, res) => {
  const email = normalizeEmail(String(req.body?.email ?? ''));
  if (!email) return res.status(400).json({ success: false, error: 'email is required' });

  try {
    const merchant = await prisma.merchant.findUnique({ where: { email } });
    if (!merchant) {
      // Return success to avoid account enumeration
      return res.json({ success: true, data: { message: 'If that account exists, reset instructions have been sent.' } });
    }

    const otpCode   = createOtpCode();
    const challenge = await prisma.otpChallenge.create({
      data: {
        channel:   'email',
        target:    email,
        purpose:   'password_reset',
        codeHash:  hashCode(otpCode),
        expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
      },
    });

    // Production behavior: Always send email, never leak OTP in response.
    sendPasswordResetEmail(email, otpCode, challenge.id).catch(err =>
      console.error('[forgot-password] email error:', err.message),
    );

    return res.json({
      success: true,
      data: { message: 'Verification instructions have been sent to your email.' },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/v1/auth/reset-password ─────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const resetToken  = String(req.body?.resetToken  ?? '');
  const otpCode     = String(req.body?.otp         ?? '');
  const newPassword = String(req.body?.newPassword ?? '');

  if (!resetToken || !otpCode || !newPassword) {
    return res.status(400).json({ success: false, error: 'resetToken, otp, and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, error: 'newPassword must be at least 8 characters' });
  }

  try {
    const challenge = await prisma.otpChallenge.findUnique({ where: { id: resetToken } });
    if (
      !challenge ||
      challenge.purpose !== 'password_reset' ||
      challenge.consumedAt ||
      challenge.expiresAt.getTime() <= Date.now()
    ) {
      return res.status(400).json({ success: false, error: 'invalid or expired reset token' });
    }
    if (challenge.codeHash !== hashCode(otpCode)) {
      return res.status(400).json({ success: false, error: 'invalid OTP code' });
    }

    const merchant = await prisma.merchant.findUnique({ where: { email: challenge.target } });
    if (!merchant) return res.status(404).json({ success: false, error: 'account not found' });

    const updated = await prisma.$transaction(async (tx) => {
      const m = await tx.merchant.update({
        where: { id: merchant.id },
        data:  { passwordHash: hashPassword(newPassword) },
      });
      await tx.otpChallenge.update({
        where: { id: challenge.id },
        data:  { consumedAt: new Date() },
      });
      // Invalidate all existing sessions for security
      await tx.session.deleteMany({ where: { merchantId: merchant.id } });
      return m;
    });

    const session = await issueSession(updated.id);
    return res.json({
      success: true,
      data: {
        merchant: pickPublicMerchant(updated),
        session,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/v1/auth/logout ─────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  const token = String(req.body?.sessionToken ?? req.headers['x-session-token'] ?? '');
  if (!token) return res.status(400).json({ success: false, error: 'sessionToken is required' });

  try {
    await prisma.session.deleteMany({ where: { token } });
    return res.json({ success: true, data: { loggedOut: true } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
