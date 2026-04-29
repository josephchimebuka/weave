import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

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
import assetsRouter       from './routes/assets';
import supportRouter      from './routes/support';
import jobsRouter         from './routes/jobs';

import { ensureMerchantDefaultInstruments } from './lib/merchant';
import { prisma } from './lib/prisma';

// ── Startup guards ───────────────────────────────────────────────────────────
// Fail fast before binding any port. These environment variables are required
// in production and their absence indicates a misconfigured deployment.

if (process.env.NODE_ENV === 'production') {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (!allowedOrigins.length) {
    console.error('[startup] CRITICAL: ALLOWED_ORIGINS must be set in production. Refusing to start with wildcard CORS.');
    process.exit(1);
  }
  if (!process.env.API_BASE) {
    console.error('[startup] CRITICAL: API_BASE must be set in production. Webhook callback URLs cannot be constructed safely without it.');
    process.exit(1);
  }
  if (process.env.SKIP_QSTASH_VERIFICATION === 'true') {
    console.error('[startup] CRITICAL: SKIP_QSTASH_VERIFICATION cannot be true in production. Job endpoints would be unauthenticated.');
    process.exit(1);
  }
}

const app = express();

// ── Trust proxy ──────────────────────────────────────────────────────────────
// Tells Express to trust the first X-Forwarded-For hop so req.ip reflects the
// real client IP rather than the proxy's IP. Adjust the number if you have
// multiple proxy layers (e.g. Cloudflare → platform proxy → app = 2).
app.set('trust proxy', 1);

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);

app.use(cors((req: any, callback) => {
  const origin = req.header('Origin');
  const isPublicRoute = 
    req.path.startsWith('/api/v1/quotes') || 
    req.path.startsWith('/api/v1/orders') || 
    req.path.startsWith('/api/v1/assets') || 
    req.path.startsWith('/api/v1/links/public');

  // 1. If it's a public/widget route, allow the origin (browser won't send credentials unless origin is reflected)
  if (isPublicRoute) {
    return callback(null, { origin: true, credentials: true });
  }

  // 2. For sensitive routes (Auth/Dashboard), strictly check the whitelist
  if (!origin || allowedOrigins.includes(origin)) {
    return callback(null, { origin: true, credentials: true });
  }

  // 3. Fallback for development (allow local iteration)
  if (process.env.NODE_ENV !== 'production') {
    return callback(null, { origin: true, credentials: true });
  }

  // Reject the origin
  callback(new Error('Not allowed by CORS'));
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
import { apiLimiter } from './middleware/rate-limit';
app.use('/api', apiLimiter);

// ── Body parsing ──────────────────────────────────────────────────────────────
// Webhook routes need the raw Buffer for HMAC verification — must run BEFORE express.json.
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }));

app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString();
  },
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1/quotes',         quotesRouter);
app.use('/api/v1/orders',         ordersRouter);
app.use('/api/v1/webhooks',       webhooksRouter);
app.use('/api/v1/institutions',   institutionsRouter);
app.use('/api/v1/ramp/countries', countriesRouter);
app.use('/api/v1/auth',           authRouter);
app.use('/api/v1/merchant',       merchantRouter);
app.use('/api/v1/links',          linksRouter);
app.use('/api/v1/verification',   verificationRouter);
app.use('/api/v1/admin',          adminRouter);
app.use('/api/v1/assets',         assetsRouter);
app.use('/api/v1/support',        supportRouter);
app.use('/api/v1/jobs',           jobsRouter);

app.get('/',       (_req, res) => res.json({ status: 'ok', service: 'Weave API v1' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'Weave API v1' }));

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled error]', err?.message ?? err);
  if (!res.headersSent) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Startup ───────────────────────────────────────────────────────────────────
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
  setTimeout(() => process.exit(1), 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
