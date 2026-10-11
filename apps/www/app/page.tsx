'use client';

import { useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import CyclingWidget from '../components/CyclingWidget';
import { RequestAccessModal } from '../components/RequestAccessModal';

function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3 5 L8 19 L12 9 L16 19 L21 5" stroke="#0F5D4C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 9 L12 19 L19 9" stroke="#0B0F0E" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
      </svg>
      <span style={{ fontWeight: 600, fontSize: size * 0.7, letterSpacing: -0.3, color: '#0B0F0E' }}>Weave</span>
    </div>
  )
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

export default function Home() {
  const [isRequestAccessOpen, setIsRequestAccessOpen] = useState(false);

  return (
    <div className='w-full h-full 3xl:h-screen' style={{
      background: '#F5F4EF',
      position: 'relative', fontFamily: 'Inter, -apple-system, sans-serif',
      color: '#0B0F0E', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="lazyOnload" />
      <RequestAccessModal isOpen={isRequestAccessOpen} onClose={() => setIsRequestAccessOpen(false)} />
      <WovenBackground />

      {/* Nav */}
      <nav className="px-6 md:px-14 py-4 md:py-6 max-w-[1280px] w-full mx-auto flex items-center justify-between relative z-10 shrink-0">
        <Wordmark size={26} />
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="/demo" style={{
            color: '#0B0F0E', fontSize: 14, fontWeight: 500,
          }} className="hidden sm:inline no-underline hover:underline hover:text-forest transition-colors cursor-pointer">
            Try Demo
          </Link>
          <a href="https://app.paywithweave.com/docs" rel="noreferrer" target="_blank" style={{
            color: '#0B0F0E', fontSize: 14, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 6,
          }} className="no-underline hover:underline hover:text-forest transition-colors cursor-pointer">
            View Docs
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M7 17L17 7M17 7H8M17 7V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }} className="px-4 py-6 md:py-10 shrink-0">
        <h1 style={{
          fontSize: 'clamp(36px, 9vw, 60px)', fontWeight: 500, letterSpacing: -1.2, lineHeight: 1.06,
          textAlign: 'center', margin: 0, maxWidth: 860, color: '#0B0F0E',
          fontFamily: 'Georgia, "Times New Roman", serif',
        }} className="px-4">
          One checkout that{' '}
          <em style={{ fontStyle: 'italic', color: '#0F5D4C' }}>weaves</em>
          <br className="hidden sm:block" />
          fiat and crypto into a single thread.
        </h1>
        <p style={{
          fontSize: 'clamp(14px, 4.5vw, 16px)', color: '#3A4240', textAlign: 'center', maxWidth: 560,
          lineHeight: 1.5, marginTop: 18, marginBottom: 0,
        }} className="px-4">
          Customers pay with their bank or any wallet. You settle in stable
          dollars or local currency — without seeing the seam.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }} className="flex-col sm:flex-row w-full sm:w-auto px-6 sm:px-0">
          <button 
            onClick={() => setIsRequestAccessOpen(true)}
            style={{
            height: 44, padding: '0 22px', borderRadius: 10, color: '#fff',
            border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }} className="w-full sm:w-auto bg-ink hover:bg-forest transition-all active:scale-95 shadow-leaf">
            Request Access
          </button>
          <Link href="/demo" style={{
            height: 44, padding: '0 22px', borderRadius: 10,
            color: '#0B0F0E',
            border: '1px solid #E8EAE6', fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} className="w-full sm:w-auto bg-white hover:bg-cream-soft no-underline active:scale-95 transition-all shadow-sm">
            Try Demo
          </Link>
        </div>
      </section>

      {/* Widget showcase */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', justifyContent: 'center',
        flex: 1, overflow: 'hidden',
      }} className="px-4 lg:px-0 origin-center">
        <h2 className="sr-only">Live checkout preview</h2>
        <CyclingWidget />
      </div>

      {/* Footer */}
      <footer className="px-6 py-4 md:py-6 max-w-7xl w-full mx-auto shrink-0">
        <div className="rule-dotted mb-4 opacity-50" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 lg:gap-6">
          <div className="flex self-start items-center gap-3">
            <Wordmark size={20} />
            <div className="w-1 h-1 rounded-full bg-hair-strong hidden lg:flex" />
            <p className="text-[13px] text-ink-muted">
              A product by <span className="text-ink font-medium">Dewdrop Labs</span>
            </p>
          </div>
          <p className="text-[12px] text-ink-faint tracking-wide uppercase">
            © 2026 Weave. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
