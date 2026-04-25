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

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid JSON body' });
  }

  if (!payload?.type) {
    return res.status(400).json({ success: false, error: 'Missing event type' });
  }

  const { qstash } = await import('../lib/qstash');
  const baseUrl = process.env.API_BASE || `https://${req.headers.host}/api/v1`;

  await qstash.publishJSON({
    url: `${baseUrl}/jobs/process-webhook`,
    body: {
      source: 'chainrails',
      event:  payload.type,
      data:   payload,
    },
  });

  res.json({ success: true });
});

// POST /api/v1/webhooks/paycrest
router.post('/paycrest', async (req: Request, res: Response) => {
  const rawBody   = req.body.toString();
  const signature = (req.headers['x-paycrest-signature'] as string) ?? 
                    (req.headers['x-pay-signature'] as string) ?? 
                    '';

  console.log(`[webhook] paycrest received. sig: ${signature.slice(0, 12)}... len: ${rawBody.length}`);

  if (!paycrest.verifyWebhookSignature(rawBody, signature)) {
    console.warn(`[webhook] paycrest signature mismatch. length: ${rawBody.length}`);
    return res.status(401).json({ success: false, error: 'Invalid signature' });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid JSON body' });
  }

  const event = payload?.event ?? payload?.type;
  if (!event) {
    console.warn(`[webhook] paycrest missing event field:`, payload);
    return res.status(400).json({ success: false, error: 'Missing event field' });
  }

  const { qstash } = await import('../lib/qstash');
  const baseUrl = process.env.API_BASE || `https://${req.headers.host}/api/v1`;

  await qstash.publishJSON({
    url: `${baseUrl}/jobs/process-webhook`,
    body: {
      source: 'paycrest',
      event,
      data:   payload,
    },
  });

  res.json({ success: true });
});

export default router;
