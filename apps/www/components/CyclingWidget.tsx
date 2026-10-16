'use client'

import { useState, useEffect } from 'react'

const W = {
  ink: '#0B0F0E',
  mute: '#6B7572',
  hair: '#E8EAE6',
  surface: '#FFFFFF',
  panel: '#FAFAF7',
  accent: '#0F5D4C',
  accentSoft: '#E6F0EC',
}

function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3 5 L8 19 L12 9 L16 19 L21 5" stroke={W.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 9 L12 19 L19 9" stroke={W.ink} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
      </svg>
      <span style={{ fontWeight: 600, fontSize: size * 0.7, letterSpacing: -0.3, color: W.ink }}>Weave</span>
    </div>
  )
}

function Chrome({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: '100%', maxWidth: 380, background: W.surface, borderRadius: 16,
      boxShadow: '0 30px 80px rgba(11,15,14,0.18), 0 0 0 1px rgba(0,0,0,0.04)',
      overflow: 'hidden', fontFamily: 'Inter, sans-serif', color: W.ink,
      margin: '0 auto',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', padding: '12px 14px',
        gap: 10, borderBottom: `1px solid ${W.hair}`,
      }}>
        <Wordmark size={20} />
        <div style={{ flex: 1, textAlign: 'center', fontSize: 12, color: W.mute }}>
          Paying <span style={{ color: W.ink, fontWeight: 500 }}>Afriloom Textiles</span>
        </div>
        <div style={{
          width: 24, height: 24, borderRadius: 12, background: W.panel,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: W.mute, fontSize: 14,
        }}>×</div>
      </div>
      {children}
      <div style={{
        padding: '10px 14px', borderTop: `1px solid ${W.hair}`, background: W.panel,
        fontSize: 10.5, color: W.mute, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>Weave checkout</span>
        <span>Secured payments</span>
      </div>
    </div>
  )
}

