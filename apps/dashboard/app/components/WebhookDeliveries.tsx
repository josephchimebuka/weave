'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2, XCircle, Clock, RefreshCw, Eye, X, SlidersHorizontal,
} from 'lucide-react';
import { apiFetch } from '../lib/api-fetch';
import { toast } from './Toaster';

type Delivery = {
  id:          string;
  event:       string;
  url:         string;
  status:      'success' | 'failed' | 'retrying' | string;
  statusCode:  number | null;
  attempts:    number;
  maxAttempts: number;
  orderId:     string | null;
  payload:     unknown;
  response:    string | null;
  createdAt:   string;
  updatedAt:   string;
};

type StatusFilter = 'all' | 'success' | 'failed' | 'retrying';

// ── Presentation helpers ──────────────────────────────────────────────────────

function statusMeta(status: string): { label: string; chip: string; Icon: typeof CheckCircle2; iconClass: string } {
  switch (status) {
    case 'success':
      return { label: 'Completed', chip: 'text-forest-deep', Icon: CheckCircle2, iconClass: 'text-forest' };
    case 'failed':
      return { label: 'Failed', chip: 'text-red-600', Icon: XCircle, iconClass: 'text-red-500' };
    default:
      return { label: 'Retrying', chip: 'text-amber-700', Icon: Clock, iconClass: 'text-amber-500' };
  }
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
}

function fmtDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${date} | ${time}`;
  } catch { return iso; }
}

function prettyJson(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
  }
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function WebhookDeliveries() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Delivery | null>(null);
  const [resendingId, setResending] = useState<string | null>(null);
  const [filter, setFilter]         = useState<StatusFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [mounted, setMounted]       = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const load = useCallback(async () => {
    const res = await apiFetch<Delivery[]>('/api/merchant/webhook/deliveries?limit=100');
    if (res.ok) setDeliveries(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function resend(d: Delivery) {
    setResending(d.id);
    const res = await apiFetch<Delivery>(`/api/merchant/webhook/deliveries/${d.id}/resend`, { method: 'POST' });
    setResending(null);
    if (!res.ok) {
      toast.error(res.error || 'Failed to resend webhook.');
      return;
    }
    // A resend is its own new delivery row — prepend it (newest first). If the
    // detail panel was open on the delivery we resent, switch it to the new row.
    setDeliveries((rows) => [res.data, ...rows]);
    setSelected((s) => (s && s.id === d.id ? res.data : s));
    if (res.data.status === 'success') toast.success('Webhook delivered.');
    else toast.error(`Resend failed${res.data.statusCode ? ` (${res.data.statusCode})` : ''}.`);
  }

  const rows = filter === 'all' ? deliveries : deliveries.filter((d) => d.status === filter);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[22px] font-semibold text-ink">Delivery history</h2>
          <p className="text-[14px] text-ink-muted mt-1">Inspect recent webhook deliveries and retry failed ones.</p>
        </div>

        {/* Filter lives outside the overflow-hidden card so its menu isn't clipped */}
        <div className="relative shrink-0">
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-hair text-[13px] text-ink-soft hover:border-forest/30 hover:text-forest-deep transition-colors bg-cream-soft"
          >
            <SlidersHorizontal size={14} strokeWidth={1.9} />
            {filter === 'all' ? 'Filter' : statusMeta(filter).label}
          </button>
          {filterOpen && (
            <>
              {/* click-away backdrop */}
              <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
              <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-44 bg-cream-soft border border-hair rounded-xl shadow-leaf-lg py-1.5">
                {(['all', 'success', 'failed', 'retrying'] as StatusFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => { setFilter(f); setFilterOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-[13px] transition-colors hover:bg-cream-deep/60 ${
                      filter === f ? 'text-forest-deep font-semibold' : 'text-ink-soft'
                    }`}
                  >
                    {f === 'all' ? 'All deliveries' : statusMeta(f).label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-cream-soft border border-hair-soft rounded-[20px] overflow-hidden shadow-leaf">
        {/* Header row */}
        <div className="hidden sm:grid grid-cols-[160px_minmax(0,1fr)_180px_180px] gap-4 px-6 py-3 border-b border-hair-soft/70 text-[11px] font-bold uppercase tracking-widest text-ink-faint">
          <span>Date</span>
          <span>Webhook</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="px-6 py-16 text-center text-[13px] text-ink-muted">Loading deliveries…</div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-[14px] font-medium text-ink">No webhook deliveries yet</p>
            <p className="text-[13px] text-ink-muted mt-1">
              {filter === 'all'
                ? 'Deliveries appear here once orders trigger events to your endpoint.'
                : `No ${statusMeta(filter).label.toLowerCase()} deliveries.`}
            </p>
          </div>
        ) : (
          rows.map((d) => {
            const s = statusMeta(d.status);
            return (
              <div
                key={d.id}
                className="grid grid-cols-[1fr_auto] sm:grid-cols-[160px_minmax(0,1fr)_180px_180px] gap-3 sm:gap-4 items-center px-4 sm:px-6 py-4 border-b border-hair-soft/50 last:border-b-0 hover:bg-cream-deep/30 transition-colors"
              >
                <div className="hidden sm:block text-[13px] text-ink-soft">{fmtDate(d.createdAt)}</div>
                <div className="min-w-0">
                  <p className="text-[13px] text-ink truncate">
                    <span className="font-bold mr-2">POST</span>
                    <span className="text-ink-muted">{d.url}</span>
                  </p>
                  <p className="sm:hidden text-[11px] text-ink-faint mt-0.5">{fmtDate(d.createdAt)} · {d.event}</p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <s.Icon size={16} strokeWidth={2} className={s.iconClass} />
                  <span className={`text-[13px] font-medium ${s.chip}`}>
                    {d.statusCode ? `${d.statusCode} ` : ''}{s.label}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setSelected(d)}
                    className="px-3.5 py-1.5 rounded-lg border border-hair text-[12.5px] text-ink-soft hover:border-forest/30 hover:text-forest-deep transition-colors bg-cream"
                  >
                    View
                  </button>
                  <button
                    onClick={() => resend(d)}
                    disabled={resendingId === d.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-forest text-cream-soft text-[12.5px] font-medium hover:bg-forest-deep transition-colors shadow-leaf disabled:opacity-60"
                  >
                    {resendingId === d.id
                      ? <><RefreshCw size={12} className="animate-spin" /> Sending…</>
                      : 'Resend'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail slide-over */}
      {mounted && selected && createPortal(
        <DetailPanel
          delivery={selected}
          onClose={() => setSelected(null)}
          onResend={() => resend(selected)}
          resending={resendingId === selected.id}
        />,
        document.body,
      )}
    </div>
  );
}

// ── Slide-over ─────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-hair-soft/60 last:border-b-0">
      <span className="text-[13px] text-ink-muted shrink-0">{label}</span>
      <span className="text-[13px] text-ink font-medium text-right break-all">{value}</span>
    </div>
  );
}

