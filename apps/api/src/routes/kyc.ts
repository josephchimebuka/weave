import crypto from 'crypto';
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/serverless-redis';
import { requireSession } from '../middleware/auth';
import { authLimiter } from '../middleware/rate-limit';
import { sendEmailVerificationEmail } from '../services/email.service';
import { recordMerchantAudit } from '../services/audit.service';

const router = Router();

const OTP_TTL_MS      = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN = 60 * 1000;       // 1 minute between sends

function createOtpCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function hashCode(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// POST /api/v1/kyc/email/send
// Sends a 6-digit OTP to the merchant's registered email.
router.post('/email/send', requireSession, authLimiter, async (req, res) => {
  try {
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });

    if (merchant.emailVerifiedAt) {
      return res.json({ success: true, data: { alreadyVerified: true } });
    }

    // Prevent sending more than once per minute
    const cooldownKey = `kyc-email-cooldown:${merchant.id}`;
    const coolingDown = await redis.get(cooldownKey);
    if (coolingDown) {
      return res.status(429).json({ success: false, error: 'Please wait before requesting another code.' });
    }

    const otpCode = createOtpCode();

    await prisma.otpChallenge.create({
      data: {
        channel:   'email',
        target:    merchant.email,
        purpose:   'email_verification',
        codeHash:  hashCode(otpCode),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    await redis.set(cooldownKey, '1', { px: RESEND_COOLDOWN });

    if (!process.env.RESEND_API_KEY?.trim()) {
      console.log(`[dev] email verification OTP for ${merchant.email}: ${otpCode}`);
    }

    await sendEmailVerificationEmail(merchant.email, otpCode);

    return res.json({ success: true, data: { sent: true, expiresInSeconds: OTP_TTL_MS / 1000 } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/kyc/email/verify
// Verifies the OTP and promotes merchant to kycLevel='basic'.
router.post('/email/verify', requireSession, async (req, res) => {
  const otpCode = String(req.body?.otp ?? '').trim();
  if (!otpCode) return res.status(400).json({ success: false, error: 'otp is required' });

  try {
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });

    if (merchant.emailVerifiedAt) {
      return res.json({
        success: true,
        data: { kycLevel: merchant.kycLevel, emailVerifiedAt: merchant.emailVerifiedAt },
      });
    }

    const challenge = await prisma.otpChallenge.findFirst({
      where: {
        target:     merchant.email,
        purpose:    'email_verification',
        consumedAt: null,
        expiresAt:  { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      return res.status(400).json({ success: false, error: 'No active code found. Please request a new one.' });
    }

    // Rate-limit OTP attempts per challenge
    const attemptsKey = `otp-attempts:${challenge.id}`;
    const attempts    = (await redis.get<number>(attemptsKey)) || 0;
    if (attempts >= 5) {
      return res.status(400).json({ success: false, error: 'Too many failed attempts. Please request a new code.' });
    }

    const expected = Buffer.from(challenge.codeHash, 'hex');
    const actual   = Buffer.from(hashCode(otpCode), 'hex');

    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
      await redis.incr(attemptsKey);
      if (attempts === 0) await redis.pexpire(attemptsKey, OTP_TTL_MS);
      const remaining = 5 - (attempts + 1);
      return res.status(400).json({
        success: false,
        error:   `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      });
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: now } });
      await tx.merchant.update({
        where: { id: merchant.id },
        data: {
          emailVerifiedAt: now,
          // Only promote if still at 'none'; don't downgrade a 'verified' merchant
          kycLevel: merchant.kycLevel === 'none' ? 'basic' : undefined,
        },
      });
    });

    recordMerchantAudit(req, 'email.verified', { metadata: { email: merchant.email } });

    return res.json({
      success: true,
      data: { kycLevel: merchant.kycLevel === 'none' ? 'basic' : merchant.kycLevel, emailVerifiedAt: now },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
