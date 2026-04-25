import { Router } from 'express';
import { sendSupportEmail } from '../services/email.service';

const router = Router();

/**
 * POST /api/v1/support/contact
 * Receives a support request from the dashboard.
 */
router.post('/contact', async (req, res) => {
  const { name, email, topic, message } = req.body;

  if (!name || !email || !topic || !message) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    await sendSupportEmail({ name, email, topic, message });
    res.json({ success: true, message: 'Support message sent' });
  } catch (err: any) {
    console.error('[support-route] error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

export default router;
