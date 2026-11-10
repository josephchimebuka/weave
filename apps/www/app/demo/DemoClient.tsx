'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { SUPPORTED_FIAT } from '@weave/shared';
import {
  DEMO_AMOUNT_LIMITS,
  DEMO_PAYOUT_COUNTRIES,
  demoCountry,
  type DemoPayoutCountry,
} from '../../lib/demo-payout-countries';

const BOB_BANKS = [
  { value: 'BNB', label: 'Banco Nacional de Bolivia' },
  { value: 'BCP', label: 'Banco de Crédito BCP' },
  { value: 'BISA', label: 'Banco BISA' },
  { value: 'MERCANTIL', label: 'Banco Mercantil Santa Cruz' },
];

// The widget imports @creit.tech/stellar-wallets-kit, which reads
// globalThis.localStorage at import time and throws during SSR / static
// prerender. Load it client-only so the module is never evaluated on the server.
const WeaveCheckout = dynamic(
  () => import('@weave-sdk/widget').then((m) => m.WeaveCheckout),
  { ssr: false },
);

// Reusing design elements from landing page
function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3 5 L8 19 L12 9 L16 19 L21 5" stroke="#0F5D4C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 9 L12 19 L19 9" stroke="#0B0F0E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
      </svg>
      <span style={{ fontWeight: 600, fontSize: size * 0.7, letterSpacing: -0.3, color: '#0B0F0E' }}>Weave</span>
    </div>
  );
}

const D_W = {
  ink: '#0B0F0E',
  ink2: '#3A4240',
  mute: '#6B7572',
  hair: '#E8EAE6',
  surface: '#FFFFFF',
  page: '#F5F4EF',
  panel: '#FAFAF7',
  accent: '#0F5D4C',
  accentSoft: '#E6F0EC',
};

