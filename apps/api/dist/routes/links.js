"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const rate_limit_1 = require("../middleware/rate-limit");
const router = (0, express_1.Router)();
// GET /api/v1/links
// Fetches all payment links for the logged-in merchant.
router.get('/', auth_1.requireSession, async (req, res) => {
    try {
        const links = await prisma_1.prisma.paymentLink.findMany({
            where: { merchantId: req.merchantId },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ success: true, data: links });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/v1/links
// Creates a new payment link.
router.post('/', auth_1.requireSession, rate_limit_1.linkCreationLimiter, async (req, res) => {
    try {
        const { title, description, amount, currency } = req.body;
        if (!title || !currency) {
            return res.status(400).json({ success: false, error: 'Title and currency are required' });
        }
        const merchant = await prisma_1.prisma.merchant.findUnique({ where: { id: req.merchantId } });
        if (!merchant)
            return res.status(404).json({ success: false, error: 'Merchant not found' });
        const link = await prisma_1.prisma.paymentLink.create({
            data: {
                merchantId: merchant.id,
                title,
                description,
                amount: amount || null,
                currency,
                isActive: true,
            },
        });
        return res.json({ success: true, data: link });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/v1/links/public/:slug
// Public endpoint for the hosted checkout page. Fetches link details + merchant info safely.
router.get('/public/:slug', rate_limit_1.apiLimiter, async (req, res) => {
    try {
        const link = await prisma_1.prisma.paymentLink.findUnique({
            where: { id: req.params.slug },
            include: {
                merchant: {
                    select: { name: true, publishableKey: true },
                },
            },
        });
        if (!link || !link.isActive) {
            return res.status(404).json({ success: false, error: 'Payment link not found or inactive' });
        }
        return res.json({
            success: true,
            data: {
                id: link.id,
                title: link.title,
                description: link.description,
                amount: link.amount,
                currency: link.currency,
                merchantName: link.merchant.name,
                publishableKey: link.merchant.publishableKey,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// PATCH /api/v1/links/:id
// Updates an existing payment link.
router.patch('/:id', auth_1.requireSession, async (req, res) => {
    try {
        const { title, description, amount, currency, isActive } = req.body;
        // Safety check: ensure the link belongs to the merchant
        const existing = await prisma_1.prisma.paymentLink.findFirst({
            where: { id: req.params.id, merchantId: req.merchantId }
        });
        if (!existing)
            return res.status(404).json({ success: false, error: 'Link not found' });
        const link = await prisma_1.prisma.paymentLink.update({
            where: { id: req.params.id },
            data: {
                title: title ?? undefined,
                description: description ?? undefined,
                amount: amount !== undefined ? (amount ? parseFloat(amount) : null) : undefined,
                currency: currency ?? undefined,
                isActive: isActive !== undefined ? isActive : undefined,
            },
        });
        return res.json({ success: true, data: link });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// DELETE /api/v1/links/:id
// Deletes a payment link.
router.delete('/:id', auth_1.requireSession, async (req, res) => {
    try {
        const existing = await prisma_1.prisma.paymentLink.findFirst({
            where: { id: req.params.id, merchantId: req.merchantId }
        });
        if (!existing)
            return res.status(404).json({ success: false, error: 'Link not found' });
        await prisma_1.prisma.paymentLink.delete({ where: { id: req.params.id } });
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
exports.default = router;
