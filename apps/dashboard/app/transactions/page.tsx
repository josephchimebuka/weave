'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  TrendingUp,
  Clock,
  CheckCircle2,
  X,
  CreditCard,
  ShoppingBag,
} from 'lucide-react';
import { fetchOrdersPageClient, fetchOrderEventsClient, type OrdersAggregates } from '../lib/dashboard-api-client';
import { directionOf, parseAsset } from '../types';
import type { Order } from '../types';
import { EVENT_TONE, fmtDuration, eventTime, type OrderTimeline } from '../lib/order-events';

type SearchParams = {
  q?: string;
  status?: string;
  direction?: string;
  fromDate?: string;
  toDate?: string;
  sort?: 'createdAt_desc' | 'createdAt_asc' | 'amount_desc' | 'amount_asc';
  selected?: string;
};

const STATUS_PALETTE: Record<string, { chip: string; dot: string; label: string }> = {
  completed: { chip: 'bg-forest-surface text-forest-deep', dot: 'bg-forest', label: 'Completed' },
  processing: { chip: 'bg-tan-mist text-tan-deep', dot: 'bg-tan', label: 'Processing' },
  bridging: { chip: 'bg-tan-mist text-tan-deep', dot: 'bg-tan', label: 'Bridging' },
  awaiting_deposit: { chip: 'bg-tan-mist text-tan-deep', dot: 'bg-tan', label: 'Awaiting' },
  refunded: { chip: 'bg-cream-deep text-ink-soft', dot: 'bg-ink-muted', label: 'Refunded' },
  failed: { chip: 'bg-terracotta-soft text-terracotta', dot: 'bg-terracotta', label: 'Failed' },
  expired: { chip: 'bg-terracotta-soft text-terracotta', dot: 'bg-terracotta', label: 'Expired' },
};

function counterpartyName(order: Order): string {
  return (
    order.sourceInstrument?.bankAccountName ||
    order.destInstrument?.bankAccountName ||
    `Order #${order.id.slice(0, 6).toUpperCase()}`
  );
}

const DIRECTION_LABELS: Record<string, string> = {
  offramp: 'Crypto to fiat',
  onramp: 'Fiat to crypto',
  bridge: 'Cross-chain',
  transfer: 'Transfer',
};

const PROVIDER_NAMES: Record<string, string> = {
  paycrest: 'Paycrest',
  chainrails: 'ChainRails',
  nearintents: 'Near Intents',
  direct: 'Direct Settlement',
};

function orderRef(order: Order): string {
  return `#TR-${order.id.slice(0, 6).toUpperCase()}`;
}

function fmtAmount(amount: number | null, assetKey: string): string {
  if (amount == null) return '—';
  const a = parseAsset(assetKey);
  const dp = a.kind === 'fiat' ? 0 : 4;
  const unit = a.kind === 'fiat' ? a.currency : a.token;
  // If fiat, round to whole number
  const val = a.kind === 'fiat' ? Math.round(amount) : amount;
  return `${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: dp })} ${unit}`;
}

