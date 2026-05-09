import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { sendMerchantKYBApprovalEmail, sendMerchantKYBRejectionEmail } from '../services/email.service';
import { signedDeliveryUrl, parseCloudinaryUrl } from '../services/cloudinary.service';

const router = Router();
const ADMIN_SECRET = process.env.ADMIN_SECRET;
if (!ADMIN_SECRET) {
  console.warn('[security] CRITICAL: ADMIN_SECRET is not set. Admin verification routes are disabled.');
}

const ACTION_TTL_SECONDS = 60 * 60;

function escHtml(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Cloudinary URLs never appear in this response — docs are reached only through
// /verify/review/doc, which re-validates the review JWT before fetching them.
router.get('/verify/review', async (req, res) => {
  if (!ADMIN_SECRET) return res.status(500).send('Admin service unavailable.');
  const { id, token } = req.query as { id: string; token: string };

  if (!id || !token) return res.status(400).send('Invalid request: missing parameters.');

  let decoded: { sub: string; action: string };
  try {
    decoded = jwt.verify(token, ADMIN_SECRET, { maxAge: '24h' }) as { sub: string; action: string };
  } catch {
    return res.status(401).send('Unauthorized: link expired or invalid.');
  }
  if (decoded.sub !== id || decoded.action !== 'review') {
    return res.status(403).send('Security violation: token mismatch.');
  }

  const v = await prisma.businessVerification.findUnique({
    where: { id },
    include: { merchant: true },
  });
  if (!v) return res.status(404).send('Verification record not found.');

  if (v.status !== 'none' && v.status !== 'pending') {
    return res.status(200).send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2>Already processed</h2>
        <p>This verification was already ${escHtml(v.status)}. No action taken.</p>
      </div>
    `);
  }

  console.log(`[admin-review] id=${id} ip=${req.ip} ua="${req.headers['user-agent'] ?? ''}"`);

  const approveToken = jwt.sign({ sub: id, action: 'approve' }, ADMIN_SECRET, { expiresIn: ACTION_TTL_SECONDS });
  const rejectToken  = jwt.sign({ sub: id, action: 'reject'  }, ADMIN_SECRET, { expiresIn: ACTION_TTL_SECONDS });
  const approveUrl   = `${process.env.API_URL || ''}/admin/verify?id=${encodeURIComponent(id)}&action=approve&token=${approveToken}`;
  const rejectUrl    = `${process.env.API_URL || ''}/admin/verify?id=${encodeURIComponent(id)}&action=reject&token=${rejectToken}`;

  const docs = (v.documentUrls as Array<{ url: string; type: string }> | null) ?? [];
  const docList = docs.map((doc, idx) => {
    if (typeof doc.url !== 'string' || !parseCloudinaryUrl(doc.url)) return '';
    const proxied = `${process.env.API_URL || ''}/admin/verify/review/doc?id=${encodeURIComponent(id)}&idx=${idx}&token=${encodeURIComponent(token)}`;
    return `
      <div style="margin: 8px 0;">
        <a href="${escHtml(proxied)}" target="_blank" rel="noopener noreferrer"
           style="color: #0F5D4C; font-weight: 600; text-decoration: none;">
          View ${escHtml(doc.type.replace(/_/g, ' '))} →
        </a>
      </div>`;
  }).join('') || '<p style="color: #9B9FA1;">No documents attached.</p>';

  res.set('Cache-Control', 'no-store').send(`
    <div style="font-family: sans-serif; max-width: 720px; margin: 32px auto; color: #0B0F0E; padding: 0 16px;">
      <h2 style="color: #0F5D4C;">KYB Review · ${escHtml(v.merchant.name)}</h2>
      <p style="color: #6B7572;">This review session is bound to your one-time link and logged. Document previews are
      streamed through Weave — not direct Cloudinary URLs.</p>

      <div style="background: #FDFDFB; border: 1px solid #E8EAE6; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="margin-top: 0;">Business Meta</h3>
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr><td style="color: #6B7572; padding: 6px 0;">Legal Name</td><td style="font-weight: 600; padding: 6px 0;">${escHtml(v.legalName)}</td></tr>
          <tr><td style="color: #6B7572; padding: 6px 0;">Entity Type</td><td style="font-weight: 600; padding: 6px 0;">${escHtml(v.entityType)}</td></tr>
          <tr><td style="color: #6B7572; padding: 6px 0;">Reg Number</td><td style="font-weight: 600; padding: 6px 0;">${escHtml(v.regNumber)}</td></tr>
          <tr><td style="color: #6B7572; padding: 6px 0;">Address</td><td style="font-weight: 600; padding: 6px 0;">${escHtml(v.businessAddress)}, ${escHtml(v.city)}</td></tr>
          <tr><td style="color: #6B7572; padding: 6px 0;">State/Postal</td><td style="font-weight: 600; padding: 6px 0;">${escHtml(v.state)} ${escHtml(v.postalCode)}</td></tr>
          <tr><td style="color: #6B7572; padding: 6px 0;">Merchant Email</td><td style="font-weight: 600; padding: 6px 0;">${escHtml(v.merchant.email)}</td></tr>
        </table>

        <hr style="border: none; border-top: 1px solid #E8EAE6; margin: 20px 0;" />

        <h3 style="margin-top: 0; font-size: 16px;">Documents</h3>
        ${docList}
      </div>

      <p style="color: #6B7572; font-size: 12px; margin-bottom: 24px;">
        Action tokens expire in 1 hour. Reload this page if they expire before you decide.
      </p>

      <div style="margin-top: 32px;">
        <a href="${escHtml(approveUrl)}" style="background: #0F5D4C; color: white; padding: 12px 24px; border-radius: 99px; text-decoration: none; font-weight: 600;">
          Approve Merchant
        </a>
        <a href="${escHtml(rejectUrl)}" style="background: #FFF0F0; color: #d94e4e; padding: 12px 24px; border-radius: 99px; border: 1px solid #FFD1D1; text-decoration: none; font-weight: 600; margin-left: 10px;">
          Reject Application
        </a>
      </div>
    </div>
  `);
});

// Bytes flow through the API so revocation = invalidate the JWT (or rotate
// ADMIN_SECRET), without needing Cloudinary's auth_token feature.
router.get('/verify/review/doc', async (req, res) => {
  if (!ADMIN_SECRET) return res.status(500).send('Admin service unavailable.');
  const { id, idx, token } = req.query as { id: string; idx: string; token: string };

  if (!id || idx == null || !token) return res.status(400).send('Invalid request.');

  let decoded: { sub: string; action: string };
  try {
    decoded = jwt.verify(token, ADMIN_SECRET, { maxAge: '24h' }) as { sub: string; action: string };
  } catch {
    return res.status(401).send('Unauthorized.');
  }
  if (decoded.sub !== id || decoded.action !== 'review') {
    return res.status(403).send('Security violation: token mismatch.');
  }

  const v = await prisma.businessVerification.findUnique({ where: { id }, select: { documentUrls: true } });
  if (!v) return res.status(404).send('Not found.');

  const docs = (v.documentUrls as Array<{ url: string; type: string }> | null) ?? [];
  const i = Number(idx);
  if (!Number.isInteger(i) || i < 0 || i >= docs.length) return res.status(404).send('Doc not found.');

  const original = docs[i]?.url;
  if (typeof original !== 'string' || !parseCloudinaryUrl(original)) {
    return res.status(404).send('Doc not found.');
  }

  let signed: string;
  try {
    signed = signedDeliveryUrl(original);
  } catch (err: any) {
    console.error('[admin-review-doc] signing failed:', err.message);
    return res.status(500).send('Doc fetch failed.');
  }

  console.log(`[admin-review-doc] id=${id} idx=${i} ip=${req.ip}`);

  try {
    const upstream = await fetch(signed);
    if (!upstream.ok || !upstream.body) {
      console.error(`[admin-review-doc] cloudinary returned ${upstream.status} for ${original}`);
      return res.status(502).send('Doc fetch failed.');
    }

    res.setHeader('Content-Type',  upstream.headers.get('content-type')  ?? 'application/octet-stream');
    const len = upstream.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');

    const reader = upstream.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!res.write(Buffer.from(value))) {
          await new Promise<void>((r) => res.once('drain', r));
        }
      }
      res.end();
    };
    await pump();
  } catch (err: any) {
    console.error('[admin-review-doc] proxy error:', err.message);
    if (!res.headersSent) res.status(502).send('Doc fetch failed.');
    else res.end();
  }
});

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
