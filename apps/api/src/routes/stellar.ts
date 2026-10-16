import { Router } from 'express';
import { publicConfig } from '../services/stellar.service';

const router = Router();

/** Public config for checkout widget — no secrets. */
router.get('/config', (_req, res) => {
  res.json({ success: true, data: publicConfig() });
});

export default router;
