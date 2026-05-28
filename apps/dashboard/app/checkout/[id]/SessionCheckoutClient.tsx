'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const WeaveCheckout = dynamic(
  () => import('@weave-sdk/widget').then((m) => m.WeaveCheckout),
  { ssr: false },
);

export type SessionData = {
  id: string;
  status: 'open' | 'processing' | 'complete' | 'expired';
  amount: number;
  amountIn: 'source' | 'dest';
  sourceAsset: string | null;
  destAsset: string;
  expiresAt: string;
  redirectUrl: string;
  cancelUrl: string | null;
  merchantName: string;
  publishableKey: string;
};

const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE) ||
  'http://localhost:4000/api/v1';

function parseDestCurrency(destAsset: string): string {
  // "fiat:NGN" → "NGN", "crypto:BASE:USDC" → "USDC"
  const parts = destAsset.split(':');
  return parts[parts.length - 1] || destAsset;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export default function SessionCheckoutClient({ session }: { session: SessionData }) {
  const expiresAtMs = useMemo(() => new Date(session.expiresAt).getTime(), [session.expiresAt]);
  const [now, setNow] = useState<number>(() => Date.now());
  const [view, setView] = useState<'pay' | 'expired' | 'redirecting'>(() => {
    if (session.status === 'expired' || expiresAtMs < Date.now()) return 'expired';
    if (session.status === 'complete') return 'redirecting';
    return 'pay';
  });

  // If the session is already complete (e.g. user hit back), bounce straight to merchant.
  useEffect(() => {
    if (view === 'redirecting') {
      const t = setTimeout(() => {
        window.location.href = appendQuery(session.redirectUrl, { session_id: session.id });
      }, 600);
      return () => clearTimeout(t);
    }
  }, [view, session.id, session.redirectUrl]);

  // Countdown
  useEffect(() => {
    if (view !== 'pay') return;
    const t = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= expiresAtMs) setView('expired');
    }, 1000);
    return () => clearInterval(t);
  }, [view, expiresAtMs]);

  const currency = parseDestCurrency(session.destAsset);

  async function handleSuccess(txn: { orderId: string; status: string }) {
    try {
      await fetch(`${API_BASE}/checkout/sessions/${session.id}/complete`, {
        method: 'PATCH',
        headers: { 'x-api-key': session.publishableKey },
      });
    } catch {
      // Best-effort — webhook is the source of truth. Continue to redirect.
    }
    window.location.href = appendQuery(session.redirectUrl, {
      session_id: session.id,
      order_id: txn.orderId,
    });
  }

  if (view === 'redirecting') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="text-center fade-up">
          <div className="w-10 h-10 mx-auto mb-4 border-2 border-forest/20 border-t-forest rounded-full animate-spin" />
          <p className="text-[14px] text-ink-muted">Payment complete. Redirecting you back to {session.merchantName}…</p>
        </div>
      </div>
    );
  }

  if (view === 'expired') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center fade-up">
          <div className="mx-auto w-14 h-14 rounded-full bg-ink/5 flex items-center justify-center mb-5">
            <span className="text-[24px]">⏱</span>
          </div>
          <h1 className="font-display text-[24px] font-semibold text-ink mb-2">Session expired</h1>
          <p className="text-[14px] text-ink-muted leading-relaxed mb-6">
            This checkout session is no longer active. Please return to {session.merchantName} to start a new one.
          </p>
          {session.cancelUrl && (
            <a
              href={session.cancelUrl}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-2xl bg-forest text-cream font-semibold text-[13px] shadow-leaf hover:bg-forest-deep transition-colors"
            >
              Return to {session.merchantName}
            </a>
          )}
        </div>
      </div>
    );
  }

  const remaining = expiresAtMs - now;

  return (
    <div className="min-h-screen bg-cream flex flex-col font-body text-ink selection:bg-forest/10">
      <header className="px-6 md:px-10 py-5 flex items-center justify-between border-b border-hair/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-forest text-cream flex items-center justify-center font-bold text-[15px] shadow-leaf">
            {session.merchantName.charAt(0).toUpperCase()}
          </div>
          <span className="text-[15px] font-semibold tracking-tight">{session.merchantName}</span>
        </div>
        <div className="text-[11px] font-mono text-ink-muted tabular-nums">
          Expires in {formatRemaining(remaining)}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-12">
        <div className="w-full max-w-[440px] fade-up">
          <div className="mb-6 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted mb-2">Amount Due</p>
            <p className="font-display text-[40px] font-bold tabular-nums tracking-tight text-ink">
              {currency === 'NGN' ? '₦' : ''}{session.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              {currency !== 'NGN' && <span className="ml-2 text-[18px] text-ink-muted font-semibold">{currency}</span>}
            </p>
          </div>

          <WeaveCheckout
            apiKey={session.publishableKey}
            apiBase={API_BASE}
            merchant={{
              name: session.merchantName,
              amount: session.amount,
              currency: currency as any,
              amountIn: session.amountIn,
              ...(session.sourceAsset ? { sourceAssetKey: session.sourceAsset } : {}),
              destAssetKey: session.destAsset,
            }}
            theme="organic"
            accentColor="forest"
            borderRadius={24}
            onSuccess={handleSuccess}
            onError={(err) => console.error('[checkout] widget error:', err.message)}
            onClose={() => {
              if (session.cancelUrl) window.location.href = session.cancelUrl;
            }}
          />
        </div>
      </main>

      <footer className="px-6 py-5 text-center text-[11px] text-ink-muted/70">
        Secured by <span className="font-semibold text-forest tracking-tight">Weave.</span>
      </footer>
    </div>
  );
}

function appendQuery(url: string, params: Record<string, string>): string {
  try {
    const u = new URL(url);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    return u.toString();
  } catch {
    const sep = url.includes('?') ? '&' : '?';
    const qs = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return `${url}${sep}${qs}`;
  }
}
