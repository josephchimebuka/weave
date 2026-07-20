import * as Sentry from '@sentry/node';
import { logger } from './logger';

/**
 * Report a background/fire-and-forget failure to BOTH the log pipeline (Axiom)
 * and Sentry. Use this instead of a bare `console.error` in `.catch()` handlers
 * for failures that matter operationally — money movement, merchant-can't-
 * transact, notification/webhook delivery — so they actually page you rather
 * than just scrolling past in the logs.
 *
 * Route-handler errors that reach Express are already captured by Sentry's
 * express handler; this is for the swallowed background paths that never do.
 */
export function reportError(
  err: unknown,
  context: { area: string; extra?: Record<string, unknown> },
): void {
  const e = err instanceof Error ? err : new Error(String(err));
  logger.error({ area: context.area, err: e.message, ...(context.extra ?? {}) }, `[${context.area}] ${e.message}`);
  Sentry.captureException(e, { tags: { area: context.area }, extra: context.extra });
}
