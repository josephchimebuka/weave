import { Router } from 'express';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/v1/ramp/countries — fiat corridors enabled on Weave's Paycrest rail.
router.get('/', requireAuth, async (_req, res) => {
  res.json({
    success: true,
    data: [
      { code: 'NG', name: 'Nigeria',  currency: 'NGN', paymentMethods: ['bank_transfer', 'mobile_money'] },
      { code: 'KE', name: 'Kenya',    currency: 'KES', paymentMethods: ['bank_transfer', 'mobile_money'] },
      { code: 'UG', name: 'Uganda',   currency: 'UGX', paymentMethods: ['bank_transfer', 'mobile_money'] },
      { code: 'TZ', name: 'Tanzania', currency: 'TZS', paymentMethods: ['bank_transfer', 'mobile_money'] },
    ],
  });
});

export default router;
