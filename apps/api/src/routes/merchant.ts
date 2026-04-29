import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { requireSession } from '../middleware/auth';
import { sendDeletionRequestEmail } from '../services/email.service';
import { syncPaystackSubaccount } from '../lib/merchant';

const router = Router();

function generatePublishableKey(): string {
  return 'pk_live_' + crypto.randomBytes(24).toString('hex');
}

function generateSecretKey(): string {
  return 'sk_live_' + crypto.randomBytes(32).toString('hex');
}

function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

// GET /api/v1/merchant/keys
// Returns the merchant's publishable key and metadata. Never returns the secret key.
router.get('/keys', requireSession, async (req, res) => {
  try {
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });

    return res.json({
      success: true,
      data: {
        merchantId:     merchant.id,
        name:           merchant.name,
        publishableKey: merchant.publishableKey,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/merchant/keys/regenerate
// Generates a new publishable + secret key pair. The secret key is returned
// exactly once and then discarded — the merchant must store it immediately.
router.post('/keys/regenerate', requireSession, async (req, res) => {
  try {
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });

    const publishableKey = generatePublishableKey();
    const secretKey      = generateSecretKey();
    const hashedSecret   = hashSecret(secretKey);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Deactivate all previous keypairs for this merchant
      await tx.keyPair.updateMany({
        where: { merchantId: merchant.id, isActive: true },
        data:  { isActive: false },
      });
      // Create the new keypair
      await tx.keyPair.create({
        data: {
          publicKey:       publishableKey,
          hashedSecretKey: hashedSecret,
          merchantId:      merchant.id,
          isActive:        true,
        },
      });
      // Update the merchant's publishable key
      await tx.merchant.update({
        where: { id: merchant.id },
        data:  { publishableKey },
      });
    });

    return res.json({
      success: true,
      data: {
        merchantId:     merchant.id,
        publishableKey,
        secretKey, // shown exactly once
        warning:  'Store the secretKey now — it will not be shown again.',
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/merchant/profile
router.get('/profile', requireSession, async (req, res) => {
  try {
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });

    return res.json({
      success: true,
      data: {
        id:        merchant.id,
        email:     merchant.email,
        name:      merchant.name,
        kycLevel:  merchant.kycLevel,
        createdAt: merchant.createdAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/merchant/profile
router.patch('/profile', requireSession, async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  if (!name) return res.status(400).json({ success: false, error: 'name is required' });
  if (name.length > 100) return res.status(400).json({ success: false, error: 'name must be under 100 characters' });

  try {
    const merchant = await prisma.merchant.update({
      where: { id: req.merchantId },
      data:  { name },
    });

    // Mirror to Paystack (async)
    syncPaystackSubaccount(merchant.id).catch(() => {});

    return res.json({
      success: true,
      data: {
        id:        merchant.id,
        email:     merchant.email,
        name:      merchant.name,
        kycLevel:  merchant.kycLevel,
        createdAt: merchant.createdAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/merchant/payouts
// Fetches the currently configured default payout destination for this merchant
router.get('/payouts', requireSession, async (req, res) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.merchantId },
    });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });

    if (!merchant.defaultPayoutInstrumentId) {
      return res.json({ success: true, data: null });
    }

    const inst = await prisma.instrument.findUnique({
      where: { id: merchant.defaultPayoutInstrumentId },
    });

    if (!inst) {
      return res.json({ success: true, data: null });
    }

    return res.json({
      success: true,
      data: {
        id:                          inst.id,
        kind:                        inst.kind,
        assetKey:                    inst.assetKey,
        bankInstitution:             inst.bankInstitution,
        bankAccountIdentifier:       inst.bankAccountIdentifier,
        bankAccountName:             inst.bankAccountName,
        walletAddress:               inst.walletAddress,
        paystackSubaccountStatus:    merchant.paystackSubaccountStatus,
        paystackSubaccountCode:      merchant.paystackSubaccountCode,
        paystackSubaccountSyncedAt:  merchant.paystackSubaccountSyncedAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/merchant/payouts
// Sets a new default payout destination. If one exists, it replaces the linkage.
router.put('/payouts', requireSession, async (req, res) => {
  try {
    const { kind, assetKey, bankInstitution, bankAccountIdentifier, bankAccountName, walletAddress } = req.body;

    if (!kind || !['bank_account', 'crypto_wallet'].includes(kind)) {
      return res.status(400).json({ success: false, error: 'Invalid or missing kind' });
    }
    if (!assetKey || typeof assetKey !== 'string' || assetKey.length > 20) {
      return res.status(400).json({ success: false, error: 'Invalid assetKey' });
    }

    if (kind === 'bank_account' && (!bankInstitution || !bankAccountIdentifier || !bankAccountName)) {
      return res.status(400).json({ success: false, error: 'bankInstitution, bankAccountIdentifier, and bankAccountName are required for bank accounts' });
    }
    if (kind === 'bank_account') {
      if (bankAccountName.length > 200) return res.status(400).json({ success: false, error: 'bankAccountName too long' });
      if (bankAccountIdentifier.length > 50) return res.status(400).json({ success: false, error: 'bankAccountIdentifier too long' });
    }
    if (kind === 'crypto_wallet' && (!walletAddress || typeof walletAddress !== 'string' || walletAddress.length > 128)) {
      return res.status(400).json({ success: false, error: 'Invalid walletAddress' });
    }

    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });

    // We create a new instrument and link it.
    // Over time, old instruments stick around structurally so orders don't break their relationships.
    const newInst = await prisma.instrument.create({
      data: {
        merchantId:            merchant.id,
        kind,
        assetKey,
        bankInstitution:       kind === 'bank_account' ? bankInstitution : null,
        bankAccountIdentifier: kind === 'bank_account' ? bankAccountIdentifier : null,
        bankAccountName:       kind === 'bank_account' ? bankAccountName : null,
        walletAddress:         kind === 'crypto_wallet' ? walletAddress : null,
        label:                 'Default Payout',
        verifiedAt:            new Date(), // we assume merchant enters correct data for now
      },
    });

    await prisma.merchant.update({
      where: { id: merchant.id },
      data:  { defaultPayoutInstrumentId: newInst.id },
    });

    // Mirror to Paystack (async)
    syncPaystackSubaccount(merchant.id).catch(() => {});

    return res.json({
      success: true,
      data: {
        id:                    newInst.id,
        kind:                  newInst.kind,
        assetKey:              newInst.assetKey,
        bankInstitution:       newInst.bankInstitution,
        bankAccountIdentifier: newInst.bankAccountIdentifier,
        bankAccountName:       newInst.bankAccountName,
        walletAddress:         newInst.walletAddress,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/merchant/request-deletion
// Submits an account deletion request to the admin support team
router.post('/request-deletion', requireSession, async (req, res) => {
  try {
    const { reason } = req.body;
    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'merchant not found' });

    await sendDeletionRequestEmail(merchant.id, merchant.email, merchant.name, reason || '');

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
