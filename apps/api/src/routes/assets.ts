import { Router } from 'express';
import { SUPPORTED_FIAT, SUPPORTED_CRYPTO } from '../lib/assets';

const router = Router();

// GET /api/v1/assets — returns all supported fiat and crypto assets
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      fiat:   SUPPORTED_FIAT,
      crypto: SUPPORTED_CRYPTO,
    }
  });
});

export default router;
