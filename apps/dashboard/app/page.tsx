import Link from 'next/link';
import { TrendingUp, Download, Link2, ShoppingCart, Briefcase, CheckCircle2, ArrowRight, Bell, HelpCircle, Receipt } from 'lucide-react';
import { requireServerSession } from './lib/auth-server';
import { fetchOrders, fetchMerchantProfile } from './lib/dashboard-api';
import { parseAsset } from './types';
import type { Order } from './types';
import AutoRefresh from './AutoRefresh';

type StatusTone = {
  bg: string;
  dot: string;
  text: string;
  label: string;
};

const STATUS_PALETTE: Record<string, StatusTone> = {
  completed: { bg: 'bg-forest-surface', dot: 'bg-forest', text: 'text-forest-deep', label: 'Succeeded' },
  processing: { bg: 'bg-tan-mist', dot: 'bg-tan', text: 'text-tan-deep', label: 'Processing' },
  bridging: { bg: 'bg-tan-mist', dot: 'bg-tan', text: 'text-tan-deep', label: 'Bridging' },
  awaiting_deposit: { bg: 'bg-tan-mist', dot: 'bg-tan', text: 'text-tan-deep', label: 'Awaiting' },
  refunded: { bg: 'bg-cream-deep', dot: 'bg-ink-muted', text: 'text-ink-soft', label: 'Refunded' },
  failed: { bg: 'bg-terracotta-soft', dot: 'bg-terracotta', text: 'text-terracotta', label: 'Failed' },
};

const AVATAR_TONES = [
  'bg-tan-mist text-tan-deep',
  'bg-forest-surface text-forest-deep',
  'bg-cream-deep text-ink-soft',
  'bg-parchment text-tan-deep',
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function merchantFirstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first || 'there';
}

function merchantInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return '?';
}

function avatarInitials(order: Order): string {
  const src = order.sourceInstrument?.bankAccountName || order.destInstrument?.bankAccountName;
  if (src) {
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  }
  return order.id.slice(0, 2).toUpperCase();
}

