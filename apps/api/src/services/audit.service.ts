import type { Request } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

/**
 * Append-only audit trail for security/compliance-sensitive actions.
 *
 * Design rules:
 *  - Best-effort: a failed audit write must NEVER fail the underlying request.
 *    Every call is fire-and-forget with its own catch.
 *  - Never log secrets. Pass identifiers and before/after non-sensitive fields
 *    in `metadata` — never API keys, secret keys, webhook secrets, passwords,
 *    OTP codes, or full bank account numbers.
 *  - Immutable: rows are only ever created. This is enforced at the DB level by
 *    a trigger (migration enforce_auditevent_immutability) that rejects any
 *    UPDATE/DELETE/TRUNCATE — not merely a convention. A second append-only copy
 *    is mirrored to Axiom for cross-system tamper-evidence.
 */

export type AuditActorType = 'merchant' | 'admin' | 'system';

// Platform-admin merchants (the Dewdrop Labs internal account) can view the
// full cross-merchant audit log. Designated by env, matched on the logged-in
// merchant's own email — no schema flag, no separate admin auth. Everyone else
// only ever sees their own events.
const PLATFORM_ADMIN_EMAILS = new Set(
  (process.env.PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return PLATFORM_ADMIN_EMAILS.has(email.trim().toLowerCase());
}

export interface AuditInput {
  merchantId?: string | null;
  actorType: AuditActorType;
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

/** Record an audit event. Fire-and-forget — safe to call without awaiting. */
export function recordAudit(input: AuditInput): void {
  // Independent append-only copy → Axiom (via the logger). Emitted separately
  // from the DB write so it lands even if Postgres is unreachable, and so a
  // tampered/dropped DB row can be cross-checked against Axiom (a separately
  // credentialed system). Tagged `type: 'audit'` for filtering, e.g. in Axiom:
  // `['weave'] | where type == 'audit'`.
  logger.info(
    {
      type: 'audit',
      action: input.action,
      merchantId: input.merchantId ?? null,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      auditMetadata: input.metadata ?? null,
    },
    `audit:${input.action}`,
  );

  prisma.auditEvent
    .create({
      data: {
        merchantId: input.merchantId ?? null,
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        metadata: (input.metadata ?? undefined) as any,
      },
    })
    .catch((err: any) => {
      // Losing an audit row is bad, but never bad enough to fail the user's
      // action. Surface it loudly in logs so it's caught in aggregation.
      console.error(`[audit] failed to record "${input.action}":`, err.message);
    });
}

/**
 * Convenience for session/merchant-authenticated routes: pulls actor id, ip and
 * user-agent off the request so call sites stay one line.
 */
export function recordMerchantAudit(
  req: Request,
  action: string,
  extra: Partial<AuditInput> = {},
): void {
  recordAudit({
    merchantId: req.merchantId ?? null,
    actorType: 'merchant',
    actorId: req.merchantId ?? null,
    action,
    ip: req.ip ?? null,
    userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
    ...extra,
  });
}
