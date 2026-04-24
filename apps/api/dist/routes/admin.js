"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
const ADMIN_SECRET = process.env.ADMIN_SECRET;
if (!ADMIN_SECRET) {
    console.warn('[security] CRITICAL: ADMIN_SECRET is not set. Admin verification routes are disabled.');
}
/**
 * POST /api/v1/admin/verify
 * The "Magic Link" action endpoint. Changed to POST to prevent CSRF.
 */
router.post('/verify', async (req, res) => {
    if (!ADMIN_SECRET)
        return res.status(500).send('Admin service unavailable.');
    const { id, action, token } = req.body;
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
            return res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #0F5D4C;">✅ Merchant Approved!</h1>
          <p>${verification.merchant.name} (${verification.legalName}) is now live.</p>
        </div>
      `);
        }
        if (action === 'reject') {
            await prisma_1.prisma.$transaction([
                prisma_1.prisma.businessVerification.update({
                    where: { id },
                    data: { status: 'rejected', updatedAt: new Date() }
                }),
                prisma_1.prisma.merchant.update({
                    where: { id: verification.merchantId },
                    data: { kycLevel: 'none' }
                })
            ]);
            return res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #d94e4e;">❌ Merchant Rejected</h1>
          <p>${verification.merchant.name} status reset to none.</p>
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
exports.default = router;
