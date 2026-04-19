import { Router, Request, Response } from 'express';
import { webhookQueue } from '../queues/webhooks';
import { chainRails } from '../services/chainrails.service';
import { paycrest } from '../services/paycrest.service';

const router = Router();

// POST /api/v1/webhooks/chainrails
router.post('/chainrails', async (req: Request, res: Response) => {
  const rawBody   = req.body.toString();
  const signature = (req.headers['x-chainrails-signature'] as string) ?? '';
  const timestamp = (req.headers['x-chainrails-timestamp'] as string) ?? '';

  if (!chainRails.verifyWebhookSignature(rawBody, signature, timestamp)) {
    return res.status(401).json({ success: false, error: 'Invalid signature' });
  }

  const payload = JSON.parse(rawBody);
  await webhookQueue.add('chainrails_event', {
    source: 'chainrails',
    event:  payload.type,       // docs: envelope field is `type`
    data:   payload,
  });

  res.json({ success: true });
});

// POST /api/v1/webhooks/paycrest
router.post('/paycrest', async (req: Request, res: Response) => {
  const rawBody   = req.body.toString();
  const signature = (req.headers['x-paycrest-signature'] as string) ?? '';

  if (!paycrest.verifyWebhookSignature(rawBody, signature)) {
    return res.status(401).json({ success: false, error: 'Invalid signature' });
  }

  const payload = JSON.parse(rawBody);
  await webhookQueue.add('paycrest_event', {
    source: 'paycrest',
    event:  payload.event ?? payload.type,
    data:   payload,
  });

  res.json({ success: true });
});

export default router;
