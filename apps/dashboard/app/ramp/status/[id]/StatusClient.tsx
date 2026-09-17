'use client';

import { useEffect, useState } from 'react';

type S = { id: string; kind: string; status: string; amount_in: string | null; amount_out: string | null; amount_in_asset: string; amount_out_asset: string; started_at: string; completed_at: string | null; account: string };

const LABELS: Record<string, string> = {
  incomplete: 'Waiting for you to finish the form',
  pending_user_transfer_start: 'Waiting for your transfer',
  pending_anchor: 'Weave is routing your funds',
  pending_stellar: 'Delivering to your Stellar wallet',
  pending_external: 'Bank payout in progress',
  completed: 'Completed',
  error: 'Failed',
  refunded: 'Refunded',
  expired: 'Expired',
};
const fmtAsset = (a: string) => a.startsWith('iso4217:') ? a.slice(8) : 'USDC';

export default function StatusClient({ id }: { id: string }) {
  const [s, setS] = useState<S | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let stopped = false; let t: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const r = await fetch(`/api/public/sep24/status/${id}`); const j = await r.json();
        if (!j.success) throw new Error(j.error || 'Not found');
        if (!stopped) setS(j.data);
        if (['completed', 'error', 'refunded', 'expired'].includes(j.data.status)) return;
      } catch (e: any) { if (!stopped) setErr(e.message); return; }
      t = setTimeout(tick, 5000);
    };
    tick();
    return () => { stopped = true; clearTimeout(t); };
  }, [id]);

  const accent = '#0F5D4C', mute = '#7C7568', ink = '#1C1B17', hair = '#E2D9C0';
  const done = s?.status === 'completed';
  return (
    <div style={{ minHeight: '100vh', background: '#F5EFE0', fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: ink, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', border: `1px solid ${hair}`, borderRadius: 26, padding: 24, boxShadow: '0 20px 60px -28px rgba(0,0,0,0.28)' }}>
        <div style={{ fontSize: 12, color: mute, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>Weave · Stellar anchor</div>
        {err ? <p style={{ marginTop: 12, color: '#A8321E' }}>{err}</p> : !s ? <p style={{ marginTop: 12, color: mute }}>Loading…</p> : (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>{s.kind === 'deposit' ? 'Naira → USDC' : 'USDC → Naira'}</h1>
            <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 14, background: done ? '#E6F3EC' : '#FBF0DC', color: done ? '#1F7A4D' : '#A46A00', fontWeight: 600, fontSize: 14 }}>{LABELS[s.status] ?? s.status}</div>
            <dl style={{ marginTop: 16, fontSize: 14 }}>
              {[['Wallet', s.account], ['You send', s.amount_in ? `${Number(s.amount_in).toLocaleString()} ${fmtAsset(s.amount_in_asset)}` : '—'], ['You receive', s.amount_out ? `${Number(s.amount_out).toLocaleString()} ${fmtAsset(s.amount_out_asset)}` : '—'], ['Started', new Date(s.started_at).toLocaleString()], ['Completed', s.completed_at ? new Date(s.completed_at).toLocaleString() : '—']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${hair}` }}><dt style={{ color: mute }}>{k}</dt><dd style={{ fontWeight: 600, fontFamily: k === 'Wallet' ? 'ui-monospace, monospace' : undefined }}>{v}</dd></div>
              ))}
            </dl>
            <p style={{ fontSize: 11.5, color: mute, marginTop: 14 }}>Reference {s.id}</p>
          </>
        )}
        <div style={{ marginTop: 10, fontSize: 11.5, color: accent }}>Secured by Weave</div>
      </div>
    </div>
  );
}
