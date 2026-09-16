import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { sendAdminKYBNotification } from '../services/email.service';
import { recordMerchantAudit } from '../services/audit.service';
import { qstash } from '../lib/qstash';

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
      websiteUrl:         data.websiteUrl,
      productDescription: data.productDescription,
      supportEmail:       data.supportEmail,
      productCategory:    data.productCategory,
      socialMedia:        data.socialMedia,
      businessBvn:         data.businessBvn,
      dateOfRegistration:  data.dateOfRegistration,
      directorBvn:         data.directorBvn,
      directorPhone:       data.directorPhone,
      ownershipPercentage: data.ownershipPercentage,
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

    // Notify company admin via email (carries the review magic link). Routed
    // through QStash — not called in-process — so a transient Resend/DB blip gets
    // real retries instead of silently dropping the admin's only notification.
    const apiBase = process.env.API_BASE;
    if (apiBase) {
      await qstash.publishJSON({
        url:  `${apiBase}/jobs/notify-admin-kyb`,
        body: { verificationId: verification.id },
      }).catch(err => {
        // The enqueue itself failing is the one spot with no downstream retry —
        // fall back to an in-process send so the alert still has a chance to land.
        console.error('[verification] failed to enqueue admin KYB notification:', err.message);
        sendAdminKYBNotification(verification.id).catch(e =>
          console.error('[verification] fallback admin KYB email also failed:', e.message));
      });
    } else {
      // No QStash target configured (e.g. local dev) — send directly.
      console.warn('[verification] API_BASE not set — sending admin KYB email in-process');
      sendAdminKYBNotification(verification.id).catch(err =>
        console.error('[verification] admin KYB email failed:', err.message));
    }

    res.json({ success: true, data: verification });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
