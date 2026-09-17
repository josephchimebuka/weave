'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { connectStellarWallet, runStellarBridgeFlow, signAndSubmitXdr } from '../lib/stellar-signing';

// SEP-24 interactive page — Weave as a Stellar anchor for NGN. A wallet
// (Pollar's ramp modal, Lobstr, …) opens this URL after SEP-10 auth with a
// one-time `token`. Two kinds:
//   deposit     the user pays NGN by bank transfer → USDC lands in THEIR Stellar account
//   withdrawal  the user's wallet sends USDC to our per-order Stellar address → NGN lands in their bank
// Every session wraps one Weave Order created through the same public proxy +
// publishable key path as /pay and /cashout, then linked back to the anchor tx.
// NOT getanchor.co (see api/lib/stellar-anchor-config.ts).

type Kind = 'deposit' | 'withdrawal';
type Ctx = {
  id: string; kind: Kind; account: string; assetCode: string;
  amountIn: number | null; amountOut: number | null; status: string; orderId: string | null;
  publishableKey: string; sandbox: boolean; network: string; usdcIssuer: string;
  withdraw: { anchorAccount: string | null; memo: string | null; memoType: string | null } | null;
};
type Bank = { name: string; code: string };
type Mode = 'loading' | 'form' | 'instructions' | 'done' | 'error';

const PROXY = '/api/public';
const STELLAR_ASSET = 'crypto:STELLAR:USDC';
const BANK_ALIASES: Record<string, string> = {
  'guaranty trust': 'gtb gtbank gt bank', 'united bank for africa': 'uba', 'first bank': 'fbn firstbank',
  'first city monument': 'fcmb', 'stanbic': 'ibtc stanbic ibtc', 'wema': 'alat', 'ecobank': 'eco',
  'union bank': 'union', 'access': 'access diamond', 'zenith': 'zenith', 'fidelity': 'fidelity',
  'sterling': 'sterling', 'polaris': 'polaris', 'keystone': 'keystone', 'providus': 'providus',
  'moniepoint': 'monie', 'opay': 'opay', 'palmpay': 'palm', 'kuda': 'kuda',
};
function bankSearchStr(name: string) {
  const lower = name.toLowerCase(); let s = lower;
  for (const [needle, aliases] of Object.entries(BANK_ALIASES)) if (lower.includes(needle)) s += ' ' + aliases;
  return s;
}
const fmtNgn = (n: number | null) => n == null ? '' : `₦${Math.round(n).toLocaleString()}`;
const fmtUsdc = (n: number | null) => n == null ? '' : `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`;
const shortG = (g: string) => `${g.slice(0, 6)}…${g.slice(-6)}`;

