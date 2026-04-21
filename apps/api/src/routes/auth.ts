import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';

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

function pickPublicUser(user: { id: string; email: string | null; createdAt: Date; updatedAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function issueSession(userId: string) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
  const session = await prisma.session.create({
    data: { userId, token, expiresAt },
  });
  return { token: session.token, expiresAt: session.expiresAt };
}

// POST /api/v1/auth/signup
router.post('/signup', async (req, res) => {
  const email = normalizeEmail(String(req.body?.email ?? ''));
  const password = String(req.body?.password ?? '');

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, error: 'password must be at least 8 characters' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'account already exists' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        kycLevel: 'none',
        passwordHash: hashPassword(password),
      },
    });
    const session = await issueSession(user.id);

    return res.json({
      success: true,
      data: {
        user: pickPublicUser(user),
        session,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  const email = normalizeEmail(String(req.body?.email ?? ''));
  const password = String(req.body?.password ?? '');

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ success: false, error: 'invalid email or password' });
    }

    const session = await issueSession(user.id);
    return res.json({
      success: true,
      data: {
        user: pickPublicUser(user),
        session,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/auth/session
router.get('/session', async (req, res) => {
  const token = String(req.headers['x-session-token'] ?? '');
  if (!token) return res.status(401).json({ success: false, error: 'missing x-session-token header' });

  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      return res.status(401).json({ success: false, error: 'invalid or expired session' });
    }
    return res.json({
      success: true,
      data: {
        user: pickPublicUser(session.user),
        session: { token: session.token, expiresAt: session.expiresAt },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const email = normalizeEmail(String(req.body?.email ?? ''));
  if (!email) return res.status(400).json({ success: false, error: 'email is required' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json({ success: true, data: { message: 'If the account exists, reset instructions have been generated.' } });
    }

    const otpCode = createOtpCode();
    const challenge = await prisma.otpChallenge.create({
      data: {
        channel: 'email',
        target: email,
        purpose: 'password_reset',
        codeHash: hashCode(otpCode),
        expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
      },
    });

    return res.json({
      success: true,
      data: {
        message: 'Reset instructions generated. Use the challenge id and OTP code to reset in non-production environments.',
        resetToken: challenge.id,
        otpCode: process.env.NODE_ENV === 'production' ? undefined : otpCode,
        expiresAt: challenge.expiresAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const resetToken = String(req.body?.resetToken ?? '');
  const otpCode = String(req.body?.otp ?? '');
  const newPassword = String(req.body?.newPassword ?? '');
  if (!resetToken || !otpCode || !newPassword) {
    return res.status(400).json({ success: false, error: 'resetToken, otp, and newPassword are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, error: 'newPassword must be at least 8 characters' });
  }

  try {
    const challenge = await prisma.otpChallenge.findUnique({ where: { id: resetToken } });
    if (!challenge || challenge.purpose !== 'password_reset' || challenge.consumedAt || challenge.expiresAt.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, error: 'invalid or expired reset token' });
    }
    if (challenge.codeHash !== hashCode(otpCode)) {
      return res.status(400).json({ success: false, error: 'invalid otp code' });
    }

    const user = await prisma.user.findUnique({ where: { email: challenge.target } });
    if (!user) return res.status(404).json({ success: false, error: 'account not found' });

    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(newPassword) },
      });
      await tx.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });
      await tx.session.deleteMany({ where: { userId: user.id } });
      return u;
    });

    const session = await issueSession(updatedUser.id);
    return res.json({
      success: true,
      data: {
        user: pickPublicUser(updatedUser),
        session,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/auth/logout
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
