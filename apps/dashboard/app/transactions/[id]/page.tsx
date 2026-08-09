import Link from 'next/link';
import { ArrowLeft, Receipt, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { fetchOrder, fetchOrderEvents } from '../../lib/dashboard-api';
import { EVENT_TONE, fmtDuration, type OrderEvent } from '../../lib/order-events';
import { assetLabel, parseAsset, institutionName } from '../../types';
import { WalletAddress } from '../../../components/WalletAddress';

function money(value: number | null | undefined, dp = 2) {
  if (value == null) return '—';
  return value.toLocaleString(undefined, { minimumFractionDigits: dp > 2 ? 0 : 2, maximumFractionDigits: dp });
}

const STATUS_META: Record<string, { tone: string; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }> = {
  completed:        { tone: 'bg-forest-surface text-forest-deep',  label: 'Completed',  icon: CheckCircle2 },
  processing:       { tone: 'bg-tan-mist text-tan-deep',           label: 'Processing', icon: Loader2 },
  bridging:         { tone: 'bg-tan-mist text-tan-deep',           label: 'Bridging',   icon: Loader2 },
  awaiting_deposit: { tone: 'bg-tan-mist text-tan-deep',           label: 'Awaiting',   icon: Clock },
  in_flight:        { tone: 'bg-tan-mist text-tan-deep',           label: 'In flight',  icon: Loader2 },
  refunded:         { tone: 'bg-cream-deep text-ink-soft',         label: 'Refunded',   icon: CheckCircle2 },
  failed:           { tone: 'bg-terracotta-soft text-terracotta',  label: 'Failed',     icon: XCircle },
  expired:          { tone: 'bg-terracotta-soft text-terracotta',  label: 'Expired',    icon: XCircle },
  done:             { tone: 'bg-forest-surface text-forest-deep',  label: 'Done',       icon: CheckCircle2 },
  pending:          { tone: 'bg-cream-deep text-ink-muted',        label: 'Pending',    icon: Clock },
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-muted mb-1.5">{label}</p>
      <p className="text-[14px] text-ink">{value}</p>
    </div>
  );
}

