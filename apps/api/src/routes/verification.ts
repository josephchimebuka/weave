import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { sendAdminKYBNotification } from '../services/email.service';
import { recordMerchantAudit } from '../services/audit.service';

const router = Router();

// GET /api/verification — Fetch current progress
router.get('/', requireAuth, async (req, res) => {
  try {
    const verification = await prisma.businessVerification.findUnique({
      where: { merchantId: req.merchantId },
    });
    res.json({ success: true, data: verification });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/verification — Save progress (incremental updates)
router.patch('/', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    
    // Security: Whitelist fields to prevent mass assignment (setting status=verified)
    const whitelistedData = {
      firstName:       data.firstName,
      lastName:        data.lastName,
      dob:             data.dob,
      personalAddress: data.personalAddress,
      legalName:       data.legalName,
      dba:             data.dba,
      entityType:      data.entityType,
      regNumber:       data.regNumber,
      businessAddress: data.businessAddress,
      city:            data.city,
      state:           data.state,
      postalCode:      data.postalCode,
      documentUrls:    data.documentUrls,
    };

    const verification = await prisma.businessVerification.upsert({
      where: { merchantId: req.merchantId },
      update: { ...whitelistedData, updatedAt: new Date() },
      create: { 
        ...whitelistedData, 
        merchantId: req.merchantId,
        status: 'none' 
      },
    });

    res.json({ success: true, data: verification });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/verification/submit — Final submission
router.post('/submit', requireAuth, async (req, res) => {
  try {
    const verification = await prisma.businessVerification.update({
      where: { merchantId: req.merchantId },
      data: { 
        status: 'pending',
        submittedAt: new Date()
      },
    });

    await prisma.merchant.update({
      where: { id: req.merchantId },
      data: { kycLevel: 'pending' }
    });

    recordMerchantAudit(req, 'kyb.submitted', {
      targetType: 'verification',
      targetId: verification.id,
    });

    // Notify company admin via email with approve/reject magic links
    sendAdminKYBNotification(verification.id).catch(err => {
      console.error('[verification] failed to trigger admin notification email:', err.message);
    });

    res.json({ success: true, data: verification });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