function DetailPanel({
  delivery, onClose, onResend, resending,
}: {
  delivery: Delivery;
  onClose: () => void;
  onResend: () => void;
  resending: boolean;
}) {
  const s = statusMeta(delivery.status);
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative w-full max-w-md h-full bg-cream shadow-leaf-lg border-l border-hair overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-cream/95 backdrop-blur border-b border-hair-soft">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-forest/10 text-forest flex items-center justify-center">
              <s.Icon size={16} strokeWidth={2} className={s.iconClass} />
            </div>
            <h3 className="font-display text-[16px] font-semibold text-ink">Webhook delivery</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-cream-deep/60 transition-colors">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Summary card */}
          <div className="bg-cream-soft border border-hair-soft rounded-2xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-faint mb-1">POST</p>
            <p className="text-[13px] text-ink break-all mb-3">{delivery.url}</p>
            <Row label="Type" value={delivery.event} />
            {delivery.orderId && <Row label="Order ID" value={<span className="font-mono text-[12px]">{delivery.orderId}</span>} />}
            <Row label="Status" value={<span className={s.chip}>{s.label}</span>} />
            <Row label="Created on" value={fmtDateTime(delivery.createdAt)} />
            <Row label="Last updated" value={fmtDateTime(delivery.updatedAt)} />
            <Row label="Response code" value={delivery.statusCode ?? '—'} />
            <Row label="Attempts" value={delivery.attempts} />
            <Row label="Max attempts" value={delivery.maxAttempts} />
          </div>

          {/* Request body */}
          <div>
            <p className="text-[13px] font-semibold text-ink mb-2">Request Body</p>
            <pre className="bg-ink/[0.04] border border-hair-soft rounded-2xl p-4 text-[12px] font-mono text-ink-soft overflow-x-auto leading-[1.6] max-h-72">
              <code>{prettyJson(delivery.payload) || '—'}</code>
            </pre>
          </div>

          {/* Response body */}
          <div>
            <p className="text-[13px] font-semibold text-ink mb-2">Response Body</p>
            <pre className="bg-ink/[0.04] border border-hair-soft rounded-2xl p-4 text-[12px] font-mono text-ink-soft overflow-x-auto leading-[1.6] max-h-60">
              <code>{prettyJson(delivery.response) || '—'}</code>
            </pre>
          </div>

          {/* Resend */}
          <button
            onClick={onResend}
            disabled={resending}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-forest text-cream-soft font-semibold text-[14px] hover:bg-forest-deep transition-colors shadow-leaf disabled:opacity-60"
          >
            {resending ? <><RefreshCw size={15} className="animate-spin" /> Sending…</> : <><RefreshCw size={15} /> Resend webhook</>}
          </button>
        </div>
      </aside>
    </div>
  );
}
