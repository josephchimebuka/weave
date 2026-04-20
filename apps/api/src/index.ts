import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import quotesRouter       from './routes/quotes';
import ordersRouter       from './routes/orders';
import webhooksRouter     from './routes/webhooks';
import institutionsRouter from './routes/institutions';
import countriesRouter    from './routes/countries';

import { ensureMerchantDefaultInstruments } from './lib/merchant';

// Start BullMQ workers (webhook-driven + NEAR Intents poller)
import './queues/webhooks';
import './queues/nearintents_poller';

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));

// Raw body needed for webhook signature verification
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());

app.use('/api/v1/quotes',       quotesRouter);
app.use('/api/v1/orders',       ordersRouter);
app.use('/api/v1/webhooks',     webhooksRouter);
app.use('/api/v1/institutions', institutionsRouter);
app.use('/api/v1/ramp/countries', countriesRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'Weave API v1' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`Weave API listening on :${PORT}`);
  try {
    await ensureMerchantDefaultInstruments();
  } catch (err: any) {
    console.warn('[bootstrap] ensureMerchantDefaultInstruments failed:', err.message);
  }
});
