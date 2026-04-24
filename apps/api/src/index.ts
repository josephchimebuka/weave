import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

import quotesRouter       from './routes/quotes';
import ordersRouter       from './routes/orders';
import webhooksRouter     from './routes/webhooks';
import institutionsRouter from './routes/institutions';
import countriesRouter    from './routes/countries';
import authRouter         from './routes/auth';
import merchantRouter     from './routes/merchant';
import linksRouter        from './routes/links';
import verificationRouter from './routes/verification';
import adminRouter        from './routes/admin';

import { ensureMerchantDefaultInstruments } from './lib/merchant';
import { prisma } from './lib/prisma';

// Start BullMQ workers (webhook-driven + NEAR Intents poller + outgoing dispatch)
import './queues/webhooks';
import './queues/nearintents_poller';
import './queues/outgoing_webhooks';

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));

// Apply broad rate limiting to all API requests
import { apiLimiter } from './middleware/rate-limit';
app.use('/api', apiLimiter);

// Raw body needed for webhook signature verification
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());

app.use('/api/v1/quotes',        quotesRouter);
app.use('/api/v1/orders',        ordersRouter);
app.use('/api/v1/webhooks',      webhooksRouter);
app.use('/api/v1/institutions',  institutionsRouter);
app.use('/api/v1/ramp/countries', countriesRouter);
app.use('/api/v1/auth',          authRouter);
app.use('/api/v1/merchant',      merchantRouter);
app.use('/api/v1/links',         linksRouter);
app.use('/api/v1/verification',  verificationRouter);
app.use('/api/v1/admin',         adminRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'Weave API v1' }));

// ── Global error handler ─────────────────────────────────────────────────────
// Catches any unhandled errors thrown inside route handlers / middleware.
// Without this, Express would silently hang the request.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled error]', err?.message ?? err);
  if (!res.headersSent) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Startup ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, async () => {
  console.log(`Weave API listening on :${PORT}`);
  try {
    await ensureMerchantDefaultInstruments();
  } catch (err: any) {
    console.warn('[bootstrap] ensureMerchantDefaultInstruments failed:', err.message);
  }
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal: string) {
  console.log(`[shutdown] received ${signal}; closing…`);
  server.close(async () => {
    try { await prisma.$disconnect(); } catch {}
    process.exit(0);
  });
  // Force exit if graceful close takes too long
  setTimeout(() => process.exit(1), 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
