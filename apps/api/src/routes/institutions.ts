import { Router } from 'express';
import { paycrest } from '../services/paycrest.service';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/v1/institutions — banks + mobile money for a fiat currency
router.get('/', async (req, res) => {
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

// POST /api/v1/institutions/verify — resolve bank account name
router.post('/verify', async (req, res) => {
  try {
    const { institution, accountIdentifier, currency } = req.body;
    if (!institution || !accountIdentifier || !currency) {
      return res.status(400).json({ success: false, error: 'institution, accountIdentifier, and currency required' });
    }
    const name = await paycrest.verifyAccount({ institution, accountIdentifier, currency: currency.toUpperCase() });
    res.json({ success: true, data: name });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('verify error: Paycrest request timed out');
      return res.status(408).json({ success: false, error: 'Verification service timed out' });
    }
    console.error('verify error:', err.message);
    res.status(502).json({ success: false, error: err.message });
  }
});

export default router;
