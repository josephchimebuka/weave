import { Router } from 'express';
import { publicConfigWithTreasuryStatus } from '../services/stellar.service';

const router = Router();

/** Public config for checkout widget — no secrets. */
router.get('/config', async (_req, res) => {
  try {
    res.json({ success: true, data: await publicConfigWithTreasuryStatus() });
  } catch {
    res.status(503).json({ success: false, error: 'Stellar config unavailable' });
  }
});

export default router;
