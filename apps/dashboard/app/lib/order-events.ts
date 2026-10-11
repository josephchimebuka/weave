// Shared shapes + display helpers for the payment-session timeline, used by both
// the transaction detail page (server component) and the QuickView side panel
// (client component). Pure module — no server- or client-only imports.

export type OrderEvent = {
  id: string;
  type: string;
  label: string;
  source: 'server' | 'client';
  metadata: Record<string, unknown> | null;
  occurredAt: string;
  createdAt: string;
};

export type OrderTimeline = {
  events: OrderEvent[];
  summary: {
    eventCount: number;
    attempts: number;
    errors: number;
    durationSec: number;
    device?: string | null;
    ip?: string | null;
  };
};

// Timeline dot color by event type.
export const EVENT_TONE: Record<string, string> = {
  'order.created':        'bg-ink-faint',
  'method.selected':      'bg-forest',
  'chain.selected':       'bg-forest',
  'auth_window.opened':   'bg-tan',
  'auth_window.closed':   'bg-tan',
  'deposit.detected':     'bg-forest',
  'step.completed':       'bg-forest',
  'channel.confirmed':    'bg-forest',
  'retry':                'bg-tan',
  'error.shown':          'bg-terracotta',
  'order.completed':      'bg-forest',
  'order.failed':         'bg-terracotta',
  'order.refunded':       'bg-ink-muted',
};

export function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export function eventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
