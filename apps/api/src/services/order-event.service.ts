import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import type { MemoInspection } from './stellar.service';

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

// ── Stellar treasury deposits that don't line up with their order ────────────
// A deposit that is short, or well over, is surfaced as an order event so support and
// the merchant timeline can see money that arrived but didn't settle the order on its
// own. Polling calls this every cycle, so an unchanged total is deduped against the
// last event.

/** Overpayment beyond this fraction of expected is reported (the excess stays in treasury). */
const OVERPAY_REPORT_FRACTION = 1.01;

export function classifyDepositShape(insp: MemoInspection): 'stellar.underpaid' | 'stellar.overpaid' | null {
  if (insp.status === 'underpaid') return 'stellar.underpaid';
  if (insp.status === 'matched' && insp.total > insp.expected * OVERPAY_REPORT_FRACTION) return 'stellar.overpaid';
  return null;
}

export async function reportStellarDepositShape(orderId: string, insp: MemoInspection): Promise<void> {
  const type = classifyDepositShape(insp);
  if (!type) return;

  const last = await prisma.orderEvent.findFirst({
    where: { orderId, type },
    orderBy: { createdAt: 'desc' },
    select: { metadata: true },
  });
  const prevTotal = (last?.metadata as { total?: number } | null)?.total;
  if (prevTotal !== undefined && Math.abs(Number(prevTotal) - insp.total) < 1e-7) return;

  const diff = Math.abs(insp.total - insp.expected);
  recordServerEvent(
    orderId,
    type,
    type === 'stellar.underpaid'
      ? `Stellar deposit is ${diff.toFixed(2)} USDC short (received ${insp.total.toFixed(2)} of ${insp.expected.toFixed(2)})`
      : `Stellar deposit is ${diff.toFixed(2)} USDC over (received ${insp.total.toFixed(2)} of ${insp.expected.toFixed(2)}); excess stays in treasury`,
    {
      total: insp.total,
      expected: insp.expected,
      txHashes: insp.payments.map(p => p.txHash),
      truncated: insp.truncated,
    },
  );
}
