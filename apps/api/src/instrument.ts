// Sentry initialization. This file MUST be imported before any other module in
// the app (it's the first import in index.ts) so Sentry can auto-instrument
// Express, Prisma, HTTP, etc. before those libraries are required.
//
// No-op when SENTRY_DSN is unset — local dev and tests run clean with no config.
import 'dotenv/config';
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    // Tracing is sampled (0.1 = 10% of requests) to stay well inside the free
    // tier; errors are always captured regardless of this rate. Tune via env.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // Tie events to a deploy when the platform exposes a commit SHA.
    release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || undefined,
    // Don't let PII (full request bodies, headers) leave by default — this is a
    // payments API. Opt specific context in via Sentry.setContext where useful.
    sendDefaultPii: false,
  });
  console.log(`[sentry] initialized (env: ${process.env.NODE_ENV || 'development'})`);
} else {
  console.log('[sentry] SENTRY_DSN not set — error reporting disabled');
}

export { Sentry };
