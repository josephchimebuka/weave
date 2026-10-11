import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { linkCreationLimiter, apiLimiter } from '../middleware/rate-limit';
import { recordMerchantAudit } from '../services/audit.service';

// Payout links — the inverse of payment links. A merchant creates one; their user
// opens the hosted cash-out page, supplies their own bank account, and offramps
// their own crypto to it. Mirrors links.ts closely (same auth, gates, audit shape).

const router = Router();

// GET /api/v1/payout-links — list the merchant's payout links.
router.get('/', requireAuth, async (req, res) => {
  try {
    const links = await prisma.payoutLink.findMany({
      where: { merchantId: req.merchantId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: links });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/payout-links — create a payout link.
router.post('/', requireAuth, linkCreationLimiter, async (req, res) => {
  try {
    const { title, description, sourceAsset, payoutCurrency, amount } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    if (String(title).length > 100) return res.status(400).json({ success: false, error: 'Title too long' });
    if (description && String(description).length > 500) return res.status(400).json({ success: false, error: 'Description too long' });
    // sourceAsset is OPTIONAL. Omitting it keeps the link chain-agnostic — the user
    // picks any chain/token at cash-out. If provided (to restrict), it must be crypto.
    if (sourceAsset && !String(sourceAsset).startsWith('crypto:')) {
      return res.status(400).json({ success: false, error: 'sourceAsset, if set, must be a crypto asset (crypto:CHAIN:TOKEN)' });
    }
    // amount is optional (null/omitted = the user chooses at cash-out time).
    let fixedAmount: number | null = null;
    if (amount !== undefined && amount !== null && amount !== '') {
      fixedAmount = parseFloat(String(amount));
      if (!Number.isFinite(fixedAmount) || fixedAmount <= 0) {
        return res.status(400).json({ success: false, error: 'amount must be a positive number or omitted' });
      }
    }

    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'Merchant not found' });

    if (!merchant.emailVerifiedAt && merchant.kycLevel === 'none') {
      return res.status(403).json({
        success: false,
        error:   'Email verification required to create payout links.',
        code:    'EMAIL_VERIFICATION_REQUIRED',
      });
    }

    const link = await prisma.payoutLink.create({
      data: {
        merchantId:     merchant.id,
        title,
        description,
        sourceAsset:    sourceAsset || null,   // null = chain-agnostic
        payoutCurrency: (payoutCurrency ? String(payoutCurrency).toUpperCase() : 'NGN'),
        amount:         fixedAmount,
        isActive:       true,
      },
    });

    recordMerchantAudit(req, 'payout_link.created', {
      targetType: 'payout_link',
      targetId: link.id,
      metadata: { title, sourceAsset, amount: fixedAmount },
    });

    return res.json({ success: true, data: link });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/payout-links/public/:slug — public fetch for the hosted cash-out page.
// Returns only what the page needs; never any merchant bank/wallet details.
router.get('/public/:slug', apiLimiter, async (req, res) => {
  try {
    const link = await prisma.payoutLink.findUnique({
      where: { id: req.params.slug },
      include: { merchant: { select: { name: true, publishableKey: true, brand: true } } },
    });

    if (!link || !link.isActive) {
      return res.status(404).json({ success: false, error: 'Payout link not found or inactive' });
    }

    return res.json({
      success: true,
      data: {
        id: link.id,
        title: link.title,
        description: link.description,
        sourceAsset: link.sourceAsset,     // null = chain-agnostic (user picks any)
        payoutCurrency: link.payoutCurrency,
        amount: link.amount,               // null = the user chooses
        merchantName: link.merchant.name,
        publishableKey: link.merchant.publishableKey,
        brand: link.merchant.brand ?? null,   // themes the hosted page
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/payout-links/:id — update / toggle.
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { title, description, sourceAsset, payoutCurrency, amount, isActive } = req.body;
    if (title && String(title).length > 100) return res.status(400).json({ success: false, error: 'Title too long' });
    if (description && String(description).length > 500) return res.status(400).json({ success: false, error: 'Description too long' });

    const existing = await prisma.payoutLink.findFirst({
      where: { id: req.params.id, merchantId: req.merchantId },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'Payout link not found' });

    const link = await prisma.payoutLink.update({
      where: { id: req.params.id },
      data: {
        title:          title ?? undefined,
        description:    description ?? undefined,
        sourceAsset:    sourceAsset ?? undefined,
        payoutCurrency: payoutCurrency ? String(payoutCurrency).toUpperCase() : undefined,
        amount:         amount !== undefined ? (amount === null || amount === '' ? null : parseFloat(String(amount))) : undefined,
        isActive:       isActive !== undefined ? isActive : undefined,
      },
    });

    const changed: string[] = [];
    if (title !== undefined) changed.push('title');
    if (description !== undefined) changed.push('description');
    if (sourceAsset !== undefined) changed.push('sourceAsset');
    if (payoutCurrency !== undefined) changed.push('payoutCurrency');
    if (amount !== undefined) changed.push('amount');
    if (isActive !== undefined) changed.push(isActive ? 'activated' : 'deactivated');
    recordMerchantAudit(req, 'payout_link.updated', {
      targetType: 'payout_link',
      targetId: link.id,
      metadata: { title: link.title, changed },
    });

    return res.json({ success: true, data: link });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/payout-links/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.payoutLink.findFirst({
      where: { id: req.params.id, merchantId: req.merchantId },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'Payout link not found' });

    await prisma.payoutLink.delete({ where: { id: req.params.id } });
    recordMerchantAudit(req, 'payout_link.deleted', {
      targetType: 'payout_link',
      targetId: req.params.id,
      metadata: { title: existing.title },
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
