'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { Landmark, Clock, CheckCircle2, AlertTriangle, ArrowRight, Banknote, Search, Download } from 'lucide-react';
import AutoRefresh from '../AutoRefresh';
import { Select } from '../../components/Select';

type PayoutStatus = 'pending' | 'processing' | 'paid' | 'blocked' | 'failed' | 'refunded' | string;

interface LedgerItem {
  orderId: string;
  reference: string | null;
  customer: string | null;
  amountNgn: number;
  status: PayoutStatus;
  at: string;
}
interface Ledger {
  summary: {
    processingNgn: number;
    paidNgn: number;
    blockedCount: number;
    failedCount: number;
    holdSeconds: number;
    destination: { bank: string; accountLast4: string } | null;
  };
  items: LedgerItem[];
}

type RangeKey = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth' | 'alltime';
const DATE_RANGES: { value: RangeKey; label: string }[] = [
  { value: 'alltime', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
];
const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All status' },
  { value: 'paid', label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
function computeRange(key: RangeKey): { from?: Date; to?: Date } {
  const now = new Date();
  switch (key) {
    case 'today': return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': { const y = new Date(now); y.setDate(now.getDate() - 1); return { from: startOfDay(y), to: endOfDay(y) }; }
    case 'last7': { const f = new Date(now); f.setDate(now.getDate() - 6); return { from: startOfDay(f), to: endOfDay(now) }; }
    case 'thisMonth': return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: endOfDay(now) };
    case 'lastMonth': return {
      from: startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
    default: return {};
  }
}

const naira = (n: number) =>
  `₦${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const shortDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const holdLabel = (s: number) => {
  if (!s) return null;
  if (s % 3600 === 0) return `${s / 3600}h`;
  if (s % 60 === 0) return `${s / 60}m`;
  return `${s}s`;
};

function StatusChip({ status }: { status: PayoutStatus }) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    paid:       { label: 'Paid',       cls: 'bg-forest/8 text-forest-deep border-forest/20', dot: 'bg-forest' },
    processing: { label: 'Processing', cls: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-500' },
    pending:    { label: 'Processing', cls: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-500' },
    blocked:    { label: 'Blocked',    cls: 'bg-red-50 text-red-700 border-red-200',         dot: 'bg-red-500' },
    failed:     { label: 'Failed',     cls: 'bg-red-50 text-red-700 border-red-200',         dot: 'bg-red-500' },
    refunded:   { label: 'Refunded',   cls: 'bg-cream-deep/50 text-ink-soft border-hair',    dot: 'bg-ink-muted' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-cream-deep/40 text-ink-muted border-hair-soft', dot: 'bg-ink-faint' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] font-medium ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function Card({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <div
      className={`relative rounded-[24px] bg-cream-soft border border-hair-soft shadow-leaf fade-up ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="p-6">{children}</div>
    </div>
  );
}

// Thin wrapper: the shared Select with this page's pill styling + options array.
function FilterSelect({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="pl-4 py-2.5 bg-cream-soft border border-hair rounded-full text-[13.5px] text-ink-soft hover:text-forest-deep hover:border-forest/30 transition-all font-medium focus:outline-none cursor-pointer"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Select>
  );
}

// Normalise a status to the bucket the filter uses (pending reads as processing).
const bucket = (s: PayoutStatus) => (s === 'pending' ? 'processing' : s);

