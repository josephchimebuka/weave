import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { sendMerchantKYBApprovalEmail, sendMerchantKYBRejectionEmail } from '../services/email.service';

const router = Router();
const ADMIN_SECRET = process.env.ADMIN_SECRET;
if (!ADMIN_SECRET) {
  console.warn('[security] CRITICAL: ADMIN_SECRET is not set. Admin verification routes are disabled.');
}

function escHtml(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * GET /api/v1/admin/verify
 * The "Magic Link" action endpoint.
 */
router.get('/verify', async (req, res) => {
  if (!ADMIN_SECRET) return res.status(500).send('Admin service unavailable.');
  const { id, action, token } = req.query as { id: string; action: string; token: string };

  if (!id || !action || !token) {
    return res.status(400).send('Invalid request: missing parameters.');
  }

  try {
    // 1. Verify the JWT token
    const decoded = jwt.verify(token, ADMIN_SECRET, { maxAge: '24h' }) as { sub: string; action: string };
    
    // Security check: IDs and Action must match what was in the token
    if (decoded.sub !== id || decoded.action !== action) {
      return res.status(403).send('Security violation: token mismatch.');
    }

    // 2. Fetch the verification record
    const verification = await prisma.businessVerification.findUnique({
      where: { id },
      include: { merchant: true }
    });

    if (!verification) {
      return res.status(404).send('Verification record not found.');
    }

    // 3. Idempotency: reject if already actioned
    if (verification.status !== 'none' && verification.status !== 'pending') {
      return res.status(200).send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>Already processed</h2>
          <p>This verification was already ${escHtml(verification.status)}. No action taken.</p>
        </div>
      `);
    }

    // 4. Process the action
    if (action === 'approve') {
      await prisma.$transaction([
        prisma.businessVerification.update({
          where: { id },
          data: { status: 'verified', updatedAt: new Date() }
        }),
        prisma.merchant.update({
          where: { id: verification.merchantId },
          data: { kycLevel: 'verified' }
        })
      ]);

      // 4. Notify the merchant
      sendMerchantKYBApprovalEmail(verification.merchantId).catch(err => {
        console.error('[admin-verify] failed to notify merchant:', err.message);
      });
      
      return res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #0F5D4C;">&#x2705; Merchant Approved!</h1>
          <p>${escHtml(verification.merchant.name)} (${escHtml(verification.legalName)}) is now live.</p>
        </div>
      `);
    }

    if (action === 'reject') {
      return res.send(`
        <div style="font-family: sans-serif; max-width: 500px; margin: 40px auto; padding: 32px; border: 1px solid #E8EAE6; border-radius: 24px; text-align: center;">
          <h1 style="color: #d94e4e; font-size: 24px;">Reject KYB Application</h1>
          <p style="color: #6B7572; margin-bottom: 24px;">Please provide a reason. This will be sent to <strong>${escHtml(verification.merchant.email)}</strong>.</p>
          <form action="/api/v1/admin/verify" method="POST">
            <input type="hidden" name="id" value="${escHtml(id)}" />
            <input type="hidden" name="action" value="reject" />
            <input type="hidden" name="token" value="${escHtml(token)}" />
            <textarea 
              name="reason" 
              placeholder="e.g. Identity document is expired or blurry." 
              required 
              style="width: 100%; height: 120px; padding: 12px; border-radius: 12px; border: 1px solid #E8EAE6; font-family: inherit; margin-bottom: 16px;"
            ></textarea>
            <button type="submit" style="background: #A8321E; color: white; border: none; padding: 12px 24px; border-radius: 99px; font-weight: 600; cursor: pointer;">
              Confirm Rejection
            </button>
          </form>
        </div>
      `);
    }

    res.status(400).send('Invalid action.');
  } catch (err: any) {
    console.error('[admin-verify] error:', err.message);
    res.status(401).send('Unauthorized: link expired or invalid.');
  }
});

/**
 * POST /api/v1/admin/verify
 * Handles the submission of the rejection form.
 */
router.post('/verify', async (req, res) => {
  if (!ADMIN_SECRET) return res.status(500).send('Admin service unavailable.');
  const { id, action, token, reason } = req.body as { id: string; action: string; token: string; reason: string };

  if (action !== 'reject') return res.status(400).send('Invalid action.');

  if (!reason || reason.trim().length === 0) {
    return res.status(400).send('Rejection reason is required.');
  }
  if (reason.length > 1000) {
    return res.status(400).send('Rejection reason is too long (max 1000 characters).');
  }

  try {
    const decoded = jwt.verify(token, ADMIN_SECRET, { maxAge: '24h' }) as { sub: string; action: string };
    if (decoded.sub !== id || decoded.action !== action) {
      return res.status(403).send('Security violation: token mismatch.');
    }

    const v = await prisma.businessVerification.findUnique({ where: { id } });
    if (!v) return res.status(404).send('Not found.');

    if (v.status !== 'none' && v.status !== 'pending') {
      return res.status(200).send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>Already processed</h2>
          <p>This verification was already ${escHtml(v.status)}. No action taken.</p>
        </div>
      `);
    }

    await prisma.$transaction([
      prisma.businessVerification.update({
        where: { id },
        data: { status: 'rejected', rejectionReason: reason, updatedAt: new Date() }
      }),
      prisma.merchant.update({
        where: { id: v.merchantId },
        data: { kycLevel: 'none' }
      })
    ]);

    sendMerchantKYBRejectionEmail(v.merchantId, reason).catch(err => {
      console.error('[admin-verify] failed to notify merchant of rejection:', err.message);
    });

    res.send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #A8321E;">Merchant Rejected</h1>
        <p>Rejection email sent to merchant.</p>
      </div>
    `);
  } catch (err: any) {
    res.status(401).send('Unauthorized.');
  }
});

export default router;
