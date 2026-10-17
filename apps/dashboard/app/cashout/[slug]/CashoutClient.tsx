'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fontStack, ensureFontLoaded } from '../../lib/brand-fonts';
import { buildCryptoOfframpProgress } from '@weave/shared';
import { CashoutProgressTimeline } from '../CashoutProgressTimeline';
import {
  configureCashoutStellarFromApi,
  connectCashoutStellarWallet,
  getCashoutStellarNetwork,
  isStellarUsdcAsset,
  sendCashoutStellarUsdc,
} from '../../lib/cashout-stellar-pay';

// Customer-facing, merchant-BRANDED, chain-agnostic cash-out. A SINGLE progressive
// screen: each field reveals under the previous as it's completed, the next input
// auto-focuses, and there's exactly one action at the end — no "select and select",
// no wizard of Continue buttons, no jargon (a refund address only appears if a
// chain actually needs one). All API calls go through the same-origin public proxy.

type Brand = {
  logoUrl?: string; accentColor?: string; displayName?: string;
  headline?: string; subheadline?: string; bgColor?: string; bgImageUrl?: string; font?: string;
};
type PayoutLink = {
  id: string; title: string; description: string | null;
  sourceAsset: string | null; payoutCurrency: string; amount: string | null;
  merchantName: string; publishableKey: string; brand: Brand | null;
};
type Asset = { key: string; token: string; network: string; name: string; logo?: string; tint?: string };
type Bank = { name: string; code: string };
type Mode = 'form' | 'send' | 'done' | 'error';

type QuoteSnap = {
  estimatedDest: number;
  sellRate: number | null;
};

const PROXY = '/api/public';
const COMMON = ['crypto:BASE:USDC', 'crypto:BASE:ETH', 'crypto:ETHEREUM:USDC', 'crypto:ETHEREUM:USDT'];

// Nigerians type the short name — match "gtb", "uba", "fbn", "fcmb"… to the full
// institution name. Keyed by a substring of the official name.
const BANK_ALIASES: Record<string, string> = {
  'guaranty trust': 'gtb gtbank gt bank',
  'united bank for africa': 'uba',
  'first bank': 'fbn firstbank',
  'first city monument': 'fcmb',
  'stanbic': 'ibtc stanbic ibtc',
  'wema': 'alat',
  'ecobank': 'eco',
  'union bank': 'union',
  'access': 'access diamond',
  'zenith': 'zenith',
  'fidelity': 'fidelity',
  'sterling': 'sterling',
  'polaris': 'polaris',
  'keystone': 'keystone',
  'providus': 'providus',
  'moniepoint': 'monie',
  'opay': 'opay',
  'palmpay': 'palm',
  'kuda': 'kuda',
};
function bankSearchStr(name: string): string {
  const lower = name.toLowerCase();
  let s = lower;
  for (const [needle, aliases] of Object.entries(BANK_ALIASES)) if (lower.includes(needle)) s += ' ' + aliases;
  return s;
}

function resolveTheme(b: Brand | null) {
  return {
    accent: b?.accentColor || '#3D6B50', bg: b?.bgColor || '#F5EFE0', bgImage: b?.bgImageUrl || null,
    font: fontStack(b?.font), fontKey: b?.font ?? 'system', logoUrl: b?.logoUrl || null,
    name: b?.displayName || null, headline: b?.headline || null, subheadline: b?.subheadline || null,
  };
}
function fmtNgn(n: number | null, sym: string) { return n == null ? '' : `${sym}${Math.round(n).toLocaleString()}`; }

