'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Search,
  Download,
  Landmark,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { fetchOrdersClient as fetchOrders } from '../lib/dashboard-api-client';
import type { Order } from '../types';
import AutoRefresh from '../AutoRefresh';

interface Settlement {
  id: number;
  status: string;
  amount: number;
  currency: string;
  reference: string;
  createdAt: string;
  settled_by: string;
}

export default function PayoutsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);

      // Fetch settlements
      const sRes = await fetch('/api/merchant/payouts/settlements');
      const sData = await sRes.json();
      if (!sRes.ok) throw new Error(sData.error || 'Failed to load settlements');
      setSettlements(sData.data || []);

      // Fetch recent orders to calculate pending balance
      const rawOrders = await fetchOrders(50);
      setOrders(rawOrders);

      setLoading(false);
    } catch (err) {
      if (!isSilent) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Calculate stats
  const lastSettlement = settlements[0];
  const lastSettlementDate = lastSettlement ? new Date(lastSettlement.createdAt) : new Date(0);

  const pendingOrders = orders.filter(o =>
    o.status === 'completed' &&
    new Date(o.createdAt) > lastSettlementDate
  );

  const pendingBalance = pendingOrders.reduce((sum, o) => {
    // Only sum successful NGN to NGN transfers handled by Paystack
    const isNgnToNgn = o.sourceAssetKey === 'fiat:NGN' && o.destAssetKey === 'fiat:NGN';
    const usesPaystack = o.steps.some(s => s.provider === 'paystack');

    if (isNgnToNgn && usesPaystack) {
      return sum + (o.destAmount || 0);
    }
    return sum;
  }, 0);

  const lastSettledAmount = lastSettlement ? lastSettlement.amount / 100 : 0;

  // Next payout estimation (T+1 business days)
  const getNextPayoutDate = () => {
    const today = new Date();
    const next = new Date(today);
    next.setDate(today.getDate() + 1);
    // If weekend, push to Monday
    if (next.getDay() === 0) next.setDate(next.getDate() + 1);
    if (next.getDay() === 6) next.setDate(next.getDate() + 2);
    return next;
  };

  const fmtCurrency = (n: number) => {
    return `₦${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fmtDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex flex-col gap-0 -mx-6 md:-mx-10 lg:-mx-14 -my-8 md:-my-10 min-h-[calc(100vh-2rem)]">
      <AutoRefresh interval={30000} onRefresh={() => load(true)} />

      <div className="flex-1 flex flex-col px-6 md:px-10 lg:px-14 py-8 md:py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8">
          <div className="fade-up">
            <h1 className="font-display text-[32px] sm:text-[42px] font-semibold text-ink tracking-tight leading-none">
              Payouts
            </h1>
            <p className="text-ink-muted text-[15px] mt-2">
              Track your bank settlements and pending balances.
            </p>
          </div>

          <Link
            href="/settings?tab=payouts"
            className="flex items-center gap-2 px-5 py-3 bg-cream-soft border border-hair rounded-full text-[14px] text-forest-deep hover:border-forest/40 transition-all shadow-leaf font-medium"
          >
            <Landmark size={15} strokeWidth={1.9} />
            Payout Settings
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <StatCard
            label="Pending Balance"
            value={fmtCurrency(pendingBalance)}
            footer={
              <span className="inline-flex items-center gap-1 text-cream-soft/90 text-[12px]">
                Estimated next settlement
              </span>
            }
            delay={80}
            highlight
          />
          <StatCard
            label="Last Settlement"
            value={fmtCurrency(lastSettledAmount)}
            footer={
              <span className="inline-flex items-center gap-1 text-ink-muted text-[12px]">
                {lastSettlement ? fmtDate(lastSettlement.createdAt) : 'No history yet'}
              </span>
            }
            delay={120}
          />
          <StatCard
            label="Next Expected Payout"
            value={fmtDate(getNextPayoutDate().toISOString())}
            footer={
              <span className="inline-flex items-center gap-1 text-ink-muted text-[12px]">
                Based on T+1 schedule
              </span>
            }
            delay={160}
          />
        </div>

        {/* Payout list */}
        <div className="relative rounded-3xl bg-cream-soft border border-hair-soft shadow-leaf overflow-hidden flex-1 flex flex-col fade-up" style={{ animationDelay: '200ms' }}>
          <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted border-b border-hair-soft">
            <div>Reference</div>
            <div className="hidden sm:block">Date</div>
            <div className="text-center">Status</div>
            <div className="text-right">Amount</div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-ink-muted animate-pulse">Loading settlements...</div>
          ) : settlements.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-[14px] text-ink-muted">No settlements found yet.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {settlements.map((s) => (
                <div
                  key={s.id}
                  className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 items-center px-6 py-5 border-b border-hair-soft/60 last:border-b-0 hover:bg-cream-deep/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink text-[14px] truncate">{s.reference}</p>
                    <p className="sm:hidden text-[11px] text-ink-muted">{fmtDate(s.createdAt)}</p>
                  </div>
                  <div className="hidden sm:block text-[13px] text-ink-soft">
                    {fmtDate(s.createdAt)}
                  </div>
                  <div className="text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium ${s.status === 'success' ? 'bg-forest-surface text-forest-deep' : 'bg-tan-mist text-tan-deep'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'success' ? 'bg-forest' : 'bg-tan'}`} />
                      {s.status === 'success' ? 'Settled' : s.status}
                    </span>
                  </div>
                  <div className="text-right font-semibold text-ink tabular-nums text-[14px]">
                    {fmtCurrency(s.amount / 100)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  footer,
  delay = 0,
  highlight = false
}: {
  label: string;
  value: string;
  footer: React.ReactNode;
  delay?: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative rounded-3xl border shadow-leaf px-6 py-5 fade-up overflow-hidden ${highlight ? 'bg-forest text-cream-soft border-forest' : 'bg-cream-soft border-hair-soft'
        }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className={`text-[13px] font-medium ${highlight ? 'text-cream-soft/70' : 'text-ink-muted'}`}>{label}</p>
      <p className="mt-2 font-display text-[34px] leading-tight font-semibold tabular-nums">
        {value}
      </p>
      <div className={`mt-3 ${highlight ? 'text-cream-soft/60' : ''}`}>{footer}</div>
      {highlight && (
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-cream-soft/10 rounded-full blur-2xl" />
      )}
    </div>
  );
}
