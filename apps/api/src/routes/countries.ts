import { Router } from 'express';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/v1/ramp/countries
// Demo scope: NGN-only onramp via Paycrest. Expand when more corridors go live.
router.get('/', requireAuth, async (_req, res) => {
  res.json({
    success: true,
    data: [
      { code: 'NG', name: 'Nigeria', currency: 'NGN', paymentMethods: ['bank_transfer', 'mobile_money'] },
    ],
  });
});

export default router;