export default async function TransactionReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, timeline] = await Promise.all([fetchOrder(id, 10), fetchOrderEvents(id, 10)]);

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-cream-soft border border-hair-soft rounded-[24px] px-8 py-10 text-center shadow-leaf">
          <p className="font-display text-[22px] font-semibold text-ink">Transaction not found</p>
          <p className="text-[14px] text-ink-muted mt-2">This receipt does not exist or belongs to a different account.</p>
          <Link
            href="/transactions"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-forest text-cream-soft rounded-full text-[13px] font-medium hover:bg-forest-deep transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Back to transactions
          </Link>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[order.status] ?? STATUS_META.processing;
  const StatusIcon = meta.icon;
  const srcA = parseAsset(order.sourceAssetKey);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 fade-up">
        <div>
          <Link
            href="/transactions"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-forest-deep font-medium mb-3 transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Back to transactions
          </Link>
          <h1 className="font-display text-[42px] font-semibold text-ink tracking-tight leading-none">
            Receipt
          </h1>
          <p className="text-[12px] font-mono text-ink-muted mt-2">#{order.id}</p>
        </div>
        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium ${meta.tone}`}>
          <StatusIcon size={14} strokeWidth={2.2} />
          {meta.label}
        </span>
      </div>

      {/* Hero amount */}
      <div className="relative rounded-[28px] bg-cream-soft border border-hair-soft shadow-leaf px-8 py-7 overflow-hidden fade-up" style={{ animationDelay: '80ms' }}>
        <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-forest-mist/60 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 text-ink-muted text-[11px] font-semibold tracking-[0.15em] uppercase">
            <Receipt size={13} strokeWidth={2.2} />
            Customer paid
          </div>
          <p className="mt-3 font-display font-display-tight text-[56px] font-semibold text-ink tabular-nums leading-none">
            {money(order.sourceAmount, 4)}
            <span className="text-[28px] text-ink-muted font-medium ml-3">
              {srcA.kind === 'fiat' ? srcA.currency : srcA.token}
            </span>
          </p>
          <p className="mt-3 text-[14px] text-ink-muted">
            {assetLabel(order.sourceAssetKey)} → {assetLabel(order.destAssetKey)}
          </p>
        </div>
      </div>

      {/* Core details */}
      <div className="rounded-[24px] bg-cream-soft border border-hair-soft shadow-leaf overflow-hidden fade-up" style={{ animationDelay: '120ms' }}>
        <div className="px-7 py-5 border-b border-hair-soft">
          <h2 className="font-display text-[20px] font-semibold text-ink">Details</h2>
        </div>
        <div className="px-7 py-6 grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-6">
          <Field label="From" value={assetLabel(order.sourceAssetKey)} />
          <Field label="To" value={assetLabel(order.destAssetKey)} />
          <Field label="Merchant received" value={`${money(order.destAmount, 4)} ${order.destAssetKey.split(':').at(-1)}`} />
          <Field label="Created" value={new Date(order.createdAt).toLocaleString('en-GB')} />
          <Field label="Updated" value={new Date(order.updatedAt).toLocaleString('en-GB')} />
          <Field
            label="Payout destination"
            value={
              order.destInstrument?.bankAccountIdentifier
                ? `${institutionName(order.destAssetKey.split(':').pop() || 'NGN', order.destInstrument.bankInstitution || '')} · ${order.destInstrument.bankAccountIdentifier}`
                : order.destInstrument?.walletAddress
                  ? <WalletAddress address={order.destInstrument.walletAddress} />
                  : '—'
            }
          />
          {order.paycrestStatus && <Field label="Paycrest status" value={order.paycrestStatus} />}
          {order.nearStatus && <Field label="NEAR status" value={order.nearStatus} />}
          {(order.bachsPayoutStatus || order.bachsSplitStatus) && (
            <Field
              label="Payout to your bank"
              value={
                order.bachsPayoutStatus === 'paid'       ? 'Paid to your bank ✓'
                : order.bachsPayoutStatus === 'processing' ? 'Paying out…'
                : order.bachsPayoutStatus === 'blocked'    ? 'Blocked — verify your payout bank'
                : order.bachsPayoutStatus === 'failed'     ? 'Failed — being retried'
                : order.bachsPayoutStatus === 'pending'    ? 'Processing — paying out to your bank'
                // No payout row yet: fall back to the split (collection→balance) stage.
                : order.bachsSplitStatus === 'settled'     ? 'Collected — payout queued'
                : order.bachsSplitStatus === 'failed'      ? 'Failed — being retried'
                : 'Settling (usually within 1–2 business days)'
              }
            />
          )}
        </div>
      </div>

      {/* Customer */}
      {(order.customer?.name || order.customer?.email) && (
        <div className="rounded-[24px] bg-cream-soft border border-hair-soft shadow-leaf overflow-hidden fade-up" style={{ animationDelay: '140ms' }}>
          <div className="px-7 py-5 border-b border-hair-soft">
            <h2 className="font-display text-[20px] font-semibold text-ink">Customer</h2>
          </div>
          <div className="px-7 py-6 grid grid-cols-2 gap-x-8 gap-y-6">
            {order.customer.name  && <Field label="Name"  value={order.customer.name} />}
            {order.customer.email && <Field label="Email" value={order.customer.email} />}
          </div>
        </div>
      )}

      {/* Fees */}
      <div className="rounded-[24px] bg-cream-soft border border-hair-soft shadow-leaf overflow-hidden fade-up" style={{ animationDelay: '160ms' }}>
        <div className="px-7 py-5 border-b border-hair-soft">
          <h2 className="font-display text-[20px] font-semibold text-ink">Fee breakdown</h2>
        </div>
        <div className="px-7 py-6 grid grid-cols-3 gap-4">
          {[
            { label: 'Sender fee',  value: order.senderFeeUsd },
            { label: 'App fee',     value: order.appFeeUsd },
            { label: 'Bridge fee',  value: order.bridgeFeeUsd },
          ].map((f) => (
            <div key={f.label} className="bg-cream-deep/50 border border-hair-soft rounded-2xl px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-muted">{f.label}</p>
              <p className="text-[18px] font-display font-semibold text-ink mt-1 tabular-nums">
                ${money(f.value)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Route timeline */}
      {order.steps && order.steps.length > 0 && (
        <div className="rounded-[24px] bg-cream-soft border border-hair-soft shadow-leaf overflow-hidden fade-up" style={{ animationDelay: '200ms' }}>
          <div className="px-7 py-5 border-b border-hair-soft">
            <h2 className="font-display text-[20px] font-semibold text-ink">Route timeline</h2>
          </div>
          <div className="divide-y divide-hair-soft">
            {order.steps.map((step, idx) => {
              const stepMeta = STATUS_META[step.status] ?? STATUS_META.pending;
              const StepIcon = stepMeta.icon;
              return (
                <div key={step.id} className="px-7 py-5">
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-forest-surface text-forest-deep text-[12px] font-semibold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-ink capitalize">{step.provider}</span>
                      <span className="text-[12px] text-ink-muted truncate">{step.fromAsset} → {step.toAsset}</span>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium ${stepMeta.tone}`}>
                      <StepIcon size={12} strokeWidth={2.2} />
                      {stepMeta.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-[12px] text-ink-muted ml-10 mt-2">
                    <span>ID: <span className="font-mono text-ink-soft">{step.externalId?.slice(0, 12) || '—'}</span></span>
                    <span>Deposit: <span className="font-mono text-ink-soft">{step.depositAddress?.slice(0, 12) || '—'}</span></span>
                    {step.depositMemo && <span>Memo: <span className="font-mono text-ink-soft">{step.depositMemo}</span></span>}
                    {step.paystackDvaAcct && (
                      <div className="col-span-3 flex flex-wrap gap-x-6 gap-y-2 mt-1.5 pt-1.5 border-t border-hair-soft/50">
                        <span>Bank: <span className="text-ink-soft">{step.paystackDvaBank}</span></span>
                        <span>Account: <span className="font-mono text-ink-soft">{step.paystackDvaAcct}</span></span>
                        <span>Ref: <span className="font-mono text-ink-soft">{step.paystackDvaRef}</span></span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment activity — the payer's session timeline */}
      {timeline && timeline.events.length > 0 && (
        <div className="rounded-[24px] bg-cream-soft border border-hair-soft shadow-leaf overflow-hidden fade-up" style={{ animationDelay: '240ms' }}>
          <div className="px-7 py-5 border-b border-hair-soft flex items-center justify-between gap-4">
            <h2 className="font-display text-[20px] font-semibold text-ink">Payment activity</h2>
            <div className="flex items-center gap-5 text-[12px] text-ink-muted">
              <span>Duration <span className="font-semibold text-ink tabular-nums">{fmtDuration(timeline.summary.durationSec)}</span></span>
              <span>Attempts <span className="font-semibold text-ink tabular-nums">{timeline.summary.attempts}</span></span>
              <span>Errors <span className={`font-semibold tabular-nums ${timeline.summary.errors ? 'text-terracotta' : 'text-ink'}`}>{timeline.summary.errors}</span></span>
            </div>
          </div>
          <div className="px-7 py-6">
            {(timeline.summary.device || timeline.summary.ip) && (
              <div className="flex flex-wrap gap-3 mb-6">
                {timeline.summary.device && (
                  <div className="bg-cream-deep/50 border border-hair-soft rounded-2xl px-4 py-3 min-w-[120px]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-muted">Device</p>
                    <p className="text-[15px] font-medium text-ink mt-0.5">{timeline.summary.device}</p>
                  </div>
                )}
                {timeline.summary.ip && (
                  <div className="bg-cream-deep/50 border border-hair-soft rounded-2xl px-4 py-3 min-w-[120px]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-ink-muted">IP address</p>
                    <p className="text-[14px] font-mono text-ink mt-0.5">{timeline.summary.ip}</p>
                  </div>
                )}
              </div>
            )}
            <ol className="relative border-l border-hair-soft ml-2">
              {timeline.events.map((e: OrderEvent) => (
                <li key={e.id} className="relative pl-6 pb-5 last:pb-0">
                  <span className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-cream-soft ${EVENT_TONE[e.type] ?? 'bg-ink-faint'}`} />
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[13.5px] text-ink">
                      {e.label}
                      {e.source === 'client' && (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">reported</span>
                      )}
                    </p>
                    <span className="text-[12px] text-ink-muted tabular-nums shrink-0">
                      {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
