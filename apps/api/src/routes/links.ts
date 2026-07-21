import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { linkCreationLimiter, apiLimiter } from '../middleware/rate-limit';
import { recordMerchantAudit } from '../services/audit.service';

const router = Router();

// GET /api/v1/links
// Fetches all payment links for the logged-in merchant.
router.get('/', requireAuth, async (req, res) => {
  try {
    const links = await prisma.paymentLink.findMany({
      where: { merchantId: req.merchantId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: links });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/links
// Creates a new payment link.
router.post('/', requireAuth, linkCreationLimiter, async (req, res) => {
  try {
    const { title, description, amount, asset } = req.body;

    if (!title || !asset || amount === undefined || amount === null) {
      return res.status(400).json({ success: false, error: 'Title, asset, and amount are required' });
    }
    if (title.length > 100) return res.status(400).json({ success: false, error: 'Title too long' });
    if (description && description.length > 500) return res.status(400).json({ success: false, error: 'Description too long' });

    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'Merchant not found' });

    if (!merchant.emailVerifiedAt && merchant.kycLevel === 'none') {
      return res.status(403).json({
        success: false,
        error:   'Email verification required to create payment links.',
        code:    'EMAIL_VERIFICATION_REQUIRED',
      });
    }

    const link = await prisma.paymentLink.create({
      data: {
        merchantId: merchant.id,
        title,
        description,
        amount: parseFloat(String(amount)),
        asset,
        isActive: true,
      },
    });

    recordMerchantAudit(req, 'link.created', {
      targetType: 'payment_link',
      targetId: link.id,
      metadata: { title, asset, amount: parseFloat(String(amount)) },
    });

    return res.json({ success: true, data: link });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/links/public/:slug
// Public endpoint for the hosted checkout page. Fetches link details + merchant info safely.
router.get('/public/:slug', apiLimiter, async (req, res) => {
  try {
    const link = await prisma.paymentLink.findUnique({
      where: { id: req.params.slug },
      include: {
        merchant: {
          select: { name: true, publishableKey: true, defaultPayoutInstrumentId: true },
        },
      },
    });

    if (!link || !link.isActive) {
      return res.status(404).json({ success: false, error: 'Payment link not found or inactive' });
    }

    // Resolve the merchant's settlement corridor (asset key only — never bank/wallet
    // details) so the widget can route fiat payments correctly: NGN→NGN goes straight
    // to Paystack, NGN→crypto requires the Paycrest onramp + refund account.
    let settlementAssetKey: string | null = null;
    if (link.merchant.defaultPayoutInstrumentId) {
      const payout = await prisma.instrument.findUnique({
        where: { id: link.merchant.defaultPayoutInstrumentId },
        select: { assetKey: true },
      });
      settlementAssetKey = payout?.assetKey ?? null;
    }

    return res.json({
      success: true,
      data: {
        id: link.id,
        title: link.title,
        description: link.description,
        amount: link.amount,
        asset: link.asset,
        merchantName: link.merchant.name,
        publishableKey: link.merchant.publishableKey,
        settlementAssetKey,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/links/:id
// Updates an existing payment link.
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { title, description, amount, asset, isActive } = req.body;
    if (title && title.length > 100) return res.status(400).json({ success: false, error: 'Title too long' });
    if (description && description.length > 500) return res.status(400).json({ success: false, error: 'Description too long' });
    
    // Safety check: ensure the link belongs to the merchant
    const existing = await prisma.paymentLink.findFirst({
      where: { id: req.params.id, merchantId: req.merchantId }
    });
    if (!existing) return res.status(404).json({ success: false, error: 'Link not found' });

    const link = await prisma.paymentLink.update({
      where: { id: req.params.id },
      data: {
        title: title ?? undefined,
        description: description ?? undefined,
        amount: amount !== undefined ? parseFloat(String(amount)) : undefined,
        asset: asset ?? undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    // Record which fields changed. Toggling active/inactive is called out
    // explicitly since it's the most consequential edit.
    const changed: string[] = [];
    if (title !== undefined) changed.push('title');
    if (description !== undefined) changed.push('description');
    if (amount !== undefined) changed.push('amount');
    if (asset !== undefined) changed.push('asset');
    if (isActive !== undefined) changed.push(isActive ? 'activated' : 'deactivated');
    recordMerchantAudit(req, 'link.updated', {
      targetType: 'payment_link',
      targetId: link.id,
      metadata: { title: link.title, changed },
    });

    return res.json({ success: true, data: link });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/links/:id
// Deletes a payment link.
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.paymentLink.findFirst({
      where: { id: req.params.id, merchantId: req.merchantId }
    });
    if (!existing) return res.status(404).json({ success: false, error: 'Link not found' });

    await prisma.paymentLink.delete({ where: { id: req.params.id } });
    recordMerchantAudit(req, 'link.deleted', {
      targetType: 'payment_link',
      targetId: req.params.id,
      metadata: { title: existing.title },
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