function exportCsv(items: LedgerItem[]) {
  // Quote for CSV AND neutralise spreadsheet formula injection: a customer-supplied
  // cell starting with = + - @ (or tab/CR) is prefixed with ' so Excel/Sheets treats
  // it as text, not a formula. `customer`/`reference` are payer-controlled.
  const esc = (v: string) => {
    const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const isoOrBlank = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toISOString(); };
  const header = ['Date', 'Amount (NGN)', 'Status', 'Customer', 'Reference', 'Order ID'];
  const rows = items.map((i) => [
    isoOrBlank(i.at),
    String(i.amountNgn),
    bucket(i.status),
    i.customer ?? '',
    i.reference ?? '',
    i.orderId,
  ].map(esc).join(','));
  const csv = [header.map(esc).join(','), ...rows].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `payouts-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PayoutsPage() {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [range, setRange] = useState<RangeKey>('alltime');

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/merchant/payouts/ledger', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load payouts');
      setLedger(data);
      setError(null);
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const s = ledger?.summary;
  const hold = holdLabel(s?.holdSeconds ?? 0);

  const filtered = useMemo(() => {
    const items = ledger?.items ?? [];
    const q = query.trim().toLowerCase();
    const { from, to } = computeRange(range);
    return items.filter((i) => {
      if (statusFilter !== 'all' && bucket(i.status) !== statusFilter) return false;
      if (from || to) {
        const t = new Date(i.at).getTime();
        if (from && t < from.getTime()) return false;
        if (to && t > to.getTime()) return false;
      }
      if (q) {
        const hay = `${i.customer ?? ''} ${i.reference ?? ''} ${i.orderId} ${i.status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ledger, query, statusFilter, range]);

  const hasFilter = !!query.trim() || statusFilter !== 'all' || range !== 'alltime';

  return (
    <div>
      <AutoRefresh interval={20000} onRefresh={() => load(true)} />

      {/* Header */}
      <div className="fade-up mb-8">
        <h1 className="font-display text-[32px] sm:text-[42px] font-semibold text-ink tracking-tight leading-none">
          Payouts
        </h1>
        <p className="text-ink-muted text-[15px] mt-2">
          Naira collected from your customers, settled to your bank.
          {s?.destination && (
            <> Paying out to <span className="text-ink-soft font-medium">{s.destination.bank} ••{s.destination.accountLast4}</span>.</>
          )}
        </p>
      </div>

      {error ? (
        <div className="text-terracotta text-[14px] font-medium fade-up">{error}</div>
      ) : loading ? (
        <div className="h-40 rounded-[24px] bg-cream-deep/50 animate-pulse fade-up" />
      ) : (
        <>
          {/* Blocked alert — needs merchant action */}
          {!!s && s.blockedCount > 0 && (
            <div className="fade-up mb-6 flex items-start gap-3 rounded-[20px] border border-red-200 bg-red-50 px-5 py-4">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-[13px] text-red-700 leading-relaxed">
                <span className="font-semibold">{s.blockedCount} payout{s.blockedCount > 1 ? 's' : ''} blocked.</span>{' '}
                We couldn&apos;t verify your payout bank, so these funds are safely on hold. {' '}
                <Link href="/settings?tab=payouts" className="underline font-medium hover:text-red-800">Check your payout bank →</Link>
              </div>
            </div>
          )}

          {/* Summary stats — always all-time totals, independent of the filters below */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card delay={40}>
              <div className="flex items-center gap-2 text-ink-muted text-[12px] font-semibold uppercase tracking-widest mb-2">
                <Clock size={14} /> Processing
              </div>
              <div className="font-display text-[28px] font-semibold text-ink leading-none">{naira(s?.processingNgn ?? 0)}</div>
              <div className="text-[12px] text-ink-muted mt-2">
                {hold ? `On its way — pays out ~${hold} after each sale` : 'On its way to your bank'}
              </div>
            </Card>
            <Card delay={80}>
              <div className="flex items-center gap-2 text-ink-muted text-[12px] font-semibold uppercase tracking-widest mb-2">
                <CheckCircle2 size={14} /> Paid out
              </div>
              <div className="font-display text-[28px] font-semibold text-forest-deep leading-none">{naira(s?.paidNgn ?? 0)}</div>
              <div className="text-[12px] text-ink-muted mt-2">Settled to your bank</div>
            </Card>
            <Card delay={120}>
              <div className="flex items-center gap-2 text-ink-muted text-[12px] font-semibold uppercase tracking-widest mb-2">
                <Landmark size={14} /> Destination
              </div>
              {s?.destination ? (
                <>
                  <div className="font-display text-[20px] font-semibold text-ink leading-tight">{s.destination.bank}</div>
                  <div className="text-[13px] text-ink-muted mt-1 font-mono">••••{s.destination.accountLast4}</div>
                </>
              ) : (
                <Link href="/settings?tab=payouts" className="text-[14px] text-forest-deep hover:underline">Set a payout bank →</Link>
              )}
            </Card>
          </div>

          {/* Ledger */}
          <Card delay={160}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3 text-forest-deep">
                <Banknote size={18} strokeWidth={1.9} />
                <h2 className="font-display text-[20px] font-semibold text-ink">Payout history</h2>
                <span className="text-[12px] text-ink-muted tabular-nums font-normal">
                  {filtered.length.toLocaleString()}{hasFilter ? ` of ${(ledger?.items.length ?? 0).toLocaleString()}` : ''}
                </span>
              </div>

              {!!ledger?.items.length && (
                <div className="flex items-center flex-wrap gap-2.5">
                  <div className="relative">
                    <Search size={15} strokeWidth={1.9} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search payouts..."
                      className="w-48 pl-10 pr-4 py-2.5 bg-cream-soft border border-hair rounded-full text-[13.5px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-forest/40 transition-colors"
                    />
                  </div>
                  <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />
                  <FilterSelect value={range} onChange={(v) => setRange(v as RangeKey)} options={DATE_RANGES} />
                  <button
                    onClick={() => exportCsv(filtered)}
                    disabled={!filtered.length}
                    className="flex items-center gap-2 px-4 py-2.5 bg-forest text-cream-soft rounded-full text-[13.5px] hover:bg-forest-deep transition-all font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Download size={15} strokeWidth={2} />
                    Export
                  </button>
                </div>
              )}
            </div>
            {!ledger?.items.length ? (
              <div className="py-12 text-center">
                <p className="text-[14px] text-ink-muted">No naira payouts yet.</p>
                <p className="text-[12px] text-ink-faint mt-1">They&apos;ll appear here once customers pay you in naira.</p>
              </div>
            ) : !filtered.length ? (
              <div className="py-12 text-center">
                <p className="text-[14px] text-ink-muted">No payouts match your filters.</p>
                <button
                  onClick={() => { setQuery(''); setStatusFilter('all'); setRange('alltime'); }}
                  className="text-[12px] text-forest-deep hover:underline mt-1"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="divide-y divide-hair-soft">
                {filtered.map((it) => (
                  <Link
                    key={it.orderId}
                    href={`/transactions/${it.orderId}`}
                    className="group flex items-center justify-between gap-4 py-3.5 -mx-2 px-2 rounded-xl hover:bg-cream-deep/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-display text-[16px] font-semibold text-ink">{naira(it.amountNgn)}</div>
                      <div className="text-[12px] text-ink-muted truncate">
                        {it.customer || it.reference || it.orderId.slice(0, 8)} · {shortDate(it.at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusChip status={it.status} />
                      <ArrowRight size={15} className="text-ink-faint group-hover:text-forest-deep group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