function counterpartyName(order: Order): string {
  return (
    order.sourceInstrument?.bankAccountName ||
    order.destInstrument?.bankAccountName ||
    `Order ${order.id.slice(0, 8)}`
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + `, ${time}`;
}

function formatUsd(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function netSettlement(order: Order): number {
  if (order.destAmount == null) return 0;
  const isDestFiat = parseAsset(order.destAssetKey).kind === 'fiat';
  if (!isDestFiat) return order.destAmount;

  // For fiat settlements, Weave/Paycrest fee is often bundled in the gross destAmount.
  // We subtract the fee at the target rate to show what actually hits the bank.
  const feeInDest = (order.senderFeeUsd || 0) * (order.quoteRate || 0);
  const net = Math.max(0, order.destAmount - feeInDest);
  return Math.round(net);
}

// Previously misnamed 'approximateFiat', we now use the net settlement amount.
function approximateFiat(o: Order): number {
  return netSettlement(o);
}

export default async function Page() {
  await requireServerSession();
  const [orders, merchant] = await Promise.all([
    fetchOrders(30),
    fetchMerchantProfile(),
  ]);
  const merchantName = merchant?.name ?? 'Merchant';

  const completed = orders.filter((o) => o.status === 'completed');
  const active = orders.filter((o) =>
    ['awaiting_deposit', 'processing', 'bridging'].includes(o.status),
  );

  // Determine active currency — Default to NGN as requested
  let currencyCode = 'NGN';
  let currencySymbol = '₦';

  if (orders.length > 0) {
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
  }

  const fmtAggregate = (n: number | null | undefined): string => {
    if (n == null || isNaN(n)) return '—';
    const suffix = ['$', '₦', '€', '£'].includes(currencySymbol) ? '' : ` ${currencyCode}`;
    // Nigerians usually expect whole numbers or 2 decimals for Naira
    const formatted = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${currencySymbol}${formatted}${suffix}`;
  };

  // 30-day revenue window
  const totalUsd = completed.reduce((sum, o) => sum + approximateFiat(o), 0);
  const displayTotal = totalUsd;

  // Simple growth indicator — compare last 15 days vs prior 15
  const now = Date.now();
  const recentHalf = completed
    .filter((o) => now - +new Date(o.createdAt) <= 15 * 86_400_000)
    .reduce((s, o) => s + approximateFiat(o), 0);
  const priorHalf = completed
    .filter((o) => {
      const age = now - +new Date(o.createdAt);
      return age > 15 * 86_400_000 && age <= 30 * 86_400_000;
    })
    .reduce((s, o) => s + approximateFiat(o), 0);
  const growth = priorHalf > 0 ? ((recentHalf - priorHalf) / priorHalf) * 100 : (recentHalf > 0 ? 100 : 0);

  // Bar chart — 10 buckets (1 per day, last 10 days)
  const buckets = new Array(10).fill(0);
  for (const o of completed) {
    const daysAgo = Math.floor((now - +new Date(o.createdAt)) / 86_400_000);
    if (daysAgo >= 0 && daysAgo < 10) {
      buckets[9 - daysAgo] += approximateFiat(o);
    }
  }
  const displayBars = buckets;
  const max = Math.max(...displayBars, 1);
  const peakIdx = displayBars.indexOf(Math.max(...displayBars));
  const secondIdx = displayBars
    .map((v, i) => ({ v, i }))
    .filter(({ i }) => i !== peakIdx)
    .sort((a, b) => b.v - a.v)[0]?.i ?? -1;

  const recent = orders.slice(0, 4);
  const activeCount = active.length;

  return (
    <div className="space-y-8">
      <AutoRefresh interval={20000} />
      {/* Top bar — greeting left, utility icons + CTAs right */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="fade-up">
          <h1 className="font-display text-[44px] lg:text-[52px] font-semibold leading-[1.05] text-ink tracking-tight">
            {greeting()}, {merchantFirstName(merchantName)}
          </h1>
          <p className="text-ink-muted text-[15px] mt-2">
            Here&apos;s what&apos;s happening with your store today.
          </p>
        </div>

        <div className="flex items-center gap-3 fade-up" style={{ animationDelay: '80ms' }}>
          <button
            aria-label="Notifications"
            className="relative w-11 h-11 rounded-full hover:bg-cream-deep/60 transition-colors flex items-center justify-center text-forest-deep"
          >
            <Bell size={19} strokeWidth={1.75} />
            <span className="absolute top-2.5 right-3 w-1.5 h-1.5 rounded-full bg-terracotta" />
          </button>
          <button
            aria-label="Help"
            className="w-11 h-11 rounded-full hover:bg-cream-deep/60 transition-colors flex items-center justify-center text-forest-deep"
          >
            <HelpCircle size={19} strokeWidth={1.75} />
          </button>
          <Link
            href="/settings?tab=profile"
            aria-label="My profile"
            title="My profile"
            className="w-11 h-11 rounded-full bg-forest-surface border-2 border-forest/20 text-forest-deep font-display font-semibold flex items-center justify-center text-sm hover:bg-forest hover:text-cream-soft hover:border-forest transition-all"
          >
            {merchantInitials(merchantName)}
          </Link>
        </div>
      </div>

      {/* Secondary CTA row — Export + Payment Link */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/transactions?export=csv"
          className="inline-flex items-center gap-2 bg-cream-soft border border-hair text-ink-soft hover:text-forest-deep hover:border-forest/30 px-5 py-3 rounded-full text-[14px] font-medium transition-all shadow-leaf"
        >
          <Download size={16} strokeWidth={1.9} />
          Export
        </Link>
        <Link
          href="/links"
          className="inline-flex items-center gap-2 bg-forest text-cream-soft px-6 py-3 rounded-full text-[14px] font-medium hover:bg-forest-deep transition-all shadow-leaf"
        >
          <Link2 size={16} strokeWidth={2} />
          Payment Link
        </Link>
      </div>

      {/* Main grid — Revenue card + right column */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6">
        {/* Total Revenue */}
        <div
          className="relative rounded-[28px] bg-cream-soft border border-hair-soft shadow-leaf px-8 pt-7 pb-6 overflow-hidden fade-up"
          style={{ animationDelay: '120ms' }}
        >
          <div className="absolute -top-32 -right-20 w-80 h-80 rounded-full bg-forest-mist/60 blur-3xl pointer-events-none" />
          <div className="absolute top-5 right-6 inline-flex items-center gap-1.5 bg-forest-surface text-forest-deep px-3 py-1.5 rounded-full text-[12px] font-semibold">
            <TrendingUp size={13} strokeWidth={2.3} />
            +{growth.toFixed(1)}%
          </div>

          <div className="relative">
            <p className="text-[11px] font-semibold tracking-[0.15em] text-ink-muted uppercase">
              Total Revenue (30 days)
            </p>
            <h2 className="mt-3 font-display font-display-tight text-[56px] lg:text-[68px] font-semibold leading-none text-ink tabular-nums">
              {fmtAggregate(displayTotal)}
            </h2>

            {/* Bar chart */}
            <div className="mt-8 h-54 flex self-end items-end gap-3">
              {displayBars.map((v, i) => {
                const h = v === 0 ? 10 : Math.round((v / max) * 100) + 10;
                const isPeak = i === peakIdx;
                const isSecond = i === secondIdx;
                const tone = isPeak
                  ? 'bg-forest'
                  : isSecond
                    ? 'bg-forest-bright/80'
                    : 'bg-sand/70';

                // Calculate the date for this bucket (1 day per bar, last 10 days)
                const daysAgo = 9 - i;
                const barDate = new Date();
                barDate.setDate(barDate.getDate() - daysAgo);
                const dateLabel = barDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                return (
                  <div
                    key={i}
                    className="flex-1 relative group/bar"
                  >
                    <div
                      className={`flex-1 rounded-t-lg bar-rise ${tone} transition-colors hover:opacity-80 cursor-pointer`}
                      style={{
                        height: `${h}px`,
                        animationDelay: `${180 + i * 45}ms`,
                      }}
                    />
                    {/* Tooltip on hover */}
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 px-2 py-1.5 bg-ink text-cream-soft text-[11px] font-medium rounded whitespace-nowrap opacity-0 pointer-events-none z-20 group-hover/bar:opacity-100 transition-opacity">
                      <div>{fmtAggregate(v)}</div>
                      <div className="text-[10px] text-ink-muted">{dateLabel}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column — Active Checkouts + Business Status */}
        <div className="flex flex-col gap-6">
          {/* Active Checkouts — forest card */}
          <div
            className="relative rounded-[28px] bg-forest text-cream-soft px-7 pt-6 pb-7 overflow-hidden shadow-leaf-lg fade-up"
            style={{ animationDelay: '160ms' }}
          >
            <div className="absolute -bottom-20 -right-8 w-56 h-56 rounded-full bg-forest-bright/30 blur-2xl pointer-events-none" />
            <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-cream-soft/10 blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2.5 text-forest-light">
                <ShoppingCart size={18} strokeWidth={1.9} />
                <p className="text-[14px] font-medium tracking-tight">Active Checkouts</p>
              </div>
              <div className="mt-5 font-display font-display-tight text-[72px] leading-none font-semibold tabular-nums">
                {activeCount}
              </div>
              <p className="mt-1 text-[13px] text-forest-light">Right now</p>
            </div>
          </div>

          {/* Business Status */}
          <div
            className="relative rounded-[28px] bg-cream-soft border border-hair-soft shadow-leaf px-7 py-6 fade-up"
            style={{ animationDelay: '200ms' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 text-ink-soft">
                <Briefcase size={17} strokeWidth={1.8} />
                <p className="text-[14px] font-medium">Business Status</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                merchant?.kycLevel === 'verified' ? 'bg-forest-surface text-forest-deep' : 
                merchant?.kycLevel === 'pending' ? 'bg-tan-mist text-tan-deep' : 
                'bg-cream-deep text-ink-muted'
              }`}>
                {merchant?.kycLevel === 'verified' ? <CheckCircle2 size={12} strokeWidth={2.5} /> : 
                 merchant?.kycLevel === 'pending' ? <div className="w-1.5 h-1.5 rounded-full bg-tan animate-pulse" /> :
                 null}
                {merchant?.kycLevel === 'verified' ? 'Verified' : 
                 merchant?.kycLevel === 'pending' ? 'Pending' : 
                 'Action Req.'}
              </span>
            </div>
            <p className="mt-4 font-display text-[22px] font-semibold text-ink leading-tight">
              {merchant?.kycLevel === 'verified' ? 'KYB Approved' : 
               merchant?.kycLevel === 'pending' ? 'Review Pending' : 
               'KYB Action Required'}
            </p>
            <p className="mt-1 text-[13px] text-ink-muted">
              {merchant?.kycLevel === 'verified' ? 'Next review in 180 days.' : 
               merchant?.kycLevel === 'pending' ? 'Est. review: 1-3 days.' : 
               'Submit details to accept live payments.'}
            </p>
            <Link
              href="/onboarding/kyb"
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest-deep hover:text-forest transition-colors"
            >
              View details <ArrowRight size={13} strokeWidth={2.3} />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div
        className="relative rounded-[28px] bg-cream-soft border border-hair-soft shadow-leaf overflow-hidden fade-up"
        style={{ animationDelay: '240ms' }}
      >
        <div className="flex items-center justify-between px-8 pt-7 pb-5">
          <h3 className="font-display text-[24px] font-semibold text-ink tracking-tight">
            Recent Transactions
          </h3>
          <Link
            href="/transactions"
            className="text-[13px] font-semibold text-forest-deep hover:text-forest transition-colors"
          >
            View All
          </Link>
        </div>

        <div className="rule-dotted mx-8" />

        {recent.length === 0 ? (
          <EmptyRecent />
        ) : (
          <div className="px-2 pb-3">
            <table className="w-full text-left">
              <thead>
                <tr className="text-ink-muted text-[11px] tracking-[0.14em] uppercase">
                  <th className="py-4 px-6 font-semibold font-body">Customer</th>
                  <th className="py-4 px-6 font-semibold font-body">Date</th>
                  <th className="py-4 px-6 font-semibold font-body">Amount</th>
                  <th className="py-4 px-6 font-semibold font-body">Status</th>
                  <th className="py-4 px-6 font-semibold font-body text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o, idx) => {
                  const srcP = parseAsset(o.sourceAssetKey);
                  const dp = srcP.kind === 'fiat' ? 2 : 4;
                  const tick = srcP.kind === 'fiat' ? srcP.currency : srcP.token;
                  const status = STATUS_PALETTE[o.status] ?? STATUS_PALETTE.processing;
                  const tone = AVATAR_TONES[idx % AVATAR_TONES.length];
                  return (
                    <tr
                      key={o.id}
                      className="group border-t border-hair-soft hover:bg-cream-deep/40 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <Link href={`/transactions/${o.id}`} className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-[11px] ${tone}`}>
                            {avatarInitials(o)}
                          </div>
                          <p className="font-medium text-ink text-[14px]">{counterpartyName(o)}</p>
                        </Link>
                      </td>
                      <td className="py-4 px-6 text-ink-muted text-[14px]">{formatWhen(o.createdAt)}</td>
                      <td className="py-4 px-6 font-semibold text-ink tabular-nums text-[14px]">
                        {(o.sourceAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: dp })}
                        <span className="text-ink-muted font-normal ml-1">{tick}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium ${status.bg} ${status.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link
                          href={`/transactions/${o.id}`}
                          className="text-ink-muted hover:text-forest-deep opacity-0 group-hover:opacity-100 transition-all text-[13px] font-medium"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyRecent() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-14 h-14 rounded-full bg-forest-surface flex items-center justify-center mb-4">
        <Receipt size={24} strokeWidth={1.6} className="text-forest-deep" />
      </div>
      <p className="font-display text-[18px] font-semibold text-ink tracking-tight">
        No transactions yet
      </p>
      <p className="text-ink-muted text-[14px] mt-2 max-w-xs leading-relaxed">
        When customers complete a checkout, their transactions will appear here.
      </p>
      <Link
        href="/links"
        className="mt-5 inline-flex items-center gap-2 bg-forest text-cream-soft px-5 py-2.5 rounded-full text-[13px] font-semibold hover:bg-forest-deep transition-all shadow-leaf"
      >
        <Link2 size={14} strokeWidth={2} />
        Set up Payment Link
      </Link>
    </div>
  );
}