function fmtUsd(n: number | null | undefined): string {
  if (n == null) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function netSettlement(order: Order): number | null {
  // order.destAmount is already the net settlement amount calculated by the API.
  if (order.destAmount == null) return null;
  const isDestFiat = parseAsset(order.destAssetKey).kind === 'fiat';
  // Round fiat amounts to whole numbers for cleaner display
  return isDestFiat ? Math.round(order.destAmount) : order.destAmount;
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + `, ${time}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  );
}

import AutoRefresh from '../AutoRefresh';

const PAGE_SIZE = 25;

type RangeKey = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth' | 'alltime' | 'custom';

const DATE_RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'alltime', label: 'All time' },
  { value: 'custom', label: 'Custom' },
];

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

// Maps a preset (or custom inputs) to createdAt bounds the API understands.
function computeRange(key: RangeKey, customFrom: string, customTo: string): { fromDate?: string; toDate?: string } {
  const now = new Date();
  switch (key) {
    case 'today':
      return { fromDate: startOfDay(now).toISOString(), toDate: endOfDay(now).toISOString() };
    case 'yesterday': {
      const y = new Date(now); y.setDate(now.getDate() - 1);
      return { fromDate: startOfDay(y).toISOString(), toDate: endOfDay(y).toISOString() };
    }
    case 'last7': {
      const from = new Date(now); from.setDate(now.getDate() - 6);
      return { fromDate: startOfDay(from).toISOString(), toDate: endOfDay(now).toISOString() };
    }
    case 'thisMonth': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { fromDate: startOfDay(from).toISOString(), toDate: endOfDay(now).toISOString() };
    }
    case 'lastMonth': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0); // day 0 = last day of prev month
      return { fromDate: startOfDay(from).toISOString(), toDate: endOfDay(to).toISOString() };
    }
    case 'custom': {
      const out: { fromDate?: string; toDate?: string } = {};
      if (customFrom) out.fromDate = startOfDay(new Date(customFrom)).toISOString();
      if (customTo) out.toDate = endOfDay(new Date(customTo)).toISOString();
      return out;
    }
    case 'alltime':
    default:
      return {};
  }
}

export default function TransactionsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [aggregates, setAggregates] = useState<OrdersAggregates>({ completedCount: 0, todayNetSum: 0, pendingNetSum: 0 });
  const [page, setPage] = useState(0); // zero-based
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('completed');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [dateRange, setDateRange] = useState<RangeKey>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search box so we don't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const range = computeRange(dateRange, customFrom, customTo);

  // Any filter change resets to the first page.
  useEffect(() => { setPage(0); }, [debouncedQuery, statusFilter, directionFilter, dateRange, customFrom, customTo]);

  const query = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    q: debouncedQuery || undefined,
    status: statusFilter,
    direction: directionFilter,
    fromDate: range.fromDate,
    toDate: range.toDate,
  };

  const load = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await fetchOrdersPageClient(query);
      setOrders(res.orders);
      setTotal(res.total);
      setAggregates(res.aggregates);
      setError(null);
      setLoading(false);
    } catch (err) {
      if (!isSilent) {
        setError(err instanceof Error ? err.message : 'Failed to load orders');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedQuery, statusFilter, directionFilter, dateRange, customFrom, customTo]);

  const filteredOrders = orders; // filtering is server-side now
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasActiveFilter = !!debouncedQuery || statusFilter !== 'all' || directionFilter !== 'all' || dateRange !== 'alltime';

  // Merchant's active fiat currency, inferred from the current page.
  let currencyCode = 'USD';
  let currencySymbol = '$';
  for (const o of orders) {
    if (o.destAssetKey) {
      const parsed = parseAsset(o.destAssetKey);
      if (parsed.kind === 'fiat') {
        currencyCode = parsed.currency;
        currencySymbol = currencyCode === 'NGN' ? '₦' : currencyCode === 'EUR' ? '€' : currencyCode === 'GBP' ? '£' : '$';
        break;
      }
    }
  }

  const fmtAggregate = (n: number | null | undefined): string => {
    if (n == null || isNaN(n)) return '—';
    const suffix = ['$', '₦', '€', '£'].includes(currencySymbol) ? '' : ` ${currencyCode}`;
    return `${currencySymbol}${Math.round(n).toLocaleString('en-US')}${suffix}`;
  };

  // Stat cards now use server aggregates (whole set, not just this page).
  const statToday = aggregates.todayNetSum;
  const statPending = aggregates.pendingNetSum;
  const statSuccess = aggregates.completedCount;

  const exportParams = new URLSearchParams();
  if (debouncedQuery) exportParams.set('q', debouncedQuery);
  if (statusFilter !== 'all') exportParams.set('status', statusFilter);
  if (directionFilter !== 'all') exportParams.set('direction', directionFilter);
  if (range.fromDate) exportParams.set('fromDate', range.fromDate);
  if (range.toDate) exportParams.set('toDate', range.toDate);

  return (
    <div className="flex flex-col xl:flex-row gap-0 -mx-6 md:-mx-10 lg:-mx-14 -my-8 md:-my-10 min-h-[calc(100vh-2rem)]">
      <AutoRefresh interval={10000} onRefresh={() => load(true)} />
      {/* List side */}
      <div className={`flex-1 flex flex-col overflow-hidden px-6 md:px-10 lg:px-14 py-8 md:py-10 ${selected ? 'xl:max-w-[calc(100%-420px)]' : ''}`}>
        {/* Header */}
        <div className="relative z-30 flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
          <div className="fade-up">
            <h1 className="font-display text-[32px] sm:text-[42px] font-semibold text-ink tracking-tight leading-none">
              Transactions
            </h1>
            <p className="text-ink-muted text-[15px] mt-2">
              Manage and review your recent sales.
            </p>
          </div>

          {error ? (
            <div className="text-terracotta text-[14px] font-medium">{error}</div>
          ) : (
            <div className="flex items-center flex-wrap gap-3 fade-up" style={{ animationDelay: '80ms' }}>
              <div className="relative">
                <Search size={15} strokeWidth={1.9} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search orders..."
                  className="w-64 pl-10 pr-4 py-3 bg-cream-soft border border-hair rounded-full text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-forest/40 focus:ring-0 transition-colors shadow-leaf"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-5 py-3 bg-cream-soft border border-hair rounded-full text-[14px] text-ink-soft hover:text-forest-deep hover:border-forest/30 transition-all shadow-leaf font-medium focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="bridging">Bridging</option>
                <option value="awaiting_deposit">Awaiting</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as RangeKey)}
                className="px-5 py-3 bg-cream-soft border border-hair rounded-full text-[14px] text-ink-soft hover:text-forest-deep hover:border-forest/30 transition-all shadow-leaf font-medium focus:outline-none"
              >
                {DATE_RANGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {dateRange === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="px-3.5 py-3 bg-cream-soft border border-hair rounded-full text-[13px] text-ink-soft focus:outline-none focus:border-forest/40 shadow-leaf"
                  />
                  <span className="text-ink-muted text-[13px]">to</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="px-3.5 py-3 bg-cream-soft border border-hair rounded-full text-[13px] text-ink-soft focus:outline-none focus:border-forest/40 shadow-leaf"
                  />
                </div>
              )}
              <ExportMenu baseParams={exportParams.toString()} />


            </div>
          )}
        </div>        {/* Stat cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="h-32 bg-cream-soft border border-hair-soft rounded-3xl animate-pulse" />
            <div className="h-32 bg-cream-soft border border-hair-soft rounded-3xl animate-pulse" />
            <div className="h-32 bg-cream-soft border border-hair-soft rounded-3xl animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <StatCard
              label="Today's Sales"
              value={fmtAggregate(statToday)}
              footer={
                <span className="inline-flex items-center gap-1 text-ink-muted text-[12px]">
                  Gross volume via Weave
                </span>
              }
              delay={120}
            />
            <StatCard
              label="Pending Volume"
              value={fmtAggregate(statPending)}
              footer={
                <span className="inline-flex items-center gap-1 text-ink-muted text-[12px]">
                  Awaiting final settlement
                </span>
              }
              delay={160}
            />
            <StatCard
              label="Completed Orders"
              value={String(statSuccess)}
              footer={
                <span className="inline-flex items-center gap-1 text-ink-muted text-[12px]">
                  Successfully processed
                </span>
              }
              delay={200}
            />
          </div>
        )}

        {/* Transaction list */}
        <div className="relative rounded-3xl bg-cream-soft border border-hair-soft shadow-leaf overflow-hidden flex-1 flex flex-col fade-up" style={{ animationDelay: '240ms' }}>
          <div className="grid grid-cols-[48px_1fr_auto] sm:grid-cols-[60px_minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] gap-4 px-4 sm:px-6 py-4 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted border-b border-hair-soft">
            <div>Icon</div>
            <div>Customer</div>
            <div className="hidden sm:block">Date &amp; Time</div>
            <div className="text-center min-w-20 sm:min-w-25">Status</div>
            <div className="hidden sm:block text-right min-w-22.5">Settlement</div>
          </div>

          {loading && orders.length === 0 ? (
            <div className="py-20 text-center text-[14px] text-ink-muted">Loading transactions…</div>
          ) : filteredOrders.length === 0 ? (
            <EmptyList hasFilter={hasActiveFilter} onClear={() => { setSearchQuery(''); setStatusFilter('all'); setDirectionFilter('all'); setDateRange('alltime'); }} />
          ) : (
            <div className="flex-1 overflow-y-auto">
              {filteredOrders.map((o) => {
                const status = STATUS_PALETTE[o.status] ?? STATUS_PALETTE.processing;
                const isSel = selected?.id === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setSelected(isSel ? null : o)}
                    className={`w-full grid grid-cols-[48px_1fr_auto] sm:grid-cols-[60px_minmax(0,1.4fr)_minmax(0,1.4fr)_auto_auto] gap-4 items-center px-4 sm:px-6 py-4 border-l-[3px] border-b border-hair-soft/60 last:border-b-0 transition-all cursor-pointer text-left ${isSel
                      ? 'border-l-forest bg-forest-mist/60'
                      : 'border-l-transparent hover:bg-cream-deep/40'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isSel ? 'bg-forest text-cream-soft' : 'bg-cream-deep text-ink-muted'
                      }`}>
                      <ShoppingBag size={16} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-col sm:block">
                        <p className="font-semibold text-ink text-[14px] truncate">{counterpartyName(o)}</p>
                        <p className="sm:hidden font-bold text-ink text-[13px] mt-0.5">
                          {fmtAmount(netSettlement(o), o.destAssetKey)}
                        </p>
                      </div>
                      <p className="text-[11px] sm:text-[12px] text-ink-muted truncate">
                        Order {orderRef(o)}
                      </p>
                    </div>
                    <div className="hidden sm:block text-start text-[13px] text-ink-soft">
                      {fmtWhen(o.createdAt)}
                      <p className="text-[11px] text-ink-faint">Direction: {DIRECTION_LABELS[directionOf(o)] || directionOf(o)}</p>
                    </div>
                    <div className="text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium ${status.chip}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </div>
                    <div className="hidden sm:block text-right font-semibold text-ink tabular-nums whitespace-nowrap text-[14px]">
                      {fmtAmount(netSettlement(o), o.destAssetKey)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-t border-hair-soft bg-cream-soft">
              <p className="text-[12px] text-ink-muted tabular-nums">
                {total === 0 ? 'No results' : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total.toLocaleString()}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || loading}
                  className="px-3.5 py-2 rounded-full text-[13px] font-medium border border-hair text-ink-soft hover:text-forest-deep hover:border-forest/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <span className="text-[12px] text-ink-muted tabular-nums px-1">Page {page + 1} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1 || loading}
                  className="px-3.5 py-2 rounded-full text-[13px] font-medium border border-hair text-ink-soft hover:text-forest-deep hover:border-forest/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick-view side panel */}
      {selected && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-40 xl:hidden transition-opacity duration-300"
            onClick={() => setSelected(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-cream-soft border-l border-hair-soft overflow-y-auto slide-in-right xl:sticky xl:top-0 xl:z-auto xl:flex xl:flex-col xl:w-105 xl:h-screen">
            <QuickView
              order={selected}
              onClose={() => setSelected(null)}
            />
          </aside>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  footer,
  delay = 0,
}: {
  label: string;
  value: string;
  footer: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="relative rounded-3xl bg-cream-soft border border-hair-soft shadow-leaf px-6 py-5 fade-up overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-[13px] font-medium text-ink-muted">{label}</p>
      <p className="mt-2 font-display text-[34px] leading-tight font-semibold text-ink tabular-nums">
        {value}
      </p>
      <div className="mt-3">{footer}</div>
    </div>
  );
}

function EmptyList({ hasFilter, onClear }: { hasFilter: boolean; onClear?: () => void }) {
  return (
    <div className="py-20 text-center">
      <p className="text-[14px] text-ink-muted">
        {hasFilter ? 'No transactions match your filters.' : 'No transactions yet.'}
      </p>
      {hasFilter && (
        <button onClick={onClear} className="inline-block mt-3 text-[13px] text-forest-deep font-semibold hover:underline">
          Clear filters
        </button>
      )}
    </div>
  );
}

// Export menu — "Everything" (respects current filters) or a custom date range.
function ExportMenu({ baseParams }: { baseParams: string }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const buildHref = (withRange: boolean) => {
    const p = new URLSearchParams(baseParams);
    if (withRange) {
      if (from) p.set('fromDate', new Date(from).toISOString());
      // Include the whole `to` day.
      if (to) p.set('toDate', new Date(new Date(to).setHours(23, 59, 59, 999)).toISOString());
    }
    const qs = p.toString();
    return `/transactions/export${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-5 py-3 bg-forest text-cream-soft rounded-full text-[14px] hover:bg-forest-deep transition-all shadow-leaf font-medium"
      >
        <Download size={15} strokeWidth={2} />
        Export
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 z-40 rounded-2xl bg-cream-soft border border-hair-soft shadow-leaf-lg p-3 fade-up">
            <a
              href={buildHref(false)}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-[13.5px] text-ink hover:bg-cream-deep/50 transition-colors"
            >
              Export everything
              <span className="block text-[11.5px] text-ink-muted">All transactions matching current filters</span>
            </a>
            <div className="my-2 border-t border-hair-soft" />
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-muted mb-2">Date range</p>
            <div className="px-3 flex flex-col gap-2">
              <label className="text-[11px] text-ink-muted">From
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-cream border border-hair rounded-lg text-[13px] text-ink focus:outline-none focus:border-forest/40" />
              </label>
              <label className="text-[11px] text-ink-muted">To
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-cream border border-hair rounded-lg text-[13px] text-ink focus:outline-none focus:border-forest/40" />
              </label>
              <a
                href={buildHref(true)}
                onClick={(e) => { if (!from && !to) e.preventDefault(); else setOpen(false); }}
                aria-disabled={!from && !to}
                className={`mt-1 text-center px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                  from || to ? 'bg-forest text-cream-soft hover:bg-forest-deep' : 'bg-cream-deep text-ink-faint cursor-not-allowed'
                }`}
              >
                Export range
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function QuickView({ order, onClose }: { order: Order; onClose: () => void }) {
  const [timeline, setTimeline] = useState<OrderTimeline | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingTimeline(true);
    setTimeline(null);
    fetchOrderEventsClient(order.id).then((t) => {
      if (!cancelled) { setTimeline(t); setLoadingTimeline(false); }
    });
    return () => { cancelled = true; };
  }, [order.id]);

  const status = STATUS_PALETTE[order.status] ?? STATUS_PALETTE.processing;
  const headline = fmtAmount(netSettlement(order), order.destAssetKey);
  const customer = counterpartyName(order);
  const email =
    order.sourceInstrument?.walletAddress ||
    order.sourceInstrument?.bankAccountIdentifier ||
    `${customer.toLowerCase().replace(/\s+/g, '.')}@user.weave`;
  const initials = customer
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  const firstProvider = order.steps?.[0]?.provider || 'direct';
  const providerName = PROVIDER_NAMES[firstProvider] || firstProvider.toUpperCase();

  return (
    <>
      <div className="px-6 pt-7 pb-5 border-b border-hair-soft">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display text-[32px] font-semibold text-ink tabular-nums leading-none">
              {headline}
            </h2>
            <span className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium ${status.chip}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-cream-deep text-ink-muted flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={17} strokeWidth={1.9} />
          </button>
        </div>

        {/* Customer card */}
        <div className="flex items-center gap-3 bg-cream-deep/60 rounded-2xl px-4 py-3.5 border border-hair-soft">
          <div className="w-11 h-11 rounded-full bg-linear-to-br from-tan-soft to-parchment text-tan-deep flex items-center justify-center font-semibold text-sm">
            {initials || '—'}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-ink text-[14px] truncate">{customer}</p>
            <p className="text-[12px] text-ink-muted truncate font-mono">{email}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 flex-1 flex flex-col gap-6">
        {/* Transaction details */}
        <div>
          <h3 className="text-[11px] font-semibold tracking-[0.15em] uppercase text-ink-muted mb-3">
            Transaction Details
          </h3>
          <div className="bg-cream-deep/40 rounded-2xl px-5 py-4 border border-hair-soft flex flex-col gap-3 text-[13px]">
            <div className="flex justify-between">
              <span className="text-ink-muted">Order ID</span>
              <span className="font-mono text-ink text-[12px] truncate max-w-[200px]">{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Date</span>
              <span className="font-medium text-ink">{fmtDate(order.createdAt)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-ink-muted shrink-0">Instrument</span>
              <span className="font-medium text-ink flex items-center gap-1.5 truncate">
                <CreditCard size={13} strokeWidth={1.9} className="text-ink-muted" />
                {order.sourceAssetKey.split(':')[1]?.toUpperCase() || 'Payment'}
              </span>
            </div>
          </div>
        </div>

        {/* Assets breakdown */}
        <div>
          <h3 className="text-[11px] font-semibold tracking-[0.15em] uppercase text-ink-muted mb-3">
            Balance Movement
          </h3>
          <div className="bg-cream-deep/40 rounded-2xl px-5 py-4 border border-hair-soft flex flex-col gap-3 text-[13px]">
            <div className="flex justify-between">
              <span className="text-ink-soft">Customer Paid</span>
              <span className="text-ink font-medium tabular-nums">{fmtAmount(order.sourceAmount, order.sourceAssetKey)}</span>
            </div>
            <div className="rule-dotted my-1" />
            <div className="flex justify-between font-semibold text-[14px]">
              <span className="text-ink">Net Settlement</span>
              <span className="text-forest-deep tabular-nums">{fmtAmount(netSettlement(order), order.destAssetKey)}</span>
            </div>
          </div>
        </div>

        {/* Payment activity — the payer's session timeline */}
        {!loadingTimeline && timeline && timeline.events.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-semibold tracking-[0.15em] uppercase text-ink-muted">
                Payment Activity
              </h3>
              <div className="flex items-center gap-3 text-[11px] text-ink-muted">
                <span>{fmtDuration(timeline.summary.durationSec)}</span>
                {timeline.summary.errors > 0 && <span className="text-terracotta font-medium">{timeline.summary.errors} err</span>}
              </div>
            </div>
            {(timeline.summary.device || timeline.summary.ip) && (
              <div className="flex items-center gap-4 mb-3 text-[12px] text-ink-muted">
                {timeline.summary.device && <span>Device <span className="text-ink font-medium">{timeline.summary.device}</span></span>}
                {timeline.summary.ip && <span>IP <span className="text-ink font-mono">{timeline.summary.ip}</span></span>}
              </div>
            )}
            <ol className="relative border-l border-hair-soft ml-1">
              {timeline.events.map((e) => (
                <li key={e.id} className="relative pl-5 pb-3.5 last:pb-0">
                  <span className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full ring-2 ring-cream-soft ${EVENT_TONE[e.type] ?? 'bg-ink-faint'}`} />
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12.5px] text-ink leading-snug">
                      {e.label}
                      {e.source === 'client' && (
                        <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-wide text-ink-faint">reported</span>
                      )}
                    </span>
                    <span className="text-[11px] text-ink-muted tabular-nums shrink-0">{eventTime(e.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="mt-auto pt-4 flex items-center justify-between text-[12px] text-ink-muted border-t border-hair-soft/50 pt-6">
          <span>Processed via {providerName}</span>
          <Link href={`/transactions/${order.id}`} className="text-forest-deep font-semibold hover:underline">
            View Details →
          </Link>
        </div>
      </div>

      <div className="pb-4" />
    </>
  );
}