export default function CashoutClient({ link }: { link: PayoutLink }) {
  const t = useMemo(() => resolveTheme(link.brand), [link.brand]);
  const sym = link.payoutCurrency === 'NGN' ? '₦' : '';
  const fixedAmount = link.amount != null ? Number(link.amount) : null;

  const [mode, setMode] = useState<Mode>('form');
  const [error, setError] = useState<string | null>(null);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [asset, setAsset] = useState<string>(link.sourceAsset ?? 'crypto:BASE:USDC');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [amount, setAmount] = useState(fixedAmount != null ? String(fixedAmount) : '');
  const [estimate, setEstimate] = useState<number | null>(null);
  const [quoteSnap, setQuoteSnap] = useState<QuoteSnap | null>(null);
  const [lockedPayout, setLockedPayout] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [walletPaying, setWalletPaying] = useState(false);
  const [walletErr, setWalletErr] = useState<string | null>(null);

  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState('');
  const [bankQuery, setBankQuery] = useState('');
  const [bankOpen, setBankOpen] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);

  const [needsRefund, setNeedsRefund] = useState(false);
  const [refundAddress, setRefundAddress] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [liveOrder, setLiveOrder] = useState<any>(null);
  const [deposit, setDeposit] = useState<{ address: string; memo: string | null; amount: number; token: string; chain: string } | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [stellarNetwork, setStellarNetwork] = useState<'testnet' | 'mainnet'>(getCashoutStellarNetwork());

  const key = link.publishableKey;
  const accountRef = useRef<HTMLInputElement>(null);
  const selected = useMemo(() => assets.find(a => a.key === asset), [assets, asset]);
  const tokenLabel = selected?.token ?? asset.split(':')[2] ?? 'crypto';
  const networkLabel = selected?.network ?? asset.split(':')[1] ?? '';

  // Progressive-reveal gates.
  const showBank = Number(amount) > 0;
  const showAccount = showBank && !!bankCode;
  const showAction = showAccount && !!accountName && (!needsRefund || !!refundAddress.trim());

  const progress = useMemo(() => {
    if (!liveOrder) return null;
    return buildCryptoOfframpProgress(liveOrder, {
      merchantName: accountName || t.name || link.merchantName,
      currency: link.payoutCurrency,
      stellarNetwork,
    });
  }, [liveOrder, accountName, t.name, link.merchantName, link.payoutCurrency, stellarNetwork]);

  const nearStatus = String(liveOrder?.nearStatus ?? '').toLowerCase();

  const orderStatus = String(liveOrder?.status ?? order?.status ?? '').toLowerCase();
  const depositStepDone = liveOrder?.steps?.some(
    (s: any) => (s.provider === 'nearintents' || s.provider === 'stellar') && String(s.status).toLowerCase() === 'done',
  );
  const showDepositDetails = mode === 'send' && deposit && (!depositStepDone || orderStatus === 'awaiting_deposit');

  useEffect(() => { ensureFontLoaded(t.fontKey); }, [t.fontKey]);

  useEffect(() => {
    fetch(`${PROXY}/stellar/config`)
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        configureCashoutStellarFromApi(j?.data ?? null);
        setStellarNetwork(getCashoutStellarNetwork());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/assets').then(r => r.ok ? r.json() : null).then(j => {
      const c: Asset[] = j?.crypto ?? j?.data?.crypto ?? [];
      c.sort((a, b) => (COMMON.indexOf(a.key) + 1 || 99) - (COMMON.indexOf(b.key) + 1 || 99));
      setAssets(c);
    }).catch(() => {});
    fetch(`${PROXY}/institutions?currency=${link.payoutCurrency}`, { headers: { 'x-api-key': key } })
      .then(r => r.ok ? r.json() : null).then(j => { if (j?.success) setBanks(j.data ?? []); }).catch(() => {});
  }, [key, link.payoutCurrency]);

  // Live ₦ estimate (debounced).
  useEffect(() => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setEstimate(null); setQuoteSnap(null); return; }
    let cancelled = false; setEstimating(true);
    const flow = isStellarUsdcAsset(asset) ? 'stellar' : 'external';
    const id = setTimeout(() => {
      fetch(`${PROXY}/quotes?from=${encodeURIComponent(asset)}&to=fiat:${link.payoutCurrency}&amount=${amt}&amountIn=source&flow=${flow}`, { headers: { 'x-api-key': key } })
        .then(r => r.json()).then(j => {
          if (cancelled || !j?.success) {
            if (!cancelled) { setEstimate(null); setQuoteSnap(null); }
            return;
          }
          const est = Number(j.data?.estimatedDest ?? null);
          setEstimate(Number.isFinite(est) ? est : null);
          setQuoteSnap({
            estimatedDest: est,
            sellRate: j.data?.breakdown?.sellRate != null ? Number(j.data.breakdown.sellRate) : null,
          });
        })
        .catch(() => { if (!cancelled) { setEstimate(null); setQuoteSnap(null); } })
        .finally(() => { if (!cancelled) setEstimating(false); });
    }, 450);
    return () => { cancelled = true; clearTimeout(id); setEstimating(false); };
  }, [amount, asset, key, link.payoutCurrency]);

  // Resolve recipient account name automatically at 10 digits.
  useEffect(() => {
    setAccountName(''); setResolveError(null);
    if (!bankCode || accountNumber.replace(/\D/g, '').length < 10) return;
    let cancelled = false; setResolving(true);
    fetch(`${PROXY}/institutions/verify`, {
      method: 'POST', headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ institution: bankCode, accountIdentifier: accountNumber.trim(), currency: link.payoutCurrency }),
    }).then(r => r.json()).then(j => {
      if (cancelled) return;
      if (j?.success && j.data) setAccountName(String(j.data)); else setResolveError('We couldn’t find that account. Double-check the number and bank.');
    }).catch(() => { if (!cancelled) setResolveError('Couldn’t verify that account right now.'); })
      .finally(() => { if (!cancelled) setResolving(false); });
    return () => { cancelled = true; };
  }, [bankCode, accountNumber, key, link.payoutCurrency]);

  // Typeahead: only surface a SHORT list, and only once the user has typed.
  const bankHasQuery = bankQuery.trim().length >= 1 && !bankCode;
  const filteredBanks = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    if (!q) return [];
    return banks.filter(b => bankSearchStr(b.name).includes(q)).slice(0, 6);
  }, [banks, bankQuery]);

  function pickBank(b: Bank) {
    setBankCode(b.code); setBankQuery(b.name); setBankOpen(false);
    setTimeout(() => accountRef.current?.focus(), 60); // auto-advance: hands go straight to the account number
  }

  async function cashOut() {
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`${PROXY}/orders`, {
        method: 'POST', headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: { inline: { kind: 'crypto_wallet', assetKey: asset } },
          dest: { inline: { kind: 'bank_account', assetKey: `fiat:${link.payoutCurrency}`, bankInstitution: bankCode, bankAccountIdentifier: accountNumber.trim(), bankAccountName: accountName, label: `cashout:${link.id}` } },
          amount: Number(amount), amountIn: 'source',
          flow: isStellarUsdcAsset(asset) ? 'stellar' : 'external',
          ...(refundAddress.trim() ? { refundAddress: refundAddress.trim() } : {}),
          ...(email.trim() ? { customer: { email: email.trim() } } : {}),
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.success) {
        if (/refund/i.test(j.error || '') && !refundAddress.trim()) { setNeedsRefund(true); setError('Almost there — enter the wallet you’ll send from, so we can return funds if anything goes wrong.'); return; }
        throw new Error(j.error || 'Could not start your cash-out.');
      }
      const na = j.data.nextAction;
      if (!na?.depositAddress) throw new Error('No deposit address was returned. Please try again.');
      setOrder(j.data.order);
      setLiveOrder(j.data.order);
      const locked = j.data.order?.destAmount != null ? Number(j.data.order.destAmount) : (estimate ?? null);
      setLockedPayout(locked);
      setPayoutAmount(locked);
      setDeposit({ address: na.depositAddress, memo: na.depositMemo ?? null, amount: Number(na.amount ?? amount), token: na.token ?? tokenLabel, chain: na.chain ?? networkLabel });
      setWalletErr(null);
      setMode('send');
    } catch (e: any) { setError(e.message ?? 'Something went wrong.'); }
    finally { setSubmitting(false); }
  }

  // Poll to terminal.
  useEffect(() => {
    if (mode !== 'send' || !order?.id) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let failCount = 0;
    const POLL_BASE = 4000;
    const POLL_MAX = 30000;

    const tick = async () => {
      if (stopped) return;
      try {
        const r = await fetch(`${PROXY}/orders/${order.id}`, { headers: { 'x-api-key': key } });
        const j = await r.json();
        failCount = 0;
        if (j?.data) setLiveOrder(j.data);
        const s = String(j?.data?.status ?? '').toLowerCase();
        if (j?.data?.destAmount != null) setPayoutAmount(Number(j.data.destAmount));
        if (s === 'completed') { stopped = true; setMode('done'); return; }
        if (['failed', 'expired', 'refunded'].includes(s)) { stopped = true; setError('Your cash-out could not be completed.'); setMode('error'); return; }
      } catch {
        failCount++;
      }
      const delay = Math.min(POLL_BASE * Math.pow(2, failCount), POLL_MAX);
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, POLL_BASE);
    return () => { stopped = true; clearTimeout(timer); };
  }, [mode, order?.id, key]);

  function copy(id: string, text: string) { navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(null), 1600); }).catch(() => {}); }

  const canPayWithStellarWallet = !!(deposit?.memo && isStellarUsdcAsset(asset));

  async function payWithConnectedWallet() {
    if (!deposit?.memo) return;
    setWalletPaying(true);
    setWalletErr(null);
    try {
      await connectCashoutStellarWallet();
      await sendCashoutStellarUsdc({
        destination: deposit.address,
        amount: deposit.amount,
        memo: deposit.memo,
      });
    } catch (e: any) {
      setWalletErr(e?.message ?? 'Wallet payment failed.');
    } finally {
      setWalletPaying(false);
    }
  }

  // Reset back to a fresh cash-out (keeps the chosen token — they'll likely repeat it).
  function reset() {
    setAmount(fixedAmount != null ? String(fixedAmount) : ''); setEstimate(null); setQuoteSnap(null); setLockedPayout(null);
    setBankCode(''); setBankQuery(''); setBankOpen(false);
    setAccountNumber(''); setAccountName(''); setResolveError(null);
    setEmail(''); setEmailOpen(false); setNeedsRefund(false); setRefundAddress('');
    setOrder(null); setLiveOrder(null); setDeposit(null); setPayoutAmount(null); setWalletErr(null); setError(null);
    setMode('form');
  }

  // ── styles ────────────────────────────────────────────────────────────────
  const ink = '#1C1B17', mute = '#7C7568', hair = '#E2D9C0', panel = '#fff';
  const brandName = t.name || link.merchantName;
  const pageBg: React.CSSProperties = t.bgImage ? { backgroundImage: `url(${t.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: t.bg };
  // position/zIndex: the card's backdrop-filter makes it a stacking context, which
  // would otherwise trap the bank dropdown behind the "Secured by Weave" footer
  // (a later sibling). Lifting the whole card above the footer keeps the
  // overflowing dropdown on top.
  const card: React.CSSProperties = { position: 'relative', zIndex: 20, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', border: `1px solid ${hair}`, borderRadius: 26, padding: 24, boxShadow: '0 20px 60px -28px rgba(0,0,0,0.28)' };
  const input: React.CSSProperties = { width: '100%', padding: '13px 14px', borderRadius: 13, border: `1px solid ${hair}`, background: panel, fontSize: 15, color: ink, outline: 'none' };
  const label: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: '#3B3A34', textTransform: 'uppercase', letterSpacing: 0.4 };
  const primaryBtn = (enabled: boolean): React.CSSProperties => ({ width: '100%', padding: '15px', borderRadius: 16, background: t.accent, color: '#fff', fontWeight: 600, fontSize: 15.5, border: 'none', cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.45 });

  return (
    <div style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', fontFamily: t.font, color: ink, ...pageBg }}>
      <style>{`@keyframes wspin{to{transform:rotate(360deg)}}@keyframes reveal{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}.reveal{animation:reveal .28s ease}`}</style>
      <header style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {t.logoUrl ? <img src={t.logoUrl} alt={brandName} style={{ height: 32, maxWidth: 160, objectFit: 'contain' }} />
          : <div style={{ width: 34, height: 34, borderRadius: '50%', background: t.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>{brandName.charAt(0).toUpperCase()}</div>}
        <span style={{ fontSize: 15, fontWeight: 600 }}>{brandName}</span>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '10px 16px 48px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h1 style={{ fontSize: 27, fontWeight: 700, letterSpacing: -0.3 }}>{t.headline || 'Cash out your crypto'}</h1>
            <p style={{ fontSize: 14, color: mute, marginTop: 6 }}>{t.subheadline || link.description || `Get ${link.payoutCurrency} in your bank in minutes.`}</p>
          </div>

          {mode === 'form' && (
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Amount + token */}
              <div>
                <span style={label}>How much are you cashing out?</span>
                <div className="cashout-field" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, border: `1px solid ${hair}`, borderRadius: 14, background: panel, padding: '4px 4px 4px 16px', ['--field-accent' as string]: t.accent } as React.CSSProperties}>
                  <input inputMode="decimal" autoFocus value={amount} disabled={fixedAmount != null}
                    onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00"
                    style={{ flex: 1, border: 'none', outline: 'none', boxShadow: 'none', fontSize: 26, fontWeight: 600, color: ink, background: 'transparent', minWidth: 0 }} />
                  <button onClick={() => !link.sourceAsset && setPickerOpen(true)} disabled={!!link.sourceAsset}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F3EEE1', border: `1px solid ${hair}`, borderRadius: 12, padding: '8px 12px', cursor: link.sourceAsset ? 'default' : 'pointer', flexShrink: 0 }}>
                    {selected && <TokenIcon asset={selected} size={20} accent={t.accent} />}
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{tokenLabel}</span>
                      <span style={{ fontSize: 10.5, color: mute }}>{networkLabel}</span>
                    </span>
                    {!link.sourceAsset && <span style={{ color: mute, fontSize: 12 }}>▾</span>}
                  </button>
                </div>
                <div style={{ minHeight: 20, marginTop: 8, fontSize: 13.5, color: t.accent, fontWeight: 600 }}>
                  {estimating ? <span style={{ color: mute, fontWeight: 400 }}>Calculating…</span> : estimate ? `≈ ${fmtNgn(estimate, sym)} to your bank` : ''}
                </div>
                {quoteSnap?.sellRate != null && Number(quoteSnap.sellRate) > 0 && (
                  <p style={{ fontSize: 11.5, color: mute, marginTop: 6, lineHeight: 1.45 }}>
                    Live rate: <strong style={{ color: ink }}>1 {tokenLabel}</strong> ≈{' '}
                    <strong style={{ color: ink }}>{sym}{Math.round(quoteSnap.sellRate).toLocaleString()}</strong> {link.payoutCurrency}
                    {' '}· Bank payout is estimated after network &amp; platform fees at this rate.
                  </p>
                )}
              </div>

              {/* Bank (reveals under amount) */}
              {showBank && (
                <div className="reveal" style={{ position: 'relative' }}>
                  <span style={label}>Your bank</span>
                  <input value={bankCode ? (banks.find(b => b.code === bankCode)?.name ?? bankQuery) : bankQuery}
                    onChange={e => { setBankQuery(e.target.value); setBankCode(''); setBankOpen(true); }}
                    onFocus={() => !bankCode && setBankOpen(true)} placeholder="Type your bank name…"
                    style={{ ...input, marginTop: 6 }} />
                  {bankOpen && bankHasQuery && filteredBanks.length > 0 && (
                    <div style={{ position: 'absolute', zIndex: 10, top: '100%', left: 0, right: 0, marginTop: 4, background: panel, border: `1px solid ${hair}`, borderRadius: 12, overflow: 'hidden', boxShadow: '0 12px 30px -12px rgba(0,0,0,0.2)' }}>
                      {filteredBanks.map(b => (
                        <button key={b.code} onClick={() => pickBank(b)}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', fontSize: 14, color: ink, cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F6F2E8')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          {b.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Account number (reveals under bank) */}
              {showAccount && (
                <div className="reveal">
                  <span style={label}>Account number</span>
                  <input ref={accountRef} inputMode="numeric" value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="0123456789" style={{ ...input, marginTop: 6, letterSpacing: 1 }} />
                  {resolving && <p style={{ fontSize: 12.5, color: mute, marginTop: 6 }}>Checking…</p>}
                  {accountName && <p style={{ fontSize: 13.5, color: t.accent, fontWeight: 600, marginTop: 6 }}>✓ {accountName}</p>}
                  {resolveError && <p style={{ fontSize: 12.5, color: '#C45B4F', marginTop: 6 }}>{resolveError}</p>}
                </div>
              )}

              {/* Refund — only if a chain actually needs it */}
              {needsRefund && (
                <div className="reveal">
                  <span style={label}>The wallet you’re sending from</span>
                  <input value={refundAddress} onChange={e => setRefundAddress(e.target.value.trim())} placeholder="0x… (so we can return funds if needed)" style={{ ...input, marginTop: 6, fontSize: 13 }} />
                </div>
              )}

              {error && !needsRefund && <p style={{ fontSize: 13, color: '#C45B4F' }}>{error}</p>}
              {error && needsRefund && <p style={{ fontSize: 12.5, color: mute }}>{error}</p>}

              {/* The single action, revealed once everything's ready */}
              {showAction && (
                <div className="reveal">
                  {!emailOpen
                    ? <button onClick={() => setEmailOpen(true)} style={{ background: 'transparent', border: 'none', color: mute, fontSize: 12.5, cursor: 'pointer', marginBottom: 10 }}>+ Email me a receipt</button>
                    : <input type="email" autoFocus value={email} onChange={e => setEmail(e.target.value.trim())} placeholder="you@example.com" style={{ ...input, marginBottom: 10, fontSize: 13 }} />}
                  <button onClick={cashOut} disabled={submitting} style={primaryBtn(!submitting)}>
                    {submitting ? 'Processing…' : `Cash out${estimate ? ` — get ${fmtNgn(estimate, sym)}` : ''}`}
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === 'send' && deposit && (
            <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.accent, textTransform: 'uppercase', letterSpacing: 0.5 }}>Cash-out in progress</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>
                  {depositStepDone ? 'Settling to your bank' : `Send ${deposit.amount} ${deposit.token}`}
                </div>
                <div style={{ fontSize: 13.5, color: mute, marginTop: 3 }}>
                  {depositStepDone
                    ? (payoutAmount != null ? <>About <b>{fmtNgn(payoutAmount, sym)}</b> to {accountName}</> : `Payout to ${accountName}`)
                    : <>on <b>{deposit.chain}</b> — then we send {link.payoutCurrency} to your bank</>}
                </div>
                {lockedPayout != null && (
                  <p style={{ fontSize: 12, color: ink, marginTop: 10, lineHeight: 1.45 }}>
                    Locked at checkout: <strong>{fmtNgn(lockedPayout, sym)}</strong>
                    {quoteSnap?.sellRate ? (
                      <span style={{ color: mute }}> · 1 {tokenLabel} ≈ {sym}{Math.round(quoteSnap.sellRate).toLocaleString()}</span>
                    ) : null}
                  </p>
                )}
              </div>

              {progress?.steps?.length ? (
                <CashoutProgressTimeline steps={progress.steps} accent={t.accent} ink={ink} mute={mute} hair={hair} />
              ) : null}

              {canPayWithStellarWallet && !depositStepDone && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button type="button" onClick={payWithConnectedWallet} disabled={walletPaying} style={primaryBtn(!walletPaying)}>
                    {walletPaying ? 'Confirm in your wallet…' : `Pay ${deposit.amount} USDC from wallet`}
                  </button>
                  {walletErr && <p style={{ fontSize: 12.5, color: '#C45B4F', margin: 0 }}>{walletErr}</p>}
                  <p style={{ fontSize: 11.5, color: mute, textAlign: 'center', margin: 0 }}>Fastest option — connect Freighter or another Stellar wallet.</p>
                </div>
              )}

              {showDepositDetails && (
                <>
                  {canPayWithStellarWallet && !depositStepDone && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: mute, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' }}>
                      Or send manually
                    </div>
                  )}
                  <div style={{ height: 1, background: hair, margin: '4px 0' }} />
                  <div style={{ fontSize: 11, fontWeight: 600, color: mute, textTransform: 'uppercase', letterSpacing: 0.4 }}>Payment details</div>
                  <CopyRow label="Deposit address" value={deposit.address} id="addr" copied={copied} onCopy={copy} accent={t.accent} hair={hair} ink={ink} />
                  {deposit.memo && <CopyRow label="Memo / tag (required)" value={deposit.memo} id="memo" copied={copied} onCopy={copy} accent={t.accent} hair={hair} ink={ink} />}
                </>
              )}

              {!depositStepDone && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  background: nearStatus === 'incomplete_deposit' ? '#FFF5F5' : panel,
                  border: `1px solid ${nearStatus === 'incomplete_deposit' ? '#FFD1D1' : hair}`,
                  borderRadius: 10,
                }}>
                  {nearStatus === 'incomplete_deposit' ? (
                    <p style={{ fontSize: 12.5, color: '#C45B4F', lineHeight: 1.45, margin: 0 }}>
                      Partial payment received — send the remaining amount to finish this cash-out.
                    </p>
                  ) : nearStatus === 'processing' ? (
                    <p style={{ fontSize: 12.5, color: ink, lineHeight: 1.45, margin: 0 }}>
                      Deposit received. Preparing your bank payout…
                    </p>
                  ) : (
                    <p style={{ fontSize: 12.5, color: mute, lineHeight: 1.45, margin: 0 }}>
                      Send the exact amount from your wallet or exchange. This page updates when we see your transfer.
                    </p>
                  )}
                </div>
              )}
              {order?.id && (
                <p style={{ fontSize: 10.5, color: mute, textAlign: 'center', opacity: 0.85 }}>Reference: {order.id.slice(0, 8)}…</p>
              )}
              <p style={{ fontSize: 11.5, color: mute, textAlign: 'center' }}>Safe to leave open — we’ll keep checking until your bank payout completes.</p>
            </div>
          )}

          {mode === 'done' && (
            <div style={{ ...card, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ margin: '0 auto', width: 60, height: 60, borderRadius: '50%', background: `${t.accent}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: t.accent }}>✓</div>
              <h2 style={{ fontSize: 23, fontWeight: 700 }}>All done</h2>
              <p style={{ fontSize: 14.5, color: mute, lineHeight: 1.5 }}>{payoutAmount != null ? <><b style={{ color: ink }}>{fmtNgn(payoutAmount, sym)}</b> is on its way to </> : 'Your funds are on the way to '}{accountName}.</p>
              {order?.id && <p style={{ fontSize: 11, color: mute }}>Reference: {order.id}</p>}
              <button onClick={reset} style={{ ...primaryBtn(true), marginTop: 6 }}>New cash-out</button>
            </div>
          )}

          {mode === 'error' && (
            <div style={{ ...card, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Something went wrong</h2>
              <p style={{ fontSize: 13.5, color: mute }}>{error || 'Please try again.'}</p>
              <button onClick={reset} style={{ ...primaryBtn(true), width: 'auto', margin: '0 auto', padding: '10px 22px' }}>Start over</button>
            </div>
          )}

          <p style={{ fontSize: 11, color: mute, textAlign: 'center', marginTop: 18, opacity: 0.8 }}>Secured by Weave · your crypto settles to your own account</p>
        </div>
      </main>

      {pickerOpen && <TokenPicker assets={assets} onPick={k => { setAsset(k); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} accent={t.accent} ink={ink} mute={mute} hair={hair} />}
    </div>
  );
}

// Token logo with a graceful fallback to the tint circle (some registry logo URLs 404).
function TokenIcon({ asset, size, accent }: { asset: Asset; size: number; accent: string }) {
  const [failed, setFailed] = useState(false);
  if (asset.logo && !failed) {
    return <img src={asset.logo} alt="" onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: '50%' }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: asset.tint || accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: Math.round(size * 0.44), fontWeight: 700, flexShrink: 0 }}>
      {(asset.token || '?').charAt(0)}
    </div>
  );
}

