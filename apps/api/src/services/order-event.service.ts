import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

/**
 * Payment-session timeline. Records what happened during a single checkout — the
 * payer's journey plus server-side milestones — for the transaction detail view,
 * support, and conversion/fraud analysis.
 *
 * Design:
 *  - Best-effort: never fails the underlying request (fire-and-forget).
 *  - Dual-sink: Postgres (`OrderEvent`, powers the per-transaction UI) AND Axiom
 *    (via the logger, tagged `type: "txn_event"`, for retention + cross-txn
 *    analytics). The two are emitted independently so one failing doesn't lose
 *    the other.
 *  - Trust: `source: "server"` events are authoritative; `source: "client"`
 *    events (from the widget) are informational only and must NEVER drive
 *    security/fraud decisions.
 */

export type OrderEventSource = 'server' | 'client';

export interface OrderEventInput {
  orderId: string;
  type: string;
  label: string;
  source: OrderEventSource;
  metadata?: Record<string, unknown> | null;
  /** Client-reported time (source=client). Defaults to now for server events. */
  occurredAt?: Date;
}

/** Record one order event. Fire-and-forget — safe to call without awaiting. */
export function recordOrderEvent(input: OrderEventInput): void {
  const occurredAt = input.occurredAt ?? new Date();

  // Axiom mirror (independent of the DB write).
  logger.info(
    {
      type: 'txn_event',
      orderId: input.orderId,
      eventType: input.type,
      label: input.label,
      source: input.source,
      eventMetadata: input.metadata ?? null,
    },
    `txn:${input.type}`,
  );

  prisma.orderEvent
    .create({
      data: {
        orderId: input.orderId,
        type: input.type,
        label: input.label,
        source: input.source,
        metadata: (input.metadata ?? undefined) as any,
        occurredAt,
      },
    })
    .catch((err: any) => {
      // Losing a timeline event is not worth failing the request; surface loudly.
      console.error(`[order-event] failed to record "${input.type}" for ${input.orderId}:`, err.message);
    });
}

/** Convenience for a server-authoritative event. */
export function recordServerEvent(
  orderId: string,
  type: string,
  label: string,
  metadata?: Record<string, unknown> | null,
): void {
  recordOrderEvent({ orderId, type, label, source: 'server', metadata });
}
