"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const email_service_1 = require("../services/email.service");
const router = (0, express_1.Router)();
const ADMIN_SECRET = process.env.ADMIN_SECRET;
if (!ADMIN_SECRET) {
    console.warn('[security] CRITICAL: ADMIN_SECRET is not set. Admin verification routes are disabled.');
}
/**
 * GET /api/v1/admin/verify
 * The "Magic Link" action endpoint.
 */
router.get('/verify', async (req, res) => {
    if (!ADMIN_SECRET)
        return res.status(500).send('Admin service unavailable.');
    const { id, action, token } = req.query;
    if (!id || !action || !token) {
        return res.status(400).send('Invalid request: missing parameters.');
    }
    try {
        // 1. Verify the JWT token
        const decoded = jsonwebtoken_1.default.verify(token, ADMIN_SECRET);
        // Security check: IDs and Action must match what was in the token
        if (decoded.sub !== id || decoded.action !== action) {
            return res.status(403).send('Security violation: token mismatch.');
        }
        // 2. Fetch the verification record
        const verification = await prisma_1.prisma.businessVerification.findUnique({
            where: { id },
            include: { merchant: true }
        });
        if (!verification) {
            return res.status(404).send('Verification record not found.');
        }
        // 3. Process the action
        if (action === 'approve') {
            await prisma_1.prisma.$transaction([
                prisma_1.prisma.businessVerification.update({
                    where: { id },
                    data: { status: 'verified', updatedAt: new Date() }
                }),
                prisma_1.prisma.merchant.update({
                    where: { id: verification.merchantId },
                    data: { kycLevel: 'verified' }
                })
            ]);
            // 4. Notify the merchant
            (0, email_service_1.sendMerchantKYBApprovalEmail)(verification.merchantId).catch(err => {
                console.error('[admin-verify] failed to notify merchant:', err.message);
            });
            return res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #0F5D4C;">✅ Merchant Approved!</h1>
          <p>${verification.merchant.name} (${verification.legalName}) is now live.</p>
        </div>
      `);
        }
        if (action === 'reject') {
            return res.send(`
        <div style="font-family: sans-serif; max-width: 500px; margin: 40px auto; padding: 32px; border: 1px solid #E8EAE6; border-radius: 24px; text-align: center;">
          <h1 style="color: #d94e4e; font-size: 24px;">Reject KYB Application</h1>
          <p style="color: #6B7572; margin-bottom: 24px;">Please provide a reason. This will be sent to <strong>${verification.merchant.email}</strong>.</p>
          <form action="/api/v1/admin/verify" method="POST">
            <input type="hidden" name="id" value="${id}" />
            <input type="hidden" name="action" value="reject" />
            <input type="hidden" name="token" value="${token}" />
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
    }
    catch (err) {
        console.error('[admin-verify] error:', err.message);
        res.status(401).send('Unauthorized: link expired or invalid.');
    }
});
/**
 * POST /api/v1/admin/verify
 * Handles the submission of the rejection form.
 */
router.post('/verify', async (req, res) => {
    if (!ADMIN_SECRET)
        return res.status(500).send('Admin service unavailable.');
    const { id, action, token, reason } = req.body;
    if (action !== 'reject')
        return res.status(400).send('Invalid action.');
    try {
        const decoded = jsonwebtoken_1.default.verify(token, ADMIN_SECRET);
        if (decoded.sub !== id || decoded.action !== action) {
            return res.status(403).send('Security violation: token mismatch.');
        }
        const v = await prisma_1.prisma.businessVerification.findUnique({ where: { id } });
        if (!v)
            return res.status(404).send('Not found.');
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.businessVerification.update({
                where: { id },
                data: { status: 'rejected', rejectionReason: reason, updatedAt: new Date() }
            }),
            prisma_1.prisma.merchant.update({
                where: { id: v.merchantId },
                data: { kycLevel: 'none' }
            })
        ]);
        (0, email_service_1.sendMerchantKYBRejectionEmail)(v.merchantId, reason).catch(err => {
            console.error('[admin-verify] failed to notify merchant of rejection:', err.message);
        });
        res.send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #A8321E;">❌ Merchant Rejected Successfully</h1>
        <p>Mail sent to merchant explaining: <em>"${reason}"</em></p>
      </div>
    `);
    }
    catch (err) {
        res.status(401).send('Unauthorized.');
    }
});
exports.default = router;