function TokenPicker({ assets, onPick, onClose, accent, ink, mute, hair }: { assets: Asset[]; onPick: (k: string) => void; onClose: () => void; accent: string; ink: string; mute: string; hair: string }) {
  const [q, setQ] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  // Centered dialog on desktop; bottom sheet on mobile.
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    ref.current?.focus();
    const mq = window.matchMedia('(min-width: 640px)');
    const on = () => setDesktop(mq.matches); on();
    mq.addEventListener('change', on); return () => mq.removeEventListener('change', on);
  }, []);
  const list = q ? assets.filter(a => `${a.token} ${a.network}`.toLowerCase().includes(q.toLowerCase())) : assets;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,18,14,0.4)', display: 'flex', alignItems: desktop ? 'center' : 'flex-end', justifyContent: 'center', padding: desktop ? 16 : 0, zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: desktop ? 20 : '22px 22px 0 0', padding: 18, maxHeight: desktop ? '70vh' : '78vh', display: 'flex', flexDirection: 'column', boxShadow: desktop ? '0 30px 80px -30px rgba(0,0,0,0.4)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: ink }}>Choose what you’re cashing out</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, color: mute, cursor: 'pointer' }}>✕</button>
        </div>
        <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="Search token or chain…" style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1px solid ${hair}`, fontSize: 14, outline: 'none', marginBottom: 10 }} />
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {list.map(a => (
            <button key={a.key} onClick={() => onPick(a.key)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 10px', background: 'transparent', border: 'none', borderRadius: 12, cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F6F2E8')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <TokenIcon asset={a} size={30} accent={accent} />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span style={{ fontSize: 14.5, fontWeight: 600, color: ink }}>{a.token}</span>
                <span style={{ fontSize: 12, color: mute }}>on {a.network}</span>
              </div>
            </button>
          ))}
          {list.length === 0 && <p style={{ fontSize: 13, color: mute, textAlign: 'center', padding: 20 }}>No matches.</p>}
        </div>
      </div>
    </div>
  );
}

function CopyRow({ label, value, id, copied, onCopy, accent, hair, ink }: { label: string; value: string; id: string; copied: string | null; onCopy: (id: string, v: string) => void; accent: string; hair: string; ink: string }) {
  // Full address on its own full-width line (Copy moved up to the label row) — a
  // standard address fits on one line at full width and is shown in full; it only
  // wraps if a chain's address is genuinely longer.
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#3B3A34', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</span>
        <span onClick={() => onCopy(id, value)} style={{ fontSize: 11, color: accent, fontWeight: 600, cursor: 'pointer' }}>{copied === id ? 'Copied' : 'Copy'}</span>
      </div>
      <div onClick={() => onCopy(id, value)} style={{ marginTop: 6, padding: '12px 14px', borderRadius: 12, border: `1px solid ${hair}`, background: '#fff', cursor: 'pointer' }}>
        <span style={{ fontSize: 13, fontFamily: 'ui-monospace, monospace', color: ink, wordBreak: 'break-all' }}>{value}</span>
      </div>
    </div>
  );
}
