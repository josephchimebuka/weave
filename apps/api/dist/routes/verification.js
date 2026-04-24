"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const email_service_1 = require("../services/email.service");
const router = (0, express_1.Router)();
// GET /api/verification — Fetch current progress
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const verification = await prisma_1.prisma.businessVerification.findUnique({
            where: { merchantId: req.merchantId },
        });
        res.json({ success: true, data: verification });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// PATCH /api/verification — Save progress (incremental updates)
router.patch('/', auth_1.requireAuth, async (req, res) => {
    try {
        const data = req.body;
        // Security: Whitelist fields to prevent mass assignment (setting status=verified)
        const whitelistedData = {
            firstName: data.firstName,
            lastName: data.lastName,
            dob: data.dob,
            personalAddress: data.personalAddress,
            legalName: data.legalName,
            dba: data.dba,
            entityType: data.entityType,
            regNumber: data.regNumber,
            businessAddress: data.businessAddress,
            city: data.city,
            state: data.state,
            postalCode: data.postalCode,
            documentUrls: data.documentUrls,
        };
        const verification = await prisma_1.prisma.businessVerification.upsert({
            where: { merchantId: req.merchantId },
            update: { ...whitelistedData, updatedAt: new Date() },
            create: {
                ...whitelistedData,
                merchantId: req.merchantId,
                status: 'none'
            },
        });
        res.json({ success: true, data: verification });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/verification/submit — Final submission
router.post('/submit', auth_1.requireAuth, async (req, res) => {
    try {
        const verification = await prisma_1.prisma.businessVerification.update({
            where: { merchantId: req.merchantId },
            data: {
                status: 'pending',
                submittedAt: new Date()
            },
        });
        await prisma_1.prisma.merchant.update({
            where: { id: req.merchantId },
            data: { kycLevel: 'pending' }
        });
        // Notify company admin via email with approve/reject magic links
        (0, email_service_1.sendAdminKYBNotification)(verification.id).catch(err => {
            console.error('[verification] failed to trigger admin notification email:', err.message);
        });
        res.json({ success: true, data: verification });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.default = router;