function StatePicker() {
  return (
    <Chrome>
      <div style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: '#2B1810', color: '#F5DEB3',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 18, fontFamily: 'Georgia, serif',
          }}>A</div>
          <div style={{ fontSize: 11.5, color: W.mute }}>Pay Afriloom Textiles</div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.6 }}>₦150,000</div>
          <div style={{ fontSize: 11, color: W.mute }}>Order #AFR-0481 · 2 items</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ fontSize: 10.5, color: W.mute, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            How would you like to pay?
          </div>
          {[
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M3 21H21M5 21V10M9 21V10M15 21V10M19 21V10M2 10L12 3L22 10H2Z" stroke={W.ink} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
              label: 'Pay by bank',
              sub: 'Transfer, card & USSD — familiar checkout',
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="6" width="18" height="13" rx="2" stroke={W.ink} strokeWidth="1.7"/>
                  <path d="M3 10H21" stroke={W.ink} strokeWidth="1.7"/>
                </svg>
              ),
              label: 'Pay from wallet',
              sub: 'Stablecoins & global wallets — same checkout',
            },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '11px 13px', borderRadius: 12,
              border: `1px solid ${W.hair}`, background: '#fff',
              display: 'flex', alignItems: 'center', gap: 12,
              cursor: 'pointer',
            }} className="hover:border-forest/20 hover:bg-cream-soft/30 active:scale-[0.98] transition-all group">
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: '#fff',
                border: `1px solid ${W.hair}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }} className="group-hover:border-forest/20 transition-colors">{item.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: W.mute }}>{item.sub}</div>
              </div>
              <div style={{ color: W.mute }} className="group-hover:text-forest transition-colors">›</div>
            </div>
          ))}
        </div>
      </div>
    </Chrome>
  )
}

function StateBalances() {
  const balances = [
    { token: 'USDC', chain: 'Optimism', amount: '312.40', usd: '312.40', tint: '#FF0420', icon: '$', sel: true },
    { token: 'ETH',  chain: 'Base',     amount: '0.0421', usd: '142.18', tint: '#1C4FE0', icon: 'Ξ' },
    { token: 'USDT', chain: 'Polygon',  amount: '85.00',  usd: '85.00',  tint: '#8247E5', icon: '$' },
  ]
  return (
    <Chrome>
      <div style={{ padding: '16px 20px 6px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.3 }}>Confirm your payment</div>
          <div style={{ fontSize: 11.5, color: W.mute, marginTop: 4 }}>
            Weave routes the payment and settles to the merchant — you just approve and pay.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {balances.map((b, i) => (
            <div key={i} style={{
              padding: '11px 13px', borderRadius: 12,
              background: b.sel ? W.accentSoft : '#fff',
              border: `1.5px solid ${b.sel ? W.accent : W.hair}`,
              display: 'flex', alignItems: 'center', gap: 12,
              cursor: 'pointer',
            }} className="hover:border-forest/30 transition-all active:scale-[0.98]">
              <div style={{
                width: 32, height: 32, borderRadius: 16, background: b.tint, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13,
              }}>{b.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{b.amount} {b.token}</div>
                <div style={{ fontSize: 11, color: W.mute }}>on {b.chain} · ≈ ${b.usd}</div>
              </div>
              {b.sel && (
                <div style={{
                  width: 18, height: 18, borderRadius: 9, background: W.accent, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                }}>✓</div>
              )}
            </div>
          ))}
        </div>
        <button style={{
          height: 42, borderRadius: 10, border: 'none', background: W.ink, color: '#fff',
          fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', marginTop: 4,
        }} className="hover:bg-forest-deep active:scale-95 transition-all">
          Continue →
        </button>
      </div>
    </Chrome>
  )
}

function KVRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
      <span style={{ color: W.mute }}>{label}</span>
      {children}
    </div>
  )
}

function StateSuccess() {
  return (
    <Chrome>
      <div style={{ padding: '24px 20px 12px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 320 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 6 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 28, background: W.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28,
          }}>✓</div>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>Payment complete</div>
          <div style={{ fontSize: 12, color: W.mute, textAlign: 'center', maxWidth: 260, lineHeight: 1.5 }}>
            ₦150,000 is on its way to <span style={{ color: W.ink }}>Afriloom Textiles</span>.
          </div>
        </div>
        <div style={{ background: W.panel, border: `1px solid ${W.hair}`, borderRadius: 12, overflow: 'hidden' }}>
          <KVRow label="Payment"><span style={{ fontWeight: 500 }}>Wallet · 93.65 USDC</span></KVRow>
          <div style={{ height: 1, background: W.hair }}/>
          <KVRow label="Settled to"><span style={{ fontWeight: 500 }}>GTBank ••7890</span></KVRow>
          <div style={{ height: 1, background: W.hair }}/>
          <KVRow label="Completed in">
            <span style={{
              background: W.accentSoft, color: W.accent,
              padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500,
            }}>32s</span>
          </KVRow>
        </div>
      </div>
    </Chrome>
  )
}

export default function CyclingWidget() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % 3), 3800)
    return () => clearInterval(t)
  }, [])

  const states = [<StatePicker key="picker" />, <StateBalances key="balances" />, <StateSuccess key="success" />]

  return (
    <div className="relative w-full max-w-[380px] min-h-[480px] scale-[0.9] xs:scale-100 origin-top mx-auto">
      {states.map((s, i) => (
        <div key={i} style={{
          position: i === idx ? 'relative' : 'absolute',
          inset: i === idx ? 'auto' : 0,
          opacity: i === idx ? 1 : 0,
          transform: i === idx ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
          pointerEvents: i === idx ? 'auto' : 'none',
        }}>{s}</div>
      ))}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: i === idx ? 18 : 6, height: 6, borderRadius: 3,
            background: i === idx ? W.accent : '#D6D9D2',
            transition: 'all 0.4s',
          }} />
        ))}
      </div>
    </div>
  )
}
