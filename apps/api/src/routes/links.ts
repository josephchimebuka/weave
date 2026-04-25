import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireSession } from '../middleware/auth';
import { linkCreationLimiter, apiLimiter } from '../middleware/rate-limit';

const router = Router();

// GET /api/v1/links
// Fetches all payment links for the logged-in merchant.
router.get('/', requireSession, async (req, res) => {
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
router.post('/', requireSession, linkCreationLimiter, async (req, res) => {
  try {
    const { title, description, amount, asset } = req.body;

    if (!title || !asset || amount === undefined || amount === null) {
      return res.status(400).json({ success: false, error: 'Title, asset, and amount are required' });
    }

    const merchant = await prisma.merchant.findUnique({ where: { id: req.merchantId } });
    if (!merchant) return res.status(404).json({ success: false, error: 'Merchant not found' });

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
        asset: link.asset,
        merchantName: link.merchant.name,
        publishableKey: link.merchant.publishableKey,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/links/:id
// Updates an existing payment link.
router.patch('/:id', requireSession, async (req, res) => {
  try {
    const { title, description, amount, asset, isActive } = req.body;
    
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

    return res.json({ success: true, data: link });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/links/:id
// Deletes a payment link.
router.delete('/:id', requireSession, async (req, res) => {
  try {
    const existing = await prisma.paymentLink.findFirst({
      where: { id: req.params.id, merchantId: req.merchantId }
    });
    if (!existing) return res.status(404).json({ success: false, error: 'Link not found' });

    await prisma.paymentLink.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
