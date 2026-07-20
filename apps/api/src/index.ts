// MUST be first: initializes Sentry (and loads dotenv) before any other module
// so auto-instrumentation can patch Express/Prisma/HTTP as they load.
import { Sentry } from './instrument';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import pinoHttp from 'pino-http';
import { logger, patchConsole } from './lib/logger';
import { requestContext } from './lib/request-context';

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
import accessRequestsRouter from './routes/access-requests';
import kycRouter            from './routes/kyc';
import checkoutRouter       from './routes/checkout';

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

// Route all console.* through pino from here on. (The startup guards above run
// before this and keep raw console, so their fail-fast messages always print
// even though those paths call process.exit before a transport could flush.)
patchConsole();

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

// ── Request logging ───────────────────────────────────────────────────────────
// Structured per-request log (method, url, status, latency, request id) for
// every API call. Placed before rate limiting so even throttled requests are
// recorded. Health checks are skipped to avoid noise.
app.use(pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'];
    const id = (Array.isArray(existing) ? existing[0] : existing) || crypto.randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url === '/',
  },
  // Keep request logs compact — full headers/bodies stay out of the sink.
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
}));

// Seed the async-local request context so every downstream log (service-layer,
// console-routed, audit) carries the same requestId as the request-completed
// line — letting you pull one request's entire log trail by requestId in Axiom.
app.use((req, _res, next) => requestContext.run({ requestId: String((req as any).id) }, next));

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
app.use('/api/v1/access-requests', accessRequestsRouter);
app.use('/api/v1/kyc',             kycRouter);
app.use('/api/v1/checkout',        checkoutRouter);

app.get('/',       (_req, res) => res.json({ status: 'ok', service: 'Weave API v1' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'Weave API v1' }));

// ── Sentry error handler ──────────────────────────────────────────────────────
// Must come AFTER all routes and BEFORE the custom error handler. Captures any
// error that reaches Express (thrown in a handler or passed to next(err)), then
// falls through to the handler below to shape the client response. No-op when
// Sentry isn't initialized.
Sentry.setupExpressErrorHandler(app);

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

// ── Last-resort error capture ─────────────────────────────────────────────────
// Nothing caught these before — a stray unhandled rejection (e.g. in a
// fire-and-forget background task) or uncaught exception would vanish or crash
// silently. Report to Sentry so they're never invisible again.
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[unhandledRejection]', reason);
  Sentry.captureException(reason);
});
process.on('uncaughtException', (err: Error) => {
  console.error('[uncaughtException]', err);
  Sentry.captureException(err);
  // An uncaught exception leaves the process in an undefined state — flush and
  // exit so the platform restarts us cleanly rather than limping on.
  Sentry.flush(2000).finally(() => process.exit(1));
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal: string) {
  console.log(`[shutdown] received ${signal}; closing…`);
  server.close(async () => {
    try { await Sentry.flush(2000); } catch {}
    try { await prisma.$disconnect(); } catch {}
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
