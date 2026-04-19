import { Router } from 'express';
import { paycrest } from '../services/paycrest.service';
import { requireApiKey } from '../middleware/auth';

const router = Router();

// GET /api/v1/institutions — banks + mobile money for a fiat currency
router.get('/', requireApiKey, async (req, res) => {
  try {
    const currency = req.query.currency as string;
    if (!currency) {
      return res.status(400).json({ success: false, error: 'currency query param required' });
    }
    const institutions = await paycrest.getInstitutions(currency.toUpperCase());
    res.json({ success: true, data: institutions });
  } catch (err: any) {
    console.error('institutions error:', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});

export default router;