function Field({ label, hint, children }: { label: string, hint?: string, children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] font-semibold text-[#3A4240] uppercase tracking-wider">{label}</span>
        {hint && <span className="text-[9.5px] text-[#6B7572]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}


function WovenBackground() {
  const threads = [
    { y: 120, color: 'rgba(232,168,140,0.55)', h: 90, x1: -100, x2: 1000 },
    { y: 220, color: 'rgba(15,93,76,0.18)', h: 70, x1: 200, x2: 1380 },
    { y: 320, color: 'rgba(220,200,170,0.50)', h: 110, x1: -80, x2: 900 },
    { y: 460, color: 'rgba(15,93,76,0.10)', h: 60, x1: 400, x2: 1380 },
    { y: 580, color: 'rgba(232,168,140,0.30)', h: 80, x1: -60, x2: 1100 },
  ]
  return (
    <>
      {threads.map((t, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: t.x1, top: t.y,
          width: t.x2 - t.x1, height: t.h,
          background: `linear-gradient(90deg, transparent 0%, ${t.color} 20%, ${t.color} 80%, transparent 100%)`,
          filter: 'blur(28px)',
          pointerEvents: 'none',
        }} />
      ))}
      <div style={{
        position: 'absolute', left: '50%', top: -40, width: 280, height: 760,
        transform: 'translateX(-50%)',
        background: 'linear-gradient(180deg, transparent 0%, rgba(15,93,76,0.10) 25%, rgba(15,93,76,0.06) 75%, transparent 100%)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />
      <svg
        width="100%" height="100%"
        style={{ position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none' }}
        aria-hidden
      >
        <defs>
          <pattern id="weavep" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M0 12 H24 M12 0 V24" stroke="#0B0F0E" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#weavep)" />
      </svg>
    </>
  )
}

type StellarPublicConfig = {
  network?: string;
  horizonUrl?: string;
  networkPassphrase?: string;
  usdcIssuer?: string;
};

function fiatMeta(code: string) {
  return SUPPORTED_FIAT.find(f => f.key === `fiat:${code}`) ?? SUPPORTED_FIAT[0];
}

function displayMeta(c: DemoPayoutCountry) {
  if (c.rail === 'weave') {
    const f = fiatMeta(c.currency);
    return { symbol: f.symbol, country: f.country, flag: f.flag };
  }
  return { symbol: c.symbol, country: c.name, flag: c.flag };
}

export default function DemoClient({
  apiUrl,
  apiKey: demoApiKey,
  stellarPublicConfig,
}: {
  apiUrl: string;
  apiKey: string;
  stellarPublicConfig?: StellarPublicConfig | null;
}) {
  const [payoutCountryId, setPayoutCountryId] = useState('NGN');
  const payoutCountry = demoCountry(payoutCountryId);

  const [merchant, setMerchant] = useState({
    name: 'Afriloom Textiles',
    amount: DEMO_AMOUNT_LIMITS.NGN.defaultAmount,
    currency: 'NGN',
  });

  const [payoutMode, setPayoutMode] = useState<'fiat' | 'crypto'>('fiat');
  const [boBank, setBoBank] = useState(BOB_BANKS[0].value);
  const [boAccount, setBoAccount] = useState('');
  const [boHolder, setBoHolder] = useState('');

  const [banks, setBanks] = useState<{ code: string; name: string }[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [fiatBank, setFiatBank] = useState('SELECT AN INSTITUTION');
  const [fiatAccount, setFiatAccount] = useState('');
  const [fiatAccountName, setFiatAccountName] = useState('');

  const limits = DEMO_AMOUNT_LIMITS[merchant.currency] ?? DEMO_AMOUNT_LIMITS.NGN;
  const meta = displayMeta(payoutCountry);
  const weaveRail = payoutCountry.rail === 'weave';
  const pollarRail = payoutCountry.rail === 'pollar';
  const soonRail = payoutCountry.rail === 'soon';
  const acctMin = merchant.currency === 'NGN' ? 10 : 8;
  const acctMax = merchant.currency === 'NGN' ? 10 : 20;
  const amountOk = merchant.amount >= limits.min && merchant.amount <= limits.max;
  const accountOk = fiatAccount.length >= acctMin && fiatAccount.length <= acctMax;
  const weaveBankOk = weaveRail && !!fiatAccountName && accountOk && fiatBank !== 'SELECT AN INSTITUTION';
  const pollarBankOk = pollarRail && !!boBank && boAccount.length >= 6 && boHolder.trim().length > 2;
  const fiatDetailsOk = weaveRail ? weaveBankOk : pollarRail ? pollarBankOk : false;
  const checkoutEnabled = payoutMode === 'crypto' || (payoutCountry.rail === 'weave' && amountOk && fiatDetailsOk);
  const [resolvingName, setResolvingName] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);

  // Crypto fields
  const [cryptoAddress, setCryptoAddress] = useState('');

  useEffect(() => {
    if (!weaveRail) {
      setBanks([]);
      setLoadingBanks(false);
      return;
    }
    setLoadingBanks(true);
    setFiatBank('SELECT AN INSTITUTION');
    setFiatAccount('');
    setFiatAccountName('');
    fetch(`${apiUrl}/institutions?currency=${merchant.currency}`)
      .then(r => r.json())
      .then(resp => {
        if (resp.success && Array.isArray(resp.data)) {
          setBanks(resp.data);
          if (resp.data.length > 0) setFiatBank(resp.data[0].code);
        } else {
          setBanks([]);
        }
      })
      .catch(err => console.error('Failed to fetch banks:', err))
      .finally(() => setLoadingBanks(false));
  }, [apiUrl, merchant.currency, weaveRail]);

  useEffect(() => {
    if (!weaveRail || !accountOk || !fiatBank || fiatBank === 'SELECT AN INSTITUTION') return;
    setResolvingName(true);
    setResolutionError(null);

    fetch(`${apiUrl}/institutions/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institution: fiatBank,
        accountIdentifier: fiatAccount,
        currency: merchant.currency,
      }),
    })
      .then(r => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then(resp => {
        if (resp.success && resp.data) {
          const resolvedName = resp.data === 'OK' ? '' : resp.data;
          if (resolvedName) {
            setFiatAccountName(resolvedName);
          } else {
            setResolutionError('Name lookup not available for this bank');
          }
        } else {
          setResolutionError('Could not resolve account name');
        }
      })
      .catch(err => {
        console.error('Failed to resolve account name:', err);
        setResolutionError('Resolution service timed out. Please enter name manually.');
      })
      .finally(() => setResolvingName(false));
  }, [fiatAccount, fiatBank, accountOk, apiUrl, merchant.currency, weaveRail]);

  function onPayoutCountry(id: string) {
    const c = demoCountry(id);
    const next = DEMO_AMOUNT_LIMITS[c.currency] ?? DEMO_AMOUNT_LIMITS.NGN;
    setPayoutCountryId(id);
    setMerchant(m => ({
      ...m,
      currency: c.currency,
      amount: Math.min(Math.max(m.amount, next.min), next.max) || next.defaultAmount,
    }));
    setBoAccount('');
    setBoHolder('');
  }

  const fmtAmount = useMemo(
    () => `${meta.symbol}${merchant.amount > 0 ? merchant.amount.toLocaleString() : ''}`,
    [meta.symbol, merchant.amount],
  );

  const africaOptions = DEMO_PAYOUT_COUNTRIES.filter(c => c.region === 'africa');
  const latamOptions = DEMO_PAYOUT_COUNTRIES.filter(c => c.region === 'latam');

  return (
    <div className="min-h-screen bg-[#F5F4EF] flex flex-col font-sans text-[#0B0F0E] overflow-x-hidden w-full relative">

      <WovenBackground />
      {/* Top Nav */}
      <header className="h-16 flex items-center px-6 md:px-14 sticky top-0 z-50 shrink-0">
        <div className="max-w-[1280px] w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Wordmark size={22} />
            </Link>
            <span className="text-[#6B7572] text-sm hidden lg:flex">›</span>
            <span className="text-sm font-medium hidden lg:flex">Demo</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm font-medium hover:underline hidden lg:flex">Home</Link>
            <a href="#" className="text-sm font-medium hover:underline flex items-center gap-1.5 hidden lg:flex">
              Docs <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M17 7H8M17 7V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <button className="h-9 px-4 bg-[#0B0F0E] text-white text-[13px] font-medium rounded-lg shadow-leaf active:scale-95 transition-all">
              Request Access
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="z-10 flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 md:px-14 py-6 md:py-10">
        <div className="flex flex-col gap-2 mb-4">
          <h1 className="text-4xl font-serif font-medium tracking-tight">
            Try it <span className="italic text-[#0F5D4C]">live.</span>
          </h1>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0F5D4C]/80 mt-1">
            Live demo · bank, crypto &amp; stablecoin wallet checkout
          </p>
          <p className="text-[#3A4240] leading-relaxed max-w-xl">
            This is a <strong className="text-[#0B0F0E]">real-life demo</strong>. You can run through the actual checkout experience.
            Payments are live with capped amounts per country for safety. Step 2: Africa settles via Weave; Bolivia (LatAm) previews Pollar bank fields — full BOB payout in Corridor today.
          </p>
          <p className="text-[#3A4240] leading-relaxed max-w-xl hidden lg:block">Changes here update the checkout preview in real time. Press <span className="font-bold text-[#0B0F0E]">Bank transfer</span> or <span className="font-bold text-[#0B0F0E]">Pay with crypto wallet</span> in the widget to walk through checkout.</p>
          <p className="text-[#3A4240] leading-relaxed max-w-xl lg:hidden">Configure your business below, then scroll to the checkout preview and run through payment.</p>
          {!demoApiKey && (
            <div className="mt-3 max-w-xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 leading-relaxed">
              <strong>Demo checkout needs an API key.</strong> Sign up on the merchant dashboard, copy your publishable key (<code className="text-xs">pk_test_…</code>), and set{' '}
              <code className="text-xs">NEXT_PUBLIC_API_KEY</code> in <code className="text-xs">apps/www/.env.local</code> (local) or your hosting env (production). Restart the site after saving.
            </div>
          )}
        </div>
        {/* Config Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto lg:pr-4 custom-scrollbar">
          <div className="order-2 lg:order-1 bg-white border border-[#E8EAE6] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[#6B7572] uppercase tracking-widest font-bold">Step 1</span>
              <h2 className="text-lg font-semibold tracking-tight">Your business</h2>
            </div>
            <div className="flex flex-col lg:gap-4 items-stretch w-full">
              <Field label="Business name" hint="Shown in widget header">
                <input
                  className="w-full h-11 px-3.5 bg-transparent border border-black/40 rounded-lg text-sm focus:border-[#0F5D4C] outline-none transition-colors"
                  value={merchant.name}
                  onChange={(e) => setMerchant({ ...merchant, name: e.target.value })}
                  placeholder="e.g. Acme Inc"
                />
              </Field>

              <Field label="Amount to charge" hint={`${meta.symbol}${limits.min.toLocaleString()} – ${meta.symbol}${limits.max.toLocaleString()}`}>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7572] text-sm">{meta.symbol}</span>
                  <input
                    type="text"
                    className={`w-full h-11 pl-10 pr-3.5 bg-transparent border rounded-lg text-sm outline-none transition-colors ${!amountOk && merchant.amount > 0 ? 'border-red-500 focus:border-red-600' : 'border-black/40 focus:border-[#0F5D4C]'}`}
                    value={merchant.amount}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9]/g, '');
                      let val = Number(cleaned) || 0;
                      if (val > limits.max) val = limits.max;
                      setMerchant({ ...merchant, amount: val });
                    }}
                  />
                </div>
                {merchant.amount > 0 && merchant.amount < limits.min && (
                  <span className="text-[10px] text-red-500 font-bold uppercase tracking-tight mt-1">
                    Minimum amount is {meta.symbol}{limits.min.toLocaleString()}
                  </span>
                )}
              </Field>
            </div>

            <div className="h-px bg-[#E8EAE6]" />

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[#6B7572] uppercase tracking-widest font-bold">Step 2</span>
              <h2 className="text-lg font-semibold tracking-tight">How would you like to receive {merchant.amount > 0 ? fmtAmount : 'payment'}?</h2>
            </div>

            <div className="grid grid-cols lg:grid-cols-2 gap-3">
              <button
                onClick={() => setPayoutMode('fiat')}
                className={`p-2.5 lg:p-4 border rounded-xl text-left flex flex-row-reverse justify-between items-center gap-2 transition-all ${payoutMode === 'fiat' ? 'border-black/20 bg-[#F5F4EF]' : 'border-black/10 bg-transparent hover:border-black/20'}`}
              >
                <div className="flex items-center justify-between">
                  {payoutMode === 'fiat' && <div className="w-4 h-4 rounded-full bg-[#0F5D4C]" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold">Bank payout</span>
                  <span className="text-[11px] text-[#6B7572]">Africa (Weave) · LatAm (Pollar)</span>
                </div>
              </button>
              <button
                onClick={() => setPayoutMode('crypto')}
                className={`p-4 border rounded-xl text-left flex flex-row-reverse justify-between items-center gap-2 transition-all ${payoutMode === 'crypto' ? 'border-black/20 bg-[#F5F4EF]' : 'border-black/10 bg-transparent hover:border-black/20'}`}
              >
                <div className="flex items-center justify-between">
                  {payoutMode === 'crypto' && <div className="w-4 h-4 rounded-full bg-[#0F5D4C]" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold">USDC to wallet</span>
                  <span className="text-[11px] text-[#6B7572]">Receive on-chain</span>
                </div>
              </button>
            </div>

            {payoutMode === 'fiat' ? (
              <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                <Field label="Payout country">
                  <select
                    className="w-full h-11 px-3.5 bg-transparent border border-black/40 rounded-lg text-sm focus:border-[#0F5D4C] outline-none transition-colors appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2Qjc1NzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNiA5bDYgNiw2LTYiLz48L3N2Zz4=')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat"
                    value={payoutCountryId}
                    onChange={(e) => onPayoutCountry(e.target.value)}
                  >
                    <optgroup label="Africa · Weave API">
                      {africaOptions.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.flag} {c.name} ({c.currency})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Latin America">
                      {latamOptions.map(c => (
                        <option key={c.id} value={c.id} disabled={c.rail === 'soon'}>
                          {c.flag} {c.name} ({c.currency}){c.rail === 'soon' ? ' · coming soon' : ' · Pollar'}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </Field>
                {soonRail && (
                  <p className="text-[13px] text-[#6B7572] leading-relaxed">
                    {payoutCountry.name} is on the roadmap. Africa corridors are live on the Weave API today; LatAm bank payout will use partner ramps like Pollar.
                  </p>
                )}
                {pollarRail && (
                  <p className="text-[13px] text-[#6B7572] leading-relaxed">
                    Bolivianos settle via <strong className="font-medium text-[#0B0F0E]">Pollar</strong> (USDC → BOB), not the Weave Paycrest rail. Fill the bank below, then open{' '}
                    <a href="https://corridor.paywithweave.com/app" className="text-[#0F5D4C] underline">Corridor</a> for a live payout.
                  </p>
                )}
                {weaveRail && (<>
                <Field label="Bank">
                  <select
                    className="w-full h-11 px-3.5 bg-transparent border border-black/40 rounded-lg text-sm focus:border-[#0F5D4C] outline-none transition-colors appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2Qjc1NzIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNiA5bDYgNiw2LTYiLz48L3N2Zz4=')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat"
                    value={fiatBank}
                    onChange={(e) => setFiatBank(e.target.value)}
                    disabled={loadingBanks}
                  >
                    {loadingBanks ? (
                      <option>Loading institutions...</option>
                    ) : (
                      banks.map(bank => <option key={bank.code} value={bank.code}>{bank.name}</option>)
                    )}
                  </select>
                </Field>
                <Field label="Account number">
                  <input
                    className="w-full h-11 px-3.5 bg-transparent border border-black/40 rounded-lg text-sm focus:border-[#0F5D4C] outline-none transition-colors"
                    value={fiatAccount}
                    onChange={(e) => setFiatAccount(e.target.value.replace(/\D/g, '').slice(0, acctMax))}
                    placeholder="1234567890"
                  />
                </Field>
                <Field label="Account name" hint={resolvingName ? 'Resolving name...' : (resolutionError || undefined)}>
                  <div className="relative border border-black/40 rounded-lg">
                    <input
                      className={`w-full h-11 px-3.5 rounded-xl text-sm outline-none transition-all ${resolvingName ? 'bg-gray-50 border-[#E8EAE6] text-gray-400' : (resolutionError ? 'bg-white border-red-200 focus:border-red-400' : 'bg-white border-[#E8EAE6] focus:border-[#0F5D4C]')}`}
                      value={fiatAccountName}
                      onChange={(e) => setFiatAccountName(e.target.value)}
                      placeholder="e.g. ACME Corp"
                      readOnly={fiatAccountName.length > 0 && !resolvingName && accountOk && !resolutionError}
                    />
                    {fiatAccountName.length > 0 && !resolvingName && accountOk && !resolutionError && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-[#0F5D4C] uppercase tracking-tight">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Verified
                      </div>
                    )}
                  </div>
                </Field>
                </>)}
                {pollarRail && (
                  <>
                    <Field label="Bank">
                      <select
                        className="w-full h-11 px-3.5 bg-transparent border border-black/40 rounded-lg text-sm focus:border-[#0F5D4C] outline-none"
                        value={boBank}
                        onChange={(e) => setBoBank(e.target.value)}
                      >
                        {BOB_BANKS.map(b => (
                          <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Account number">
                      <input
                        className="w-full h-11 px-3.5 border border-black/40 rounded-lg text-sm"
                        value={boAccount}
                        onChange={(e) => setBoAccount(e.target.value.replace(/\D/g, '').slice(0, 20))}
                        placeholder="1234567890"
                      />
                    </Field>
                    <Field label="Account holder">
                      <input
                        className="w-full h-11 px-3.5 border border-black/40 rounded-lg text-sm"
                        value={boHolder}
                        onChange={(e) => setBoHolder(e.target.value)}
                        placeholder="Full name on the account"
                      />
                    </Field>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                <Field label="Settlement Asset">
                  <div className="h-11 px-4 border border-black/10 bg-[#F5F4EF] rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#1C4FE0]" />
                      <span className="text-[13px] font-medium text-[#0B0F0E]">USDC (Base)</span>
                    </div>
                    <span className="text-[9px] uppercase tracking-tighter bg-[#0F5D4C] px-1.5 py-0.5 rounded text-white font-bold">Active</span>
                  </div>
                </Field>
                <Field label="Wallet address">
                  <input
                    className="w-full h-11 px-3.5 bg-transparent border border-black/40 rounded-lg text-xs font-mono focus:border-[#0F5D4C] outline-none transition-colors"
                    value={cryptoAddress}
                    onChange={(e) => setCryptoAddress(e.target.value)}
                    placeholder="0x..."
                  />
                </Field>
              </div>
            )}
          </div>
          {/* Live Preview Container — checkout first on mobile for a natural tap target */}
          <div className="order-1 lg:order-2 w-full">
            <div className="relative w-full bg-white border border-[#E8EAE6] lg:border-dashed rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:min-h-[520px] flex flex-col items-center justify-center lg:shadow-inner overflow-visible">
              {/* Faint dot pattern (desktop) */}
              <div
                className="hidden lg:block absolute inset-0 opacity-40 pointer-events-none rounded-3xl"
                style={{ backgroundImage: 'radial-gradient(#E8EAE6 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}
              />

              <div className="relative z-10 w-full flex items-center gap-2 mb-4 self-start">
                <div className="w-2 h-2 rounded-full bg-[#0F5D4C] animate-pulse" />
                <span className="text-[11px] font-bold text-[#6B7572] uppercase tracking-widest">Live checkout preview</span>
              </div>

              <div className="relative z-10 w-full flex justify-center">
                <div className={`relative w-full max-w-[400px] transition-opacity duration-300 ${!checkoutEnabled && payoutMode === 'fiat' ? 'opacity-40 grayscale pointer-events-none' : (!amountOk && payoutMode === 'fiat' && weaveRail) ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
                {(soonRail || (pollarRail && payoutMode === 'fiat')) ? (
                  <div className="w-full border border-[#E8EAE6] rounded-2xl p-6 bg-[#FAFAF7] flex flex-col gap-3 text-center">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-[#6B7572]">Weave checkout preview</div>
                    {soonRail ? (
                      <p className="text-sm text-[#3A4240]">Live widget checkout for {payoutCountry.name} is not enabled yet.</p>
                    ) : (
                      <>
                        <p className="text-sm text-[#3A4240]">
                          Payer still checks out with crypto via Weave. <strong>BOB</strong> lands in the bank through Pollar after USDC settles — same flow as{' '}
                          <a href="https://corridor.paywithweave.com/app" className="text-[#0F5D4C] underline">Corridor</a>.
                        </p>
                        {pollarBankOk && amountOk && (
                          <p className="text-xs font-mono text-[#6B7572]">
                            {meta.symbol}{merchant.amount} → {BOB_BANKS.find(b => b.value === boBank)?.label} · {boAccount}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                <WeaveCheckout
                  key={payoutMode === 'fiat'
                    ? (fiatDetailsOk
                      ? `fiat-${merchant.currency}-${fiatBank}-${fiatAccount}-${merchant.amount}`
                      : 'fiat-incomplete')
                    : (cryptoAddress.length >= 42
                      ? `crypto-${cryptoAddress}-${merchant.amount}`
                      : 'crypto-incomplete')
                  }
                  merchant={{
                    ...merchant,
                    amount: merchant.amount,
                    destAssetKey: payoutMode === 'fiat'
                      ? `fiat:${merchant.currency}`
                      : `crypto:BASE:USDC`,
                    destInstrument: payoutMode === 'fiat' ? {
                      kind: 'bank_account',
                      assetKey: `fiat:${merchant.currency}`,
                      bankAccountName: fiatAccountName,
                      bankAccountIdentifier: fiatAccount,
                      bankInstitution: fiatBank,
                    } : {
                      kind: 'crypto_wallet',
                      assetKey: 'crypto:BASE:USDC',
                      walletAddress: cryptoAddress,
                    }
                  }}
                  disabledMethods={payoutMode === 'fiat' ? {
                    fiat: 'Local-currency pay is disabled in this demo. Pay with crypto or Stellar to test settlement to your bank.',
                  } : undefined}
                  theme="organic"
                  onSuccess={(txn) => console.log('Payment Success:', txn)}
                  apiKey={demoApiKey || undefined}
                  apiBase={apiUrl}
                  stellarPublicConfig={stellarPublicConfig ?? undefined}
                />
                )}
                {!amountOk && merchant.amount > 0 && weaveRail && payoutMode === 'fiat' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur-sm border border-red-100 px-6 py-4 rounded-2xl shadow-xl flex flex-col items-center gap-2 text-center">
                      <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M12 9v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" /></svg>
                      </div>
                      <div className="text-sm font-bold text-ink uppercase tracking-wider">Invalid Amount</div>
                      <div className="text-[12px] text-ink-muted leading-tight">
                        Enter between {meta.symbol}{limits.min.toLocaleString()} and {meta.symbol}{limits.max.toLocaleString()} for {meta.country}.
                      </div>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
          .shadow-leaf {
            box-shadow: 0 4px 12px rgba(11, 15, 14, 0.1);
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #E8EAE6;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #6B7572;
          }
        `
      }} />
    </div>
  );
}