export default function RampClient({ id, kind, token, lang }: { id: string; kind: Kind; token: string | null; lang?: string }) {
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [mode, setMode] = useState<Mode>('loading');
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);

  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState('');
  const [bankQuery, setBankQuery] = useState('');
  const [bankOpen, setBankOpen] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [nextAction, setNextAction] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [signStage, setSignStage] = useState<'idle' | 'connect' | 'approve' | 'bridge' | 'submitting' | 'done'>('idle');
  const [signError, setSignError] = useState<string | null>(null);
  const [bridgeHash, setBridgeHash] = useState<string | null>(null);
  const accountRef = useRef<HTMLInputElement>(null);

  const isDeposit = kind === 'deposit';
  const key = ctx?.publishableKey ?? '';
  const authHeaders = useMemo(() => ({ authorization: `Bearer ${token ?? ''}` }), [token]);

  // 1. Load the session context with the one-time token.
  useEffect(() => {
    if (!token) { setError('This link is missing its access token. Please reopen it from your wallet.'); setMode('error'); return; }
    fetch(`${PROXY}/sep24/interactive/${id}`, { headers: authHeaders })
      .then(async r => { const j = await r.json(); if (!r.ok || !j.success) throw new Error(j.error || 'This session could not be found.'); return j.data as Ctx; })
      .then(c => {
        setCtx(c);
        if (c.kind === 'withdrawal' && c.amountIn) setAmount(String(c.amountIn));
        // Resume: an order already exists for this session (page reload).
        if (c.orderId) resumeOrder(c);
        else setMode('form');
      })
      .catch(e => { setError(e.message); setMode('error'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  async function resumeOrder(c: Ctx) {
    try {
      const r = await fetch(`${PROXY}/orders/${c.orderId}`, { headers: { 'x-api-key': c.publishableKey } });
      const j = await r.json();
      if (!j?.success) throw new Error();
      setOrder(j.data);
      const first = j.data.steps?.[0];
      if (c.kind === 'deposit') {
        setNextAction({ screen: 'collect_fiat', bankDetails: first?.depositBankDetails ?? null });
      } else if (first?.provider === 'lifi') {
        // Rebuild the signing payload (approve XDR is re-issued by the API when needed;
        // on resume we simply let the wallet re-run the flow — approve is idempotent).
        setNextAction({
          screen: 'sign_stellar_tx',
          stellarSigning: {
            fromAddress: c.account, amount: Number(first?.amountIn ?? j.data.sourceAmount),
            approveXdr: null,
            approveTxPath: `/orders/${j.data.id}/steps/${first.sequence}/approve-tx`,
            bridgeTxPath: `/orders/${j.data.id}/steps/${first.sequence}/bridge-tx`,
            submittedPath: `/orders/${j.data.id}/steps/${first.sequence}/submitted`,
          },
          amount: Number(first?.amountIn ?? j.data.sourceAmount),
        });
        if (first?.status === 'in_flight') setSignStage('done');
      } else {
        setNextAction({ screen: 'collect_crypto', depositAddress: first?.depositAddress, depositMemo: first?.depositMemo, amount: Number(first?.amountIn ?? j.data.sourceAmount) });
      }
      setMode(j.data.status === 'completed' ? 'done' : 'instructions');
    } catch { setMode('form'); }
  }

  // Banks for the corridor.
  useEffect(() => {
    if (!key) return;
    fetch(`${PROXY}/institutions?currency=NGN`, { headers: { 'x-api-key': key } })
      .then(r => r.ok ? r.json() : null).then(j => { if (j?.success) setBanks(j.data ?? []); }).catch(() => {});
  }, [key]);

  // Live estimate of what lands on the other side (debounced).
  useEffect(() => {
    const amt = Number(amount);
    if (!key || !amt || amt <= 0) { setEstimate(null); return; }
    let cancelled = false; setEstimating(true);
    const from = isDeposit ? 'fiat:NGN' : STELLAR_ASSET;
    const to   = isDeposit ? STELLAR_ASSET : 'fiat:NGN';
    const t = setTimeout(() => {
      fetch(`${PROXY}/quotes?from=${from}&to=${to}&amount=${amt}&amountIn=source`, { headers: { 'x-api-key': key } })
        .then(r => r.json()).then(j => { if (!cancelled) setEstimate(j?.success ? Number(j.data?.estimatedDest ?? null) : null); })
        .catch(() => { if (!cancelled) setEstimate(null); })
        .finally(() => { if (!cancelled) setEstimating(false); });
    }, 450);
    return () => { cancelled = true; clearTimeout(t); setEstimating(false); };
  }, [amount, key, isDeposit]);

  // Resolve the account name at 10 digits.
  useEffect(() => {
    setAccountName(''); setResolveError(null);
    if (!key || !bankCode || accountNumber.replace(/\D/g, '').length < 10) return;
    let cancelled = false; setResolving(true);
    fetch(`${PROXY}/institutions/verify`, {
      method: 'POST', headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ institution: bankCode, accountIdentifier: accountNumber.trim(), currency: 'NGN' }),
    }).then(r => r.json()).then(j => {
      if (cancelled) return;
      if (j?.success && j.data) setAccountName(String(j.data)); else setResolveError('We couldn’t find that account. Double-check the number and bank.');
    }).catch(() => { if (!cancelled) setResolveError('Couldn’t verify that account right now.'); })
      .finally(() => { if (!cancelled) setResolving(false); });
    return () => { cancelled = true; };
  }, [bankCode, accountNumber, key]);

  const filteredBanks = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    return q ? banks.filter(b => bankSearchStr(b.name).includes(q)).slice(0, 6) : [];
  }, [banks, bankQuery]);
  function pickBank(b: Bank) { setBankCode(b.code); setBankQuery(b.name); setBankOpen(false); setTimeout(() => accountRef.current?.focus(), 60); }

  const showBank = Number(amount) > 0;
  const showAccount = showBank && !!bankCode;
  const canSubmit = showAccount && !!accountName && !submitting;

  // 2. Create the Weave order, then bind it to the anchor transaction.
  async function submit() {
    if (!ctx) return;
    setSubmitting(true); setError(null);
    try {
      const bank = { kind: 'bank_account', assetKey: 'fiat:NGN', bankInstitution: bankCode, bankAccountIdentifier: accountNumber.trim(), bankAccountName: accountName, label: `sep24:${ctx.id}` };
      const wallet = { kind: 'crypto_wallet', assetKey: STELLAR_ASSET, walletAddress: ctx.account, label: `sep24:${ctx.id}` };
      const body = isDeposit
        // Deposit: the payer's bank doubles as Paycrest's refund account.
        ? { source: { inline: bank }, dest: { inline: wallet }, amount: Number(amount), amountIn: 'source' }
        : { source: { inline: wallet }, dest: { inline: bank }, amount: Number(amount), amountIn: 'source', refundAddress: ctx.account };
      const res = await fetch(`${PROXY}/orders`, {
        method: 'POST', headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, reference: `sep24-${ctx.id}`, ...(email.trim() ? { customer: { email: email.trim() } } : {}) }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j.error || 'Could not start this transaction.');

      const link = await fetch(`${PROXY}/sep24/interactive/${ctx.id}/link`, {
        method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: j.data.order.id }),
      }).then(r => r.json());
      if (!link?.success) throw new Error(link?.error || 'Could not attach this transaction to your wallet session.');

      setOrder(j.data.order); setNextAction(j.data.nextAction);
      setMode(j.data.order.status === 'completed' ? 'done' : 'instructions');
    } catch (e: any) { setError(e.message ?? 'Something went wrong.'); }
    finally { setSubmitting(false); }
  }

  // 3. Poll the order to a terminal state.
  useEffect(() => {
    if (mode !== 'instructions' || !order?.id || !key) return;
    let stopped = false; let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stopped) return;
      try {
        const r = await fetch(`${PROXY}/orders/${order.id}`, { headers: { 'x-api-key': key } });
        const j = await r.json(); const s = String(j?.data?.status ?? '').toLowerCase();
        if (j?.data) setOrder(j.data);
        if (s === 'completed') { stopped = true; setMode('done'); return; }
        if (['failed', 'expired', 'refunded'].includes(s)) { stopped = true; setError(s === 'refunded' ? 'This transaction was refunded.' : 'This transaction could not be completed.'); setMode('error'); return; }
      } catch { /* keep polling */ }
      timer = setTimeout(tick, 4000);
    };
    timer = setTimeout(tick, 3000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [mode, order?.id, key]);

  // Tell the opener (SEP-24 wallets listen for this postMessage) when we're done.
  useEffect(() => {
    if (mode !== 'done' || !ctx) return;
    try { window.opener?.postMessage({ transaction: { id: ctx.id, status: 'completed', kind: ctx.kind } }, '*'); } catch {}
    try { window.parent?.postMessage({ transaction: { id: ctx.id, status: 'completed', kind: ctx.kind } }, '*'); } catch {}
  }, [mode, ctx]);

  function copy(k: string, text: string) { navigator.clipboard.writeText(text).then(() => { setCopied(k); setTimeout(() => setCopied(null), 1600); }).catch(() => {}); }

  // LI.FI leg: connect an external Stellar wallet and sign approve → bridge.
  // The wallet MUST be the SEP-10 authenticated account — funds leave that account.
  async function signWithWallet() {
    const ss = nextAction?.stellarSigning; if (!ss || !ctx) return;
    setSignError(null); setSignStage('connect');
    try {
      const addr = await connectStellarWallet();
      if (addr !== ctx.account) throw new Error(`Please connect the wallet you authenticated with (${shortG(ctx.account)}), not ${shortG(addr)}.`);
      const api = async (path: string, body?: unknown) => {
        const r = await fetch(`${PROXY}${path}`, { method: 'POST', headers: { 'x-api-key': key, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
        const j = await r.json().catch(() => ({}));
        return { ok: r.ok && j?.success !== false, status: r.status, data: j?.data, error: j?.error };
      };
      const { bridgeHash: h } = await runStellarBridgeFlow(ss, api, (xdr) => signAndSubmitXdr(xdr, addr), (stage) => setSignStage(stage));
      setBridgeHash(h);
    } catch (e: any) {
      setSignStage('idle'); setSignError(e?.message ?? 'Signing was cancelled.');
    }
  }

  // ── styles ───────────────────────────────────────────────────────────────
  const accent = '#0F5D4C', ink = '#1C1B17', mute = '#7C7568', hair = '#E2D9C0', panel = '#fff';
  const card: React.CSSProperties = { position: 'relative', zIndex: 20, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', border: `1px solid ${hair}`, borderRadius: 26, padding: 24, boxShadow: '0 20px 60px -28px rgba(0,0,0,0.28)' };
  const input: React.CSSProperties = { width: '100%', padding: '13px 14px', borderRadius: 13, border: `1px solid ${hair}`, background: panel, fontSize: 15, color: ink, outline: 'none' };
  const label: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: '#3B3A34', textTransform: 'uppercase', letterSpacing: 0.4 };
  const primaryBtn = (enabled: boolean): React.CSSProperties => ({ width: '100%', padding: '15px', borderRadius: 16, background: accent, color: '#fff', fontWeight: 600, fontSize: 15.5, border: 'none', cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.45 });
  const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${hair}` };
  const mono: React.CSSProperties = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 14, wordBreak: 'break-all', textAlign: 'right' };

  const title = isDeposit ? 'Add naira to your wallet' : 'Withdraw to a Nigerian bank';
  const subtitle = isDeposit
    ? 'Pay by bank transfer. USDC lands in your Stellar wallet within minutes.'
    : 'USDC leaves your Stellar wallet; naira lands in your bank within minutes.';

  return (
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif', color: ink, background: '#F5EFE0' }}>
      <style>{`@keyframes wspin{to{transform:rotate(360deg)}}@keyframes reveal{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}.reveal{animation:reveal .28s ease}`}</style>
      <header style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>W</div>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Weave</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: mute }}>Stellar anchor · NGN{ctx?.sandbox ? ' · sandbox' : ''}</span>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '10px 16px 48px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.3 }}>{title}</h1>
            <p style={{ fontSize: 14, color: mute, marginTop: 6 }}>{subtitle}</p>
            {ctx && <p style={{ fontSize: 12, color: mute, marginTop: 6 }}>Wallet <span style={{ fontFamily: 'ui-monospace, monospace' }}>{shortG(ctx.account)}</span></p>}
          </div>

          {mode === 'loading' && <div style={{ ...card, textAlign: 'center', color: mute }}>Loading your session…</div>}

          {mode === 'form' && ctx && (
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <span style={label}>{isDeposit ? 'How much naira are you adding?' : 'How much USDC are you withdrawing?'}</span>
                <div className="cashout-field" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, border: `1px solid ${hair}`, borderRadius: 14, background: panel, padding: '4px 14px', ['--field-accent' as string]: accent } as React.CSSProperties}>
                  <span style={{ fontSize: 18, fontWeight: 600, color: mute }}>{isDeposit ? '₦' : '$'}</span>
                  <input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))} placeholder={isDeposit ? '50,000' : '25'} autoFocus
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: 22, fontWeight: 600, padding: '10px 0', background: 'transparent', color: ink }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: mute }}>{isDeposit ? 'NGN' : 'USDC'}</span>
                </div>
                <div style={{ fontSize: 13, color: mute, marginTop: 8, minHeight: 18 }}>
                  {estimating ? 'Calculating…' : estimate != null ? <>You’ll receive about <b style={{ color: ink }}>{isDeposit ? fmtUsdc(estimate) : fmtNgn(estimate)}</b></> : ''}
                </div>
              </div>

              {showBank && (
                <div className="reveal" style={{ position: 'relative' }}>
                  <span style={label}>{isDeposit ? 'Your bank (for refunds, if anything fails)' : 'Bank to receive naira'}</span>
                  <input value={bankQuery} onChange={e => { setBankQuery(e.target.value); setBankCode(''); setBankOpen(true); }} onFocus={() => setBankOpen(true)} placeholder="Start typing your bank…" style={{ ...input, marginTop: 8 }} />
                  {bankOpen && filteredBanks.length > 0 && !bankCode && (
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 6, background: panel, border: `1px solid ${hair}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 16px 40px -20px rgba(0,0,0,0.3)', zIndex: 30 }}>
                      {filteredBanks.map(b => <button key={b.code} onClick={() => pickBank(b)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '11px 14px', border: 'none', background: 'transparent', fontSize: 14.5, cursor: 'pointer', color: ink }}>{b.name}</button>)}
                    </div>
                  )}
                </div>
              )}

              {showAccount && (
                <div className="reveal">
                  <span style={label}>Account number</span>
                  <input ref={accountRef} inputMode="numeric" value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="0123456789" style={{ ...input, marginTop: 8, letterSpacing: 1 }} />
                  <div style={{ fontSize: 13, marginTop: 8, minHeight: 18, color: resolveError ? '#A8321E' : accent, fontWeight: accountName ? 600 : 400 }}>
                    {resolving ? <span style={{ color: mute }}>Checking account…</span> : accountName || resolveError || ''}
                  </div>
                </div>
              )}

              {accountName && (
                <div className="reveal">
                  <span style={label}>Email for your receipt (optional)</span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={{ ...input, marginTop: 8 }} />
                </div>
              )}

              {error && <div style={{ fontSize: 13.5, color: '#A8321E', background: '#FBEAE5', borderRadius: 12, padding: '10px 12px' }}>{error}</div>}

              <button disabled={!canSubmit} onClick={submit} style={primaryBtn(canSubmit)}>
                {submitting ? 'Starting…' : isDeposit ? 'Get bank transfer details' : `Withdraw ${amount ? fmtUsdc(Number(amount)) : 'USDC'}`}
              </button>
              <p style={{ fontSize: 11.5, color: mute, textAlign: 'center', margin: 0 }}>Fee 0.85% · settles through Paycrest and Stellar · non-custodial</p>
            </div>
          )}

          {mode === 'instructions' && ctx && (
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {isDeposit ? (
                <>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Transfer exactly this amount</div>
                  {nextAction?.bankDetails ? (
                    <div>
                      {[
                        ['Bank', nextAction.bankDetails.institution, 'bank'],
                        ['Account number', nextAction.bankDetails.accountIdentifier, 'acct'],
                        ['Account name', nextAction.bankDetails.accountName, 'name'],
                        ['Amount', `₦${Number(nextAction.bankDetails.amountToTransfer).toLocaleString()}`, 'amt'],
                      ].map(([l, v, k]) => (
                        <div key={k} style={row}>
                          <span style={{ fontSize: 13, color: mute }}>{l}</span>
                          <button onClick={() => copy(k, String(v))} style={{ ...mono, background: 'transparent', border: 'none', cursor: 'pointer', color: ink, padding: 0 }}>{copied === k ? 'Copied ✓' : v}</button>
                        </div>
                      ))}
                    </div>
                  ) : <div style={{ color: mute, fontSize: 14 }}>Preparing your bank details…</div>}
                  <p style={{ fontSize: 13, color: mute, margin: 0 }}>Once your transfer lands, USDC is delivered to <span style={{ fontFamily: 'ui-monospace, monospace' }}>{shortG(ctx.account)}</span>. Keep this page open or return to your wallet — it tracks the same transaction.</p>
                </>
              ) : nextAction?.screen === 'sign_stellar_tx' ? (
                <>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Approve and send from your Stellar wallet</div>
                  <p style={{ fontSize: 13.5, color: mute, margin: 0 }}>
                    Two quick signatures: an expiring USDC allowance, then the bridge. <b style={{ color: ink }}>{fmtUsdc(Number(nextAction.stellarSigning?.amount ?? amount))}</b> burns on Stellar and mints on Base straight into the payout — Weave never holds it.
                  </p>
                  <div>
                    {[
                      ['From', shortG(ctx.account), 'from'],
                      ['Naira arriving', fmtNgn(order?.destAmount ?? estimate), 'ngn'],
                      ['Bridge', 'Circle CCTP via LI.FI · ~3 min', 'tool'],
                    ].map(([l, v, k]) => (
                      <div key={k} style={row}><span style={{ fontSize: 13, color: mute }}>{l}</span><span style={{ ...mono, fontFamily: k === 'from' ? mono.fontFamily : undefined }}>{v}</span></div>
                    ))}
                  </div>
                  {signStage === 'done' ? (
                    <div style={{ fontSize: 13, color: accent, fontWeight: 600 }}>Bridge submitted{bridgeHash ? ` · ${bridgeHash.slice(0, 10)}…` : ''} — settling to your bank.</div>
                  ) : (
                    <button onClick={signWithWallet} disabled={signStage !== 'idle'} style={primaryBtn(signStage === 'idle')}>
                      {signStage === 'idle' ? 'Connect wallet & sign' : signStage === 'connect' ? 'Waiting for wallet…' : signStage === 'approve' ? 'Sign 1 of 2 — approve USDC' : signStage === 'bridge' ? 'Sign 2 of 2 — bridge' : 'Submitting…'}
                    </button>
                  )}
                  {signError && <div style={{ fontSize: 13, color: '#A8321E' }}>{signError}</div>}
                  <p style={{ fontSize: 12, color: mute, margin: 0 }}>Using a Pollar wallet? Finish this transfer inside your Pollar app — it signs the same two transactions for you.</p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Return to your wallet to confirm</div>
                  <p style={{ fontSize: 13.5, color: mute, margin: 0 }}>Your wallet will send <b style={{ color: ink }}>{fmtUsdc(Number(nextAction?.amount ?? amount))}</b> to Weave’s Stellar address below. If it doesn’t do this automatically, send it yourself — the memo is required.</p>
                  <div>
                    {[
                      ['Send to', nextAction?.depositAddress, 'addr'],
                      ['Memo (required)', nextAction?.depositMemo ?? '—', 'memo'],
                      ['Amount', fmtUsdc(Number(nextAction?.amount ?? amount)), 'amt'],
                      ['Naira arriving', fmtNgn(order?.destAmount ?? estimate), 'ngn'],
                    ].map(([l, v, k]) => (
                      <div key={k} style={row}>
                        <span style={{ fontSize: 13, color: mute, whiteSpace: 'nowrap' }}>{l}</span>
                        <button onClick={() => v && copy(k, String(v))} style={{ ...mono, background: 'transparent', border: 'none', cursor: 'pointer', color: ink, padding: 0 }}>{copied === k ? 'Copied ✓' : v}</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: mute }}>
                <span style={{ width: 14, height: 14, border: `2px solid ${hair}`, borderTopColor: accent, borderRadius: '50%', animation: 'wspin .9s linear infinite' }} />
                {isDeposit ? 'Waiting for your bank transfer' : signStage === 'done' || order?.status === 'processing' ? 'Bridging and paying out' : 'Waiting for your signature'}… ({order?.status})
              </div>
            </div>
          )}

          {mode === 'done' && ctx && (
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#E6F3EC', color: '#1F7A4D', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 26 }}>✓</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{isDeposit ? 'USDC delivered' : 'Naira sent'}</div>
              <p style={{ fontSize: 14, color: mute, marginTop: 6 }}>
                {isDeposit ? <>{fmtUsdc(order?.destAmount ?? null)} is in {shortG(ctx.account)}.</> : <>{fmtNgn(order?.destAmount ?? null)} is on its way to {accountName || 'your bank'}.</>}
              </p>
              <button onClick={() => window.close()} style={{ ...primaryBtn(true), marginTop: 18 }}>Back to your wallet</button>
            </div>
          )}

          {mode === 'error' && (
            <div style={{ ...card, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#A8321E' }}>Something went wrong</div>
              <p style={{ fontSize: 14, color: mute, marginTop: 6 }}>{error}</p>
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: 11.5, color: mute, marginTop: 18 }}>Secured by Weave · SEP-24 anchor{lang ? ` · ${lang}` : ''}</p>
        </div>
      </main>
    </div>
  );
}
