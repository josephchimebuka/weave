'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Load the real published widget on the client only — it pulls in wagmi/viem.
const WeaveCheckout = dynamic(
  () => import('@weave-sdk/widget').then((m) => m.WeaveCheckout),
  { ssr: false, loading: () => <div style={{ height: 420 }} /> },
);

// Palette routed through Fumadocs theme tokens so the playground adapts to the
// docs' light/dark mode. `codeBg`/`tanSoft` stay fixed — the generated-code panel
// is a terminal-style surface (dark in both themes); `onPrimary` is button text
// sitting on the forest accent.
const C = {
  ink: 'var(--color-fd-foreground)',
  inkMuted: 'var(--color-fd-muted-foreground)',
  inkFaint: 'var(--color-fd-muted-foreground)',
  cream: 'var(--color-fd-card)',
  creamDeep: 'var(--color-fd-muted)',
  forest: 'var(--color-fd-primary)',
  forestDeep: 'var(--color-fd-primary)',
  forestLight: '#4FB090',
  tanSoft: '#E8D9BE',
  hair: 'var(--color-fd-border)',
  hairSoft: 'var(--color-fd-border)',
  onPrimary: 'var(--color-fd-primary-foreground)',
  codeBg: '#0d1117',
};

const ACCENTS = ['#3D6B50', '#B8935A', '#1C1B17', '#7B6B4E'];

export function WidgetPlayground() {
  const [theme, setTheme] = useState<'organic' | 'minimal'>('organic');
  const [accent, setAccent] = useState('#3D6B50');
  const [radius, setRadius] = useState(16);
  const [amount, setAmount] = useState(5000);
  const [currency, setCurrency] = useState('NGN');
  const [amountIn, setAmountIn] = useState<'source' | 'dest'>('dest');
  const [key, setKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const snippet = `<WeaveCheckout
  apiKey="pk_test_..."
  theme="${theme}"
  accentColor="${accent}"
  borderRadius={${radius}}
  merchant={{
    name: "My Store",
    amount: ${amount},
    currency: "${currency}",
    amountIn: "${amountIn}"
  }}
/>`;

  function copy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const label: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: C.inkMuted,
  };
  const card: React.CSSProperties = {
    background: C.cream,
    border: `1px solid ${C.hairSoft}`,
    borderRadius: 20,
    padding: 20,
  };

  return (
    <div className="not-prose" style={{ color: C.ink }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <span style={label}>Theme</span>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {(['organic', 'minimal'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    style={{
                      flex: 1,
                      padding: '9px 0',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: `1px solid ${theme === t ? C.forest : C.hairSoft}`,
                      background: theme === t ? C.forest : C.cream,
                      color: theme === t ? C.onPrimary : C.inkMuted,
                    }}
                  >
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 8 }}>
                <span style={label}>Corner Radius</span>
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: C.inkMuted }}>{radius}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={32}
                step={4}
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: C.forest }}
              />
            </div>

            <div>
              <span style={label}>Accent Color</span>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {ACCENTS.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => setAccent(hex)}
                    aria-label={hex}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: hex,
                      cursor: 'pointer',
                      border: '1px solid var(--color-fd-border)',
                      outline: accent === hex ? `2px solid ${C.forest}` : 'none',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ paddingTop: 16, borderTop: `1px solid ${C.hairSoft}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span style={label}>Payment</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={{ ...label, fontSize: 10, display: 'block', marginBottom: 6 }}>Amount</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', boxSizing: 'border-box', background: C.cream, border: `1px solid ${C.hairSoft}`, borderRadius: 10, padding: '9px 10px', fontSize: 14 }}
                  />
                </div>
                <div>
                  <span style={{ ...label, fontSize: 10, display: 'block', marginBottom: 6 }}>Currency</span>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', background: C.cream, border: `1px solid ${C.hairSoft}`, borderRadius: 10, padding: '9px 10px', fontSize: 14 }}
                  >
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div>
                <span style={{ ...label, fontSize: 10, display: 'block', marginBottom: 6 }}>Amount Logic</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([['dest', 'Merchant gets exact'], ['source', 'Customer pays exact']] as const).map(([v, t]) => (
                    <button
                      key={v}
                      onClick={() => setAmountIn(v)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        border: `1px solid ${amountIn === v ? C.forest : C.hairSoft}`,
                        background: amountIn === v ? 'rgba(15,93,76,0.08)' : C.cream,
                        color: amountIn === v ? C.forestDeep : C.inkMuted,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setKey((k) => k + 1)}
              style={{ width: '100%', padding: '11px 0', background: C.forest, color: C.onPrimary, border: 'none', borderRadius: 14, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            >
              ▶ Update Preview
            </button>
          </div>

          {/* Generated code */}
          <div style={{ background: C.codeBg, borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Generated Code</span>
              <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: copied ? C.forestLight : 'rgba(255,255,255,0.4)' }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre style={{ margin: 0, padding: 16, fontSize: 12, fontFamily: 'monospace', color: C.tanSoft, overflowX: 'auto', lineHeight: 1.6 }}>
              <code>{snippet}</code>
            </pre>
          </div>
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'sticky', top: 24 }}>
          <div style={{ width: '100%', maxWidth: 380, padding: 24, borderRadius: 28, background: C.creamDeep, border: `1px solid ${C.hairSoft}` }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.inkFaint, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 16, textAlign: 'center' }}>Live Preview</p>
            <div style={{ pointerEvents: 'none' }}>
              <WeaveCheckout
                key={key}
                apiKey="pk_test_docs_playground"
                theme={theme}
                accentColor={accent}
                borderRadius={radius}
                merchant={{ name: 'Playground Store', amount, currency: currency as any, amountIn }}
                onSuccess={() => {}}
                onError={() => {}}
                onClose={() => {}}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
