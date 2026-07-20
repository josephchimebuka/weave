'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Search, Download, X, ScrollText, ShieldCheck } from 'lucide-react';
import AutoRefresh from '../AutoRefresh';
import {
  type AuditEvent,
  type Category,
  actionMeta,
  describeEvent,
  actorLabel,
  SEVERITY_STYLE,
  CATEGORIES,
} from './audit-meta';

type Scope = 'own' | 'all';

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function fullTimestamp(iso: string): string {
  return (
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ', ' +
    new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
  );
}

export default function AuditLogClient({
  isAdmin,
  merchantName,
}: {
  isAdmin: boolean;
  merchantName: string;
}) {
  const [scope, setScope] = useState<Scope>(isAdmin ? 'all' : 'own');
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const load = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const url = scope === 'all' ? '/api/merchant/audit-events/all?limit=200' : '/api/merchant/audit-events?limit=100';
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('Could not load audit events');
        const data = (await res.json()) as AuditEvent[];
        setEvents(Array.isArray(data) ? data : []);
        setError(null);
      } catch (e) {
        if (!silent) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [scope],
  );

  useEffect(() => {
    setSelected(null);
    load();
  }, [load]);

  const filtered = events.filter((e) => {
    const meta = actionMeta(e.action);
    if (category !== 'all' && meta.category !== category) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const haystack = [
      meta.label,
      e.action,
      describeEvent(e),
      actorLabel(e, scope === 'own' ? merchantName : undefined),
      e.merchant?.name ?? '',
      e.targetId ?? '',
      e.ip ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  // Group by day, preserving the API's newest-first order.
  const groups: { day: string; rows: AuditEvent[] }[] = [];
  for (const e of filtered) {
    const day = dayLabel(e.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.rows.push(e);
    else groups.push({ day, rows: [e] });
  }

  const cols = scope === 'all'
    ? 'grid-cols-[92px_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto]'
    : 'grid-cols-[92px_minmax(0,1.9fr)_minmax(0,1fr)_auto]';

  return (
    <div className={`flex flex-col xl:flex-row gap-0 -mx-6 md:-mx-10 lg:-mx-14 -my-8 md:-my-10 min-h-[calc(100vh-2rem)]`}>
      <AutoRefresh interval={20000} onRefresh={() => load(true)} />

      <div className={`flex-1 flex flex-col overflow-hidden px-6 md:px-10 lg:px-14 py-8 md:py-10 ${selected ? 'xl:max-w-[calc(100%-440px)]' : ''}`}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 mb-7">
          <div className="fade-up">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-[32px] sm:text-[42px] font-semibold text-ink tracking-tight leading-none">
                Audit log
              </h1>
              {isAdmin && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0 ${
                  scope === 'all' ? 'bg-forest text-cream-soft' : 'bg-cream-deep text-ink-soft'
                }`}>
                  <ShieldCheck size={13} strokeWidth={2} />
                  {scope === 'all' ? 'Platform · all merchants' : 'This account'}
                </span>
              )}
            </div>
            <p className="text-ink-muted text-[15px] mt-2 max-w-xl">
              {scope === 'all'
                ? 'Every security- and compliance-sensitive action across Weave, including platform changes by the Weave team. Records are immutable.'
                : 'An immutable record of every sensitive action taken on your account — payouts, keys, verification and sign-ins.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 fade-up" style={{ animationDelay: '80ms' }}>
            {isAdmin && (
              <div className="flex bg-cream-deep/70 rounded-full p-1 shadow-leaf shrink-0">
                <button
                  onClick={() => setScope('all')}
                  className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                    scope === 'all' ? 'bg-cream-soft text-ink shadow-leaf' : 'text-ink-muted hover:text-forest-deep'
                  }`}
                >
                  Platform
                </button>
                <button
                  onClick={() => setScope('own')}
                  className={`px-4 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                    scope === 'own' ? 'bg-cream-soft text-ink shadow-leaf' : 'text-ink-muted hover:text-forest-deep'
                  }`}
                >
                  My account
                </button>
              </div>
            )}
            <Link
              href={`/audit-log/export?scope=${scope}`}
              className="flex items-center gap-2 px-5 py-3 bg-forest text-cream-soft rounded-full text-[14px] hover:bg-forest-deep transition-all shadow-leaf font-medium"
            >
              <Download size={15} strokeWidth={2} />
              Export
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6 fade-up" style={{ animationDelay: '120ms' }}>
          <div className="relative">
            <Search size={15} strokeWidth={1.9} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events, actors, resource IDs…"
              className="w-72 pl-10 pr-4 py-3 bg-cream-soft border border-hair rounded-full text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-forest/40 transition-colors shadow-leaf"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | 'all')}
            className="px-5 py-3 bg-cream-soft border border-hair rounded-full text-[14px] text-ink-soft hover:text-forest-deep hover:border-forest/30 transition-all shadow-leaf font-medium focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
          <span className="text-[13px] text-ink-muted ml-auto tabular-nums">
            {loading ? 'Loading…' : `${filtered.length} event${filtered.length === 1 ? '' : 's'}`}
          </span>
        </div>

        {/* Table */}
        <div className="relative rounded-3xl bg-cream-soft border border-hair-soft shadow-leaf overflow-hidden flex-1 flex flex-col fade-up" style={{ animationDelay: '160ms' }}>
          <div className={`grid ${cols} gap-4 px-5 sm:px-6 py-4 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted border-b border-hair-soft`}>
            <div>Time</div>
            <div>Event</div>
            {scope === 'all' && <div>Merchant</div>}
            <div>Actor</div>
            <div className="text-right">Severity</div>
          </div>

          {error ? (
            <div className="py-20 text-center text-[14px] text-terracotta">{error}</div>
          ) : loading ? (
            <div className="py-20 text-center text-[14px] text-ink-muted">Loading audit events…</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-[14px] text-ink-muted">
                {search || category !== 'all' ? 'No events match your filters.' : 'No audit events recorded yet.'}
              </p>
              {(search || category !== 'all') && (
                <button
                  onClick={() => { setSearch(''); setCategory('all'); }}
                  className="inline-block mt-3 text-[13px] text-forest-deep font-semibold hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {groups.map((g) => (
                <div key={g.day}>
                  <div className="px-5 sm:px-6 py-2 bg-cream-deep/40 border-b border-hair-soft/60 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    {g.day}
                  </div>
                  {g.rows.map((e) => {
                    const meta = actionMeta(e.action);
                    const sev = SEVERITY_STYLE[meta.severity];
                    const desc = describeEvent(e);
                    const isSel = selected?.id === e.id;
                    return (
                      <button
                        key={e.id}
                        onClick={() => setSelected(isSel ? null : e)}
                        className={`w-full grid ${cols} gap-4 items-center px-5 sm:px-6 py-3.5 border-l-[3px] border-b border-hair-soft/60 last:border-b-0 transition-all text-left ${
                          isSel ? 'border-l-forest bg-forest-mist/60' : 'border-l-transparent hover:bg-cream-deep/40'
                        }`}
                      >
                        <div className="text-[13px] text-ink-soft tabular-nums whitespace-nowrap">{timeLabel(e.createdAt)}</div>
                        <div className="min-w-0 flex items-center gap-2.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sev.dot}`} />
                          <div className="min-w-0">
                            <p className="text-[14px] text-ink font-medium truncate">{meta.label}</p>
                            {desc && <p className="text-[12px] text-ink-muted truncate">{desc}</p>}
                          </div>
                        </div>
                        {scope === 'all' && (
                          <div className="min-w-0 text-[13px] text-ink-soft truncate">
                            {e.merchant?.name ?? <span className="text-ink-faint">Platform-wide</span>}
                          </div>
                        )}
                        <div className="min-w-0 text-[13px] text-ink-soft truncate">{actorLabel(e, scope === 'own' ? merchantName : undefined)}</div>
                        <div className="text-right">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium ${sev.chip}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                            {sev.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <>
          <div
            className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-40 xl:hidden transition-opacity duration-300"
            onClick={() => setSelected(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-cream-soft border-l border-hair-soft overflow-y-auto slide-in-right xl:sticky xl:top-0 xl:z-auto xl:flex xl:flex-col xl:w-110 xl:h-screen">
            <EventDetail event={selected} scope={scope} ownName={merchantName} onClose={() => setSelected(null)} />
          </aside>
        </>
      )}
    </div>
  );
}

function EventDetail({
  event,
  scope,
  ownName,
  onClose,
}: {
  event: AuditEvent;
  scope: Scope;
  ownName: string;
  onClose: () => void;
}) {
  const meta = actionMeta(event.action);
  const sev = SEVERITY_STYLE[meta.severity];
  const desc = describeEvent(event);

  return (
    <>
      <div className="px-6 pt-7 pb-5 border-b border-hair-soft">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <ScrollText size={16} strokeWidth={1.9} className="text-forest shrink-0" />
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium ${sev.chip}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                {sev.label}
              </span>
            </div>
            <h2 className="font-display text-[24px] font-semibold text-ink leading-tight">{meta.label}</h2>
            <p className="text-[12px] text-ink-muted mt-1">{fullTimestamp(event.createdAt)}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-cream-deep text-ink-muted flex items-center justify-center transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={17} strokeWidth={1.9} />
          </button>
        </div>
      </div>

      <div className="px-6 py-6 flex flex-col gap-6">
        <Section title="Event">
          <Row k="Action" v={<span className="font-mono text-[12px]">{event.action}</span>} />
          {desc && <Row k="Detail" v={desc} />}
          <Row k="Category" v={<span className="capitalize">{meta.category}</span>} />
          {event.targetType && <Row k="Resource" v={<span className="font-mono text-[12px]">{event.targetType}{event.targetId ? ` · ${event.targetId.slice(0, 12)}` : ''}</span>} />}
          <Row k="Event ID" v={<span className="font-mono text-[12px] text-ink-muted">{event.id.slice(0, 18)}</span>} />
        </Section>

        <Section title="Actor">
          <Row k="Actor" v={actorLabel(event, scope === 'own' ? ownName : undefined)} />
          <Row k="Type" v={<span className="capitalize">{event.actorType}</span>} />
          {scope === 'all' && (
            <Row k="Merchant" v={event.merchant?.name ?? <span className="text-ink-faint">Platform-wide</span>} />
          )}
          {scope === 'all' && event.merchant?.email && (
            <Row k="Email" v={<span className="font-mono text-[12px]">{event.merchant.email}</span>} />
          )}
        </Section>

        {scope === 'all' && (event.ip || event.userAgent) && (
          <Section title="Context">
            {event.ip && <Row k="IP address" v={<span className="font-mono text-[12px]">{event.ip}</span>} />}
            {event.userAgent && <Row k="User agent" v={<span className="text-[12px] text-ink-muted break-words">{event.userAgent}</span>} />}
          </Section>
        )}

        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <Section title="Metadata">
            <pre className="bg-cream-deep/40 rounded-2xl px-4 py-3.5 border border-hair-soft font-mono text-[11.5px] text-ink-soft leading-relaxed whitespace-pre-wrap break-words overflow-x-auto">
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          </Section>
        )}
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold tracking-[0.15em] uppercase text-ink-muted mb-3">{title}</h3>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-[13px]">
      <span className="text-ink-muted shrink-0">{k}</span>
      <span className="text-ink text-right min-w-0 break-words">{v}</span>
    </div>
  );
}
