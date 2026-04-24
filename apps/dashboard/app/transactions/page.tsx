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
import { fetchOrdersClient as fetchOrders, fetchOrderClient as fetchOrder, applyOrderFilter } from '../lib/dashboard-api-client';
import { directionOf, parseAsset } from '../types';
import type { Order } from '../types';

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
  if (order.destAmount == null) return null;
  const isDestFiat = parseAsset(order.destAssetKey).kind === 'fiat';
  if (!isDestFiat) return order.destAmount;
  
  const feeInDest = (order.senderFeeUsd || 0) * (order.quoteRate || 0);
  const net = Math.max(0, order.destAmount - feeInDest);
  return Math.round(net);
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

export default function TransactionsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [selected, setSelected] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const rawOrders = await fetchOrders(10);
        setOrders(rawOrders);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders');
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filter orders based on search and filters
  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      counterpartyName(o).toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'all' || o.status === statusFilter;

    const matchesDirection =
      directionFilter === 'all' || directionOf(o) === directionFilter;

    return matchesSearch && matchesStatus && matchesDirection;
  });

  // Stat aggregates
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayDone = orders.filter((o) => o.status === 'completed' && o.createdAt.slice(0, 10) === todayStr);
  const pending = orders.filter((o) => ['awaiting_deposit', 'processing', 'bridging'].includes(o.status));

  // Determine merchant's active fiat currency from their recent orders
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
    // Remove space between currency symbol and amount if it's a standard token, or include currency code for others
    const suffix = ['$', '₦', '€', '£'].includes(currencySymbol) ? '' : ` ${currencyCode}`;
    return `${currencySymbol}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
  };

  const todaySalesFiat = todayDone.reduce((sum, o) => sum + (netSettlement(o) ?? 0), 0);
  const pendingFiat = pending.reduce((sum, o) => sum + (netSettlement(o) ?? 0), 0);
  const completedCount = orders.filter((o) => o.status === 'completed').length;

  const statToday = todaySalesFiat;
  const statPending = pendingFiat;
  const statSuccess = completedCount;

  const recent = filteredOrders.slice(0, 4);

  return (
    <div className="flex flex-col xl:flex-row gap-0 -mx-6 md:-mx-10 lg:-mx-14 -my-8 md:-my-10 min-h-[calc(100vh-2rem)]">
      {/* List side */}
      <div className={`flex-1 flex flex-col overflow-hidden px-6 md:px-10 lg:px-14 py-8 md:py-10 ${selected ? 'xl:max-w-[calc(100%-420px)]' : ''}`}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
          <div className="fade-up">
            <h1 className="font-display text-[42px] font-semibold text-ink tracking-tight leading-none">
              Transactions
            </h1>
            <p className="text-ink-muted text-[15px] mt-2">
              Manage and review your recent sales.
            </p>
          </div>

          {error ? (
            <div className="text-terracotta text-[14px] font-medium">{error}</div>
          ) : (
            <div className="flex items-center gap-3 fade-up" style={{ animationDelay: '80ms' }}>
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
              <Link
                href="/transactions/export"
                className="flex items-center gap-2 px-5 py-3 bg-forest text-cream-soft rounded-full text-[14px] hover:bg-forest-deep transition-all shadow-leaf font-medium"
              >
                <Download size={15} strokeWidth={2} />
                Export
              </Link>
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
          <div className="grid grid-cols-[60px_minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] gap-4 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted border-b border-hair-soft">
            <div>Icon</div>
            <div>Customer</div>
            <div className="hidden sm:block">Date &amp; Time</div>
            <div className="text-center min-w-25">Status</div>
            <div className="text-right min-w-22.5">Settlement</div>
          </div>

          {filteredOrders.length === 0 ? (
            <EmptyList hasFilter={searchQuery.length > 0 || statusFilter !== 'all'} />
          ) : (
            <div className="flex-1 overflow-y-auto">
              {filteredOrders.map((o) => {
                const status = STATUS_PALETTE[o.status] ?? STATUS_PALETTE.processing;
                const isSel = selected?.id === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setSelected(isSel ? null : o)}
                    className={`w-full grid grid-cols-[60px_minmax(0,1.4fr)_minmax(0,1.4fr)_auto_auto] gap-4 items-center px-6 py-4 border-l-[3px] border-b border-hair-soft/60 last:border-b-0 transition-all cursor-pointer text-left ${isSel
                      ? 'border-l-forest bg-forest-mist/60'
                      : 'border-l-transparent hover:bg-cream-deep/40'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isSel ? 'bg-forest text-cream-soft' : 'bg-cream-deep text-ink-muted'
                      }`}>
                      <ShoppingBag size={16} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink text-[14px] truncate">{counterpartyName(o)}</p>
                      <p className="text-[12px] text-ink-muted truncate">
                        Order {orderRef(o)}
                      </p>
                    </div>
                    <div className="text-start w-[calc(40%-theme(space.4))] hidden sm:block text-[13px] text-ink-soft">
                      {fmtWhen(o.createdAt)}
                      <p className="text-[11px] text-ink-faint">Direction: {DIRECTION_LABELS[directionOf(o)] || directionOf(o)}</p>
                    </div>
                    <div className="text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium ${status.chip}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </div>
                    <div className="text-right font-semibold text-ink tabular-nums whitespace-nowrap text-[14px]">
                      {fmtAmount(netSettlement(o), o.destAssetKey)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick-view side panel */}
      {selected && (
        <aside className="hidden xl:flex flex-col w-105 h-screen bg-cream-soft border-l border-hair-soft overflow-y-auto slide-in-right">
          <QuickView
            order={selected}
            onClose={() => setSelected(null)}
          />
        </aside>
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

function EmptyList({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="py-20 text-center">
      <p className="text-[14px] text-ink-muted">
        {hasFilter ? 'No transactions match your filters.' : 'No transactions yet.'}
      </p>
      {hasFilter && (
        <Link href="/transactions" className="inline-block mt-3 text-[13px] text-forest-deep font-semibold hover:underline">
          Clear filters
        </Link>
      )}
    </div>
  );
}

function QuickView({ order, onClose }: { order: Order; onClose: () => void }) {
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

