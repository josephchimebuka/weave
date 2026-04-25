"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const email_service_1 = require("../services/email.service");
const router = (0, express_1.Router)();
function generatePublishableKey() {
    return 'pk_live_' + crypto_1.default.randomBytes(24).toString('hex');
}
function generateSecretKey() {
    return 'sk_live_' + crypto_1.default.randomBytes(32).toString('hex');
}
function hashSecret(secret) {
    return crypto_1.default.createHash('sha256').update(secret).digest('hex');
}
// GET /api/v1/merchant/keys
// Returns the merchant's publishable key and metadata. Never returns the secret key.
router.get('/keys', auth_1.requireSession, async (req, res) => {
    try {
        const merchant = await prisma_1.prisma.merchant.findUnique({ where: { id: req.merchantId } });
        if (!merchant)
            return res.status(404).json({ success: false, error: 'merchant not found' });
        return res.json({
            success: true,
            data: {
                merchantId: merchant.id,
                name: merchant.name,
                publishableKey: merchant.publishableKey,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/v1/merchant/keys/regenerate
// Generates a new publishable + secret key pair. The secret key is returned
// exactly once and then discarded — the merchant must store it immediately.
router.post('/keys/regenerate', auth_1.requireSession, async (req, res) => {
    try {
        const merchant = await prisma_1.prisma.merchant.findUnique({ where: { id: req.merchantId } });
        if (!merchant)
            return res.status(404).json({ success: false, error: 'merchant not found' });
        const publishableKey = generatePublishableKey();
        const secretKey = generateSecretKey();
        const hashedSecret = hashSecret(secretKey);
        await prisma_1.prisma.$transaction(async (tx) => {
            // Deactivate all previous keypairs for this merchant
            await tx.keyPair.updateMany({
                where: { merchantId: merchant.id, isActive: true },
                data: { isActive: false },
            });
            // Create the new keypair
            await tx.keyPair.create({
                data: {
                    publicKey: publishableKey,
                    hashedSecretKey: hashedSecret,
                    merchantId: merchant.id,
                    isActive: true,
                },
            });
            // Update the merchant's publishable key
            await tx.merchant.update({
                where: { id: merchant.id },
                data: { publishableKey },
            });
        });
        return res.json({
            success: true,
            data: {
                merchantId: merchant.id,
                publishableKey,
                secretKey, // shown exactly once
                warning: 'Store the secretKey now — it will not be shown again.',
            },
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/v1/merchant/profile
router.get('/profile', auth_1.requireSession, async (req, res) => {
    try {
        const merchant = await prisma_1.prisma.merchant.findUnique({ where: { id: req.merchantId } });
        if (!merchant)
            return res.status(404).json({ success: false, error: 'merchant not found' });
        return res.json({
            success: true,
            data: {
                id: merchant.id,
                email: merchant.email,
                name: merchant.name,
                kycLevel: merchant.kycLevel,
                createdAt: merchant.createdAt,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// PATCH /api/v1/merchant/profile
router.patch('/profile', auth_1.requireSession, async (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    if (!name) {
        return res.status(400).json({ success: false, error: 'name is required' });
    }
    try {
        const merchant = await prisma_1.prisma.merchant.update({
            where: { id: req.merchantId },
            data: { name },
        });
        return res.json({
            success: true,
            data: {
                id: merchant.id,
                email: merchant.email,
                name: merchant.name,
                kycLevel: merchant.kycLevel,
                createdAt: merchant.createdAt,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/v1/merchant/payouts
// Fetches the currently configured default payout destination for this merchant
router.get('/payouts', auth_1.requireSession, async (req, res) => {
    try {
        const merchant = await prisma_1.prisma.merchant.findUnique({
            where: { id: req.merchantId },
        });
        if (!merchant)
            return res.status(404).json({ success: false, error: 'merchant not found' });
        if (!merchant.defaultPayoutInstrumentId) {
            return res.json({ success: true, data: null });
        }
        const inst = await prisma_1.prisma.instrument.findUnique({
            where: { id: merchant.defaultPayoutInstrumentId },
        });
        if (!inst) {
            return res.json({ success: true, data: null });
        }
        return res.json({
            success: true,
            data: {
                id: inst.id,
                kind: inst.kind,
                assetKey: inst.assetKey,
                bankInstitution: inst.bankInstitution,
                bankAccountIdentifier: inst.bankAccountIdentifier,
                bankAccountName: inst.bankAccountName,
                walletAddress: inst.walletAddress,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// PUT /api/v1/merchant/payouts
// Sets a new default payout destination. If one exists, it replaces the linkage.
router.put('/payouts', auth_1.requireSession, async (req, res) => {
    try {
        const { kind, assetKey, bankInstitution, bankAccountIdentifier, bankAccountName, walletAddress } = req.body;
        if (!kind || !['bank_account', 'crypto_wallet'].includes(kind)) {
            return res.status(400).json({ success: false, error: 'Invalid or missing kind' });
        }
        if (!assetKey) {
            return res.status(400).json({ success: false, error: 'assetKey is required' });
        }
        if (kind === 'bank_account' && (!bankInstitution || !bankAccountIdentifier || !bankAccountName)) {
            return res.status(400).json({ success: false, error: 'bankInstitution, bankAccountIdentifier, and bankAccountName are required for bank accounts' });
        }
        if (kind === 'crypto_wallet' && !walletAddress) {
            return res.status(400).json({ success: false, error: 'walletAddress is required for crypto wallets' });
        }
        const merchant = await prisma_1.prisma.merchant.findUnique({ where: { id: req.merchantId } });
        if (!merchant)
            return res.status(404).json({ success: false, error: 'merchant not found' });
        // We create a new instrument and link it.
        // Over time, old instruments stick around structurally so orders don't break their relationships.
        const newInst = await prisma_1.prisma.instrument.create({
            data: {
                merchantId: merchant.id,
                kind,
                assetKey,
                bankInstitution: kind === 'bank_account' ? bankInstitution : null,
                bankAccountIdentifier: kind === 'bank_account' ? bankAccountIdentifier : null,
                bankAccountName: kind === 'bank_account' ? bankAccountName : null,
                walletAddress: kind === 'crypto_wallet' ? walletAddress : null,
                label: 'Default Payout',
                verifiedAt: new Date(), // we assume merchant enters correct data for now
            },
        });
        await prisma_1.prisma.merchant.update({
            where: { id: merchant.id },
            data: { defaultPayoutInstrumentId: newInst.id },
        });
        return res.json({
            success: true,
            data: {
                id: newInst.id,
                kind: newInst.kind,
                assetKey: newInst.assetKey,
                bankInstitution: newInst.bankInstitution,
                bankAccountIdentifier: newInst.bankAccountIdentifier,
                bankAccountName: newInst.bankAccountName,
                walletAddress: newInst.walletAddress,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/v1/merchant/request-deletion
// Submits an account deletion request to the admin support team
router.post('/request-deletion', auth_1.requireSession, async (req, res) => {
    try {
        const { reason } = req.body;
        const merchant = await prisma_1.prisma.merchant.findUnique({ where: { id: req.merchantId } });
        if (!merchant)
            return res.status(404).json({ success: false, error: 'merchant not found' });
        await (0, email_service_1.sendDeletionRequestEmail)(merchant.id, merchant.email, merchant.name, reason || '');
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
exports.default = router;
