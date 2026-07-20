import util from 'util';
import pino from 'pino';
import { currentRequestId } from './request-context';

// ── Structured logger ─────────────────────────────────────────────────────────
// One pino instance for the whole API. Behaviour by environment:
//   • AXIOM_TOKEN + AXIOM_DATASET set → ship to Axiom AND stdout (multi-target
//     worker transport). This is the primary path on a long-running host.
//   • dev, no Axiom → pino-pretty (human-readable, colorized).
//   • prod, no Axiom → plain JSON to stdout (fastest, no worker thread). On a
//     platform with a log drain (e.g. Vercel → Axiom), that drain ships stdout.
//
// Serverless note: worker-thread transports can be killed when a function
// freezes, so on serverless prefer stdout JSON + a platform log drain over the
// in-process Axiom transport (leave AXIOM_TOKEN unset there).

const isProd = process.env.NODE_ENV === 'production';
const level = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

// Serverless-first by default. pino worker-thread transports don't bundle/
// resolve reliably on Vercel/Lambda ("unable to determine transport target")
// and can be killed on freeze, so the DEFAULT everywhere is plain JSON to
// stdout — ship to Axiom via a platform Log Drain (Vercel → Axiom).
// The in-process Axiom worker transport is OPT-IN (AXIOM_INPROCESS=true) and
// only for long-running hosts that don't have a drain.
const isServerless = !!(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.FUNCTIONS_WORKER_RUNTIME
);
const allowAxiomTransport = process.env.AXIOM_INPROCESS === 'true' && !isServerless;

const axiomToken = process.env.AXIOM_TOKEN;
const axiomDataset = process.env.AXIOM_DATASET;
// Axiom's client defaults to the US cloud endpoint. Non-US datasets need an
// explicit endpoint via AXIOM_URL. Use the region's EDGE url, e.g.
//   EU:  https://eu-central-1.aws.edge.axiom.co
//   US:  https://us-east-1.aws.edge.axiom.co
// Edge urls route to `edgeUrl` (path /v1/ingest/<dataset>); a legacy
// api.*.axiom.co host routes to `url` (path /v1/datasets/<dataset>/ingest).
// Defaults to the EU edge endpoint (where the Weave dataset lives); override
// via AXIOM_URL for other regions (e.g. https://us-east-1.aws.edge.axiom.co).
const axiomUrl = process.env.AXIOM_URL || 'https://eu-central-1.aws.edge.axiom.co';
const axiomUrlOption = axiomUrl.includes('edge.axiom.co')
  ? { edgeUrl: axiomUrl }
  : { url: axiomUrl };

// Fields attached to every log line, plus redaction so credentials/PII never
// reach the log sink. Redaction covers both flat fields and the request-header
// shapes emitted by pino-http.
const baseOptions: pino.LoggerOptions = {
  level,
  base: { service: 'weave-api', env: process.env.NODE_ENV || 'development' },
  // Stamp every log emitted during a request with its id (see request-context).
  // Outside a request (startup, background jobs) this is a no-op.
  mixin() {
    const requestId = currentRequestId();
    return requestId ? { requestId } : {};
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'req.headers["x-secret-key"]',
      'req.headers["x-session-token"]',
      'res.headers["set-cookie"]',
      'password',
      'passwordHash',
      'secret',
      'secretKey',
      'apiKey',
      'token',
      'webhookSecret',
      'otp',
      'otpCode',
      // Defensive: audit events mask secrets at the source, but guard against a
      // future recordAudit() call carelessly placing one under auditMetadata.
      'auditMetadata.password',
      'auditMetadata.secret',
      'auditMetadata.secretKey',
      'auditMetadata.apiKey',
      'auditMetadata.token',
      'auditMetadata.webhookSecret',
      'auditMetadata.otp',
      'auditMetadata.otpCode',
      'auditMetadata.accessCode',
      'auditMetadata.privateKey',
    ],
    censor: '[redacted]',
  },
};

function build(): pino.Logger {
  // Pretty output for local DX (never serverless, never prod).
  if (!isServerless && !isProd && process.env.LOG_PRETTY !== 'false') {
    return pino(
      baseOptions,
      pino.transport({
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,service,env' },
      }),
    );
  }
  // Opt-in in-process Axiom transport, long-running hosts only.
  if (allowAxiomTransport && axiomToken && axiomDataset) {
    const targets: pino.TransportTargetOptions[] = [
      { target: '@axiomhq/pino', options: { dataset: axiomDataset, token: axiomToken, ...axiomUrlOption }, level },
      { target: 'pino/file', options: { destination: 1 }, level }, // also stdout
    ];
    return pino(baseOptions, pino.transport({ targets }));
  }
  // Default (serverless + prod): plain JSON to stdout; ship to Axiom via a drain.
  return pino(baseOptions);
}

export const logger = build();

if (allowAxiomTransport && axiomToken && axiomDataset) {
  logger.info('[logger] shipping logs to Axiom via in-process transport');
} else if (isProd) {
  logger.info('[logger] logging JSON to stdout (ship to Axiom via a platform log drain)');
}

// ── console → pino bridge ─────────────────────────────────────────────────────
// The codebase has ~130 existing console.* calls. Rather than rewrite each one,
// route console through pino so every line becomes a structured, Axiom-shipped
// log with zero churn. New code should call `logger` (or a child logger with
// context, e.g. logger.child({ orderId })) directly for structured fields.
//
// Tradeoff: this replaces Sentry's console breadcrumb capture. Sentry still
// records full exceptions with stack traces — only the console-line breadcrumbs
// attached to them are lost, which is an acceptable trade for unified logging.
export function patchConsole(): void {
  console.log = (...args: unknown[]) => logger.info(util.format(...args));
  console.info = (...args: unknown[]) => logger.info(util.format(...args));
  console.warn = (...args: unknown[]) => logger.warn(util.format(...args));
  console.error = (...args: unknown[]) => logger.error(util.format(...args));
  console.debug = (...args: unknown[]) => logger.debug(util.format(...args));
}
