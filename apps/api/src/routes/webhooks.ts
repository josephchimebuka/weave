import { Router, Request, Response } from 'express';
import { chainRails } from '../services/chainrails.service';
import { paycrest } from '../services/paycrest.service';
import { paystack } from '../services/paystack.service';
import { bachs } from '../services/bachs.service';

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
  const baseUrl = process.env.API_BASE;
  if (!baseUrl) throw new Error('API_BASE env is required for job callbacks');

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
    // verifyWebhookSignature already logs expected-vs-received prefixes for triage.
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
  const baseUrl = process.env.API_BASE;
  if (!baseUrl) throw new Error('API_BASE env is required for job callbacks');

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

// POST /api/v1/webhooks/paystack
router.post('/paystack', async (req: Request, res: Response) => {
  const signature = (req.headers['x-paystack-signature'] as string) ?? '';
  // express.raw() already ran for /webhooks/* — req.body is a Buffer here,
  // same as the Paycrest and ChainRails handlers above.
  const rawBody   = (req.body as Buffer).toString();

  if (!paystack.verifyWebhookSignature(rawBody, signature)) {
    console.warn(`[webhook] paystack signature mismatch`);
    return res.status(401).json({ success: false, error: 'Invalid signature' });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid JSON body' });
  }

  // Paystack uses 'event' for the type
  const event = payload?.event;
  if (!event) {
    return res.status(400).json({ success: false, error: 'Missing event field' });
  }

  const { qstash } = await import('../lib/qstash');
  const baseUrl = process.env.API_BASE;
  if (!baseUrl) throw new Error('API_BASE env is required for job callbacks');

  await qstash.publishJSON({
    url: `${baseUrl}/jobs/process-webhook`,
    body: {
      source: 'paystack',
      event,
      data:   payload.data,
    },
  });

  res.json({ success: true });
});

// POST /api/v1/webhooks/bachs
router.post('/bachs', async (req: Request, res: Response) => {
  // express.raw() already ran for /webhooks/* — req.body is a Buffer here.
  const rawBody   = (req.body as Buffer).toString();
  const signature = (req.headers['x-bachs-signature'] as string) ?? '';
  const timestamp = (req.headers['x-bachs-timestamp'] as string) ?? '';

  if (!bachs.verifyWebhookSignature(rawBody, signature, timestamp)) {
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
  const baseUrl = process.env.API_BASE;
  if (!baseUrl) throw new Error('API_BASE env is required for job callbacks');

  await qstash.publishJSON({
    url: `${baseUrl}/jobs/process-webhook`,
    body: {
      source: 'bachs',
      event:  payload.type,
      // For a Connect event the origin is the connected account; the top-level
      // `account` field carries its id. Pass the whole envelope so the job can
      // route by payload rather than the authenticated org.
      data:   payload,
    },
  });

  res.json({ success: true });
});

export default router;
