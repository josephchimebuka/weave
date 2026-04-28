'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { WeaveCheckout } from '@weave/widget';

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

export default function DemoPage() {
  const [merchant, setMerchant] = useState({
    name: 'Afriloom Textiles',
    amount: 800,
    currency: 'NGN',
  });

  const [payoutMode, setPayoutMode] = useState<'fiat' | 'crypto'>('fiat');

  const [banks, setBanks] = useState<{ code: string; name: string }[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [fiatBank, setFiatBank] = useState('SELECT AN INSTITUTION');
  const [fiatAccount, setFiatAccount] = useState('');
  const [fiatAccountName, setFiatAccountName] = useState('');
  const [resolvingName, setResolvingName] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);

  // Crypto fields
  const [cryptoAddress, setCryptoAddress] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  useEffect(() => {
    fetch(`${apiUrl}/institutions?currency=NGN`)
      .then(r => r.json())
      .then(resp => {
        if (resp.success && Array.isArray(resp.data)) {
          setBanks(resp.data);
          if (!resp.data.some((b: any) => b.code === fiatBank) && resp.data.length > 0) {
            setFiatBank(resp.data[0].code);
          }
        }
      })
      .catch(err => console.error('Failed to fetch banks:', err))
      .finally(() => setLoadingBanks(false));
  }, []);

  // Resolve account name
  useEffect(() => {
    if (fiatAccount.length === 10 && fiatBank && fiatBank !== 'SELECT AN INSTITUTION') {
      setResolvingName(true);
      setResolutionError(null);

      fetch(`${apiUrl}/institutions/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution: fiatBank,
          accountIdentifier: fiatAccount,
          currency: 'NGN'
        })
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
    }
  }, [fiatAccount, fiatBank]);

  return (
    <div className="min-h-screen bg-[#F5F4EF] flex flex-col font-sans text-[#0B0F0E] overflow-hidden w-full relative">

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
      <main className="z-50 max-w-[1280px] w-full mx-auto px-6 md:px-14 py-10 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start overflow-hidden">
        {/* Config Panel */}
        <div className="flex flex-col gap-8 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto lg:pr-4 custom-scrollbar">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-serif font-medium tracking-tight">
              Try it <span className="italic text-[#0F5D4C]">live.</span>
            </h1>
            <p className="text-[#3A4240] leading-relaxed max-w-lg">
              This is a <strong className="text-[#0B0F0E]">real-life demo</strong>. You can run through the actual checkout experience.
              Payments are live but capped at <span className="font-semibold text-[#0B0F0E]">₦1,000</span> for safety.
            </p>
          </div>

          <div className="bg-white border border-[#E8EAE6] rounded-2xl p-6 shadow-sm flex flex-col gap-4">

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[#6B7572] uppercase tracking-widest font-bold">Step 1</span>
              <h3 className="text-lg font-semibold tracking-tight">Your business</h3>
            </div>
            <div className='flex flex-col lg: gap-4 items-center w-full'>
              <Field label="Business name" hint="Shown in widget header">
                <input
                  className="w-full h-11 px-3.5 bg-transparent border border-black/40 rounded-lg text-sm focus:border-[#0F5D4C] outline-none transition-colors"
                  value={merchant.name}
                  onChange={(e) => setMerchant({ ...merchant, name: e.target.value })}
                  placeholder="e.g. Acme Inc"
                />
              </Field>


              <Field label="Amount to charge" hint="Capped at ₦1,000">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7572] text-sm">₦</span>
                  <input
                    type="text"
                    className="w-full h-11 pl-8 pr-3.5 bg-transparent border border-black/40 rounded-lg text-sm focus:border-[#0F5D4C] outline-none transition-colors"
                    value={merchant.amount}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9]/g, '');
                      const val = Math.min(Number(cleaned) || 0, 1000);
                      setMerchant({ ...merchant, amount: val });
                    }}
                  />
                </div>
              </Field>
            </div>

            <div className="h-px bg-[#E8EAE6]" />

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[#6B7572] uppercase tracking-widest font-bold">Step 2</span>
              <h3 className="text-lg font-semibold tracking-tight">How would you like to receive {merchant.amount > 0 ? `₦${merchant.amount.toLocaleString()}` : 'payment'}?</h3>
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
                  <span className="text-[13px] font-bold">Naira to bank</span>
                  <span className="text-[11px] text-[#6B7572]">Receive ₦ instantly</span>
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
                    onChange={(e) => setFiatAccount(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder=""
                  />
                </Field>
                <Field label="Account name" hint={resolvingName ? 'Resolving name...' : (resolutionError || undefined)}>
                  <div className="relative border border-black/40 rounded-lg">
                    <input
                      className={`w-full h-11 px-3.5 rounded-xl text-sm outline-none transition-all ${resolvingName ? 'bg-gray-50 border-[#E8EAE6] text-gray-400' : (resolutionError ? 'bg-white border-red-200 focus:border-red-400' : 'bg-white border-[#E8EAE6] focus:border-[#0F5D4C]')}`}
                      value={fiatAccountName}
                      onChange={(e) => setFiatAccountName(e.target.value)}
                      placeholder="e.g. ACME Corp"
                      readOnly={fiatAccountName.length > 0 && !resolvingName && fiatAccount.length === 10 && !resolutionError}
                    />
                    {fiatAccountName.length > 0 && !resolvingName && fiatAccount.length === 10 && !resolutionError && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-bold text-[#0F5D4C] uppercase tracking-tight">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Verified
                      </div>
                    )}
                  </div>
                </Field>
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

          <div className="bg-[#F5F4EF] border border-black/5 rounded-2xl p-4 text-[11px] leading-relaxed text-[#5A5A55] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            Changes here update the widget on the right in real time. Press the <span className="font-bold text-[#0B0F0E]">Bank transfer</span> or <span className="font-bold text-[#0B0F0E]">Pay with crypto wallet</span> button in the widget to walk through the customer&apos;s checkout.
          </div>
        </div>

        {/* Live Preview Container */}
        <div className="relative aspect-4/5 h-auto lg:h-[calc(100vh-160px)] lg:bg-white lg:border lg:border-dashed lg:border-[#E8EAE6] rounded-3xl overflow-hidden flex items-center justify-center lg:shadow-inner ">
          {/* Faint dot pattern */}
          <div
            className="hidden lg:absolute inset-0 opacity-40 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#E8EAE6 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}
          />

          {/* Live Preview Label */}
          <div className="hidden lg:absolute top-2 left-2.5 lg:top-6 lg:left-6 flex items-center gap-2 z-10">
            <div className="w-2 h-2 rounded-full bg-[#0F5D4C] animate-pulse" />
            <span className="text-[11px] font-bold text-[#6B7572] uppercase tracking-widest">Live Preview</span>
          </div>

          <div className="relative w-full h-full flex items-center justify-center">
            {/* The Real Widget */}
            <div className="relative z-10 scale-[60%] min-[375px]:scale-[75%] min-[420px]:scale-[85%] lg:scale-100 ">
              <WeaveCheckout
                key={payoutMode === 'fiat'
                  ? (fiatBank !== 'SELECT AN INSTITUTION' && fiatAccount.length === 10 && fiatAccountName.length > 0
                    ? `fiat-${fiatBank}-${fiatAccount}`
                    : 'fiat-incomplete')
                  : (cryptoAddress.length >= 42
                    ? `crypto-${cryptoAddress}`
                    : 'crypto-incomplete')
                }
                merchant={{
                  ...merchant,
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
                theme="organic"
                onSuccess={(txn) => console.log('Payment Success:', txn)}
                apiKey={process.env.NEXT_PUBLIC_API_KEY || ''}
              />
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
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
      `}</style>
    </div>
  );
}
