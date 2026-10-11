'use client';

import { useState } from 'react';

// Palette routed through Fumadocs theme tokens so the playground adapts to the
// docs' light/dark mode. `codeBg`/`tanSoft` stay fixed — the response panel is a
// terminal-style surface (dark in both themes); `onPrimary` is button text on the
// forest accent.
const C = {
  ink: 'var(--color-fd-foreground)',
  inkMuted: 'var(--color-fd-muted-foreground)',
  inkFaint: 'var(--color-fd-muted-foreground)',
  cream: 'var(--color-fd-card)',
  creamDeep: 'var(--color-fd-muted)',
  forest: 'var(--color-fd-primary)',
  forestDeep: 'var(--color-fd-primary)',
  forestLight: '#4FB090',
  tanDeep: 'var(--color-fd-muted-foreground)',
  tanSoft: '#E8D9BE',
  hair: 'var(--color-fd-border)',
  hairSoft: 'var(--color-fd-border)',
  onPrimary: 'var(--color-fd-primary-foreground)',
  codeBg: '#0d1117',
};

type PlaygroundParam = { key: string; label: string; placeholder: string; required: boolean; inBody?: boolean };
type PlaygroundEndpoint = { method: 'GET' | 'POST'; path: string; desc: string; params: PlaygroundParam[] };

const PLAYGROUND_ENDPOINTS: PlaygroundEndpoint[] = [
  {
    method: 'GET', path: '/quotes',
    desc: 'Get a live exchange rate and fee breakdown for any asset pair.',
    params: [
      { key: 'from', label: 'From', placeholder: 'crypto:BASE:USDC', required: true },
      { key: 'to', label: 'To', placeholder: 'fiat:NGN', required: true },
      { key: 'amount', label: 'Amount', placeholder: '50', required: true },
      { key: 'amountIn', label: 'Amount In', placeholder: 'source', required: false },
    ],
  },
  {
    method: 'POST', path: '/orders',
    desc: 'Create a payment order. Returns nextAction for the widget.',
    params: [
      { key: 'source.inline.kind', label: 'Source Kind', placeholder: 'crypto_wallet', required: true, inBody: true },
      { key: 'source.inline.assetKey', label: 'Source Asset', placeholder: 'crypto:BASE:USDC', required: true, inBody: true },
      { key: 'source.inline.walletAddress', label: 'Wallet Address', placeholder: '0xYourWallet', required: false, inBody: true },
      { key: 'amount', label: 'Amount', placeholder: '50', required: true, inBody: true },
      { key: 'flow', label: 'Flow', placeholder: 'external', required: false, inBody: true },
    ],
  },
  {
    method: 'GET', path: '/orders/:id',
    desc: 'Fetch a single order status. Triggers a live sync from the active provider.',
    params: [{ key: ':id', label: 'Order ID', placeholder: 'ord_abc123', required: true }],
  },
  { method: 'GET', path: '/orders', desc: 'List your last 50 orders, newest first.', params: [] },
  {
    method: 'GET', path: '/institutions',
    desc: 'List supported bank institutions for a currency.',
    params: [{ key: 'currency', label: 'Currency', placeholder: 'NGN', required: true }],
  },
  { method: 'GET', path: '/assets', desc: 'List every supported fiat and crypto asset.', params: [] },
  {
    method: 'POST', path: '/checkout/sessions',
    desc: 'Create a hosted checkout session. Returns a checkoutUrl to redirect your user to.',
    params: [
      { key: 'amount', label: 'Amount', placeholder: '5000', required: true, inBody: true },
      { key: 'destAsset', label: 'Dest Asset', placeholder: 'fiat:NGN', required: true, inBody: true },
      { key: 'redirectUrl', label: 'Redirect URL', placeholder: 'https://yourstore.com/success', required: true, inBody: true },
      { key: 'reference', label: 'Reference', placeholder: 'order_123', required: false, inBody: true },
    ],
  },
  {
    method: 'GET', path: '/checkout/sessions/:id',
    desc: 'Retrieve a checkout session and its linked order status.',
    params: [{ key: ':id', label: 'Session ID', placeholder: 'clx9abc...', required: true }],
  },
];

function MethodBadge({ method }: { method: 'GET' | 'POST' }) {
  const bg = method === 'GET' ? 'rgba(15,93,76,0.1)' : 'rgba(123,107,78,0.15)';
  const fg = method === 'GET' ? '#0F5D4C' : '#7B6B4E';
  return (
    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', padding: '2px 7px', borderRadius: 6, background: bg, color: fg }}>
      {method}
    </span>
  );
}

export function ApiPlayground() {
  const [apiKey, setApiKey] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: number; ok: boolean; data: unknown } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endpoint = PLAYGROUND_ENDPOINTS[selectedIdx];

  function useDemoKey() {
    setApiKey('pk_test_05f4f34a21c51be888b44ffa8441a72601fd393a7f052760');
    setError(null);
  }
  function setValue(key: string, val: string) {
    setValues((v) => ({ ...v, [key]: val }));
    setResult(null);
    setError(null);
  }
  function selectEndpoint(idx: number) {
    setSelectedIdx(idx);
    setValues({});
    setResult(null);
    setError(null);
  }

  async function send() {
    if (!apiKey.trim()) {
      setError('Enter a key to send requests — pk_test_…/pk_live_… (publishable) or sk_test_…/sk_live_… (secret, for server-to-server endpoints).');
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      let resolvedPath = endpoint.path;
      for (const p of endpoint.params) {
        if (p.key.startsWith(':')) resolvedPath = resolvedPath.replace(p.key, values[p.key] ?? '');
      }
      const query: Record<string, string> = {};
      const bodyObj: Record<string, unknown> = {};
      for (const p of endpoint.params) {
        if (p.key.startsWith(':')) continue;
        const val = values[p.key] ?? '';
        if (!val) continue;
        if (p.inBody) {
          const parts = p.key.split('.');
          let node: Record<string, unknown> = bodyObj;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!node[parts[i]]) node[parts[i]] = {};
            node = node[parts[i]] as Record<string, unknown>;
          }
          node[parts[parts.length - 1]] = val;
        } else {
          query[p.key] = val;
        }
      }
      const res = await fetch('/api/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: endpoint.method,
          path: resolvedPath,
          query: Object.keys(query).length ? query : undefined,
          body: endpoint.method === 'POST' && Object.keys(bodyObj).length ? bodyObj : undefined,
          apiKey: apiKey.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Proxy error'); return; }
      setResult(json);
    } catch (e: any) {
      setError(e.message ?? 'Network error');
    } finally {
      setLoading(false);
    }
  }

  const isTest = apiKey.includes('_test_');

  return (
    <div className="not-prose" style={{ color: C.ink }}>
      {/* API key bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.cream, border: `1px solid ${C.hairSoft}`, borderRadius: 14, padding: '10px 14px' }}>
          <input
            type="password"
            placeholder="pk_test_… / sk_test_… / pk_live_… / sk_live_…"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setError(null); }}
            autoComplete="off"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13.5, fontFamily: 'monospace', color: C.ink }}
          />
          {apiKey && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em', background: isTest ? '#FEF3C7' : 'rgba(15,93,76,0.1)', color: isTest ? '#B45309' : C.forestDeep }}>
              {isTest ? 'Sandbox' : 'Live'}
            </span>
          )}
        </div>
        {!apiKey && (
          <p style={{ padding: '0 4px', marginTop: 8, fontSize: 12, color: C.inkMuted }}>
            Don&apos;t have a key yet?{' '}
            <button onClick={useDemoKey} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.forestDeep, fontWeight: 600 }}>
              Try with a demo key
            </button>{' '}to explore the API responses immediately.
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 4fr) minmax(0, 8fr)', gap: 20, alignItems: 'start' }}>
        {/* Endpoint list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          {PLAYGROUND_ENDPOINTS.map((ep, i) => (
            <button
              key={`${ep.method} ${ep.path}`}
              onClick={() => selectEndpoint(i)}
              style={{
                textAlign: 'left',
                padding: '10px 14px',
                borderRadius: 14,
                cursor: 'pointer',
                border: `1px solid ${selectedIdx === i ? C.hair : C.hairSoft}`,
                background: selectedIdx === i ? C.cream : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <MethodBadge method={ep.method} />
                <code style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: C.ink }}>{ep.path}</code>
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: C.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.desc}</p>
            </button>
          ))}
        </div>

        {/* Request + response */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <div style={{ background: C.cream, border: `1px solid ${C.hairSoft}`, borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.hairSoft}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <MethodBadge method={endpoint.method} />
              <code style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: C.ink }}>{endpoint.path}</code>
            </div>
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: C.inkMuted }}>{endpoint.desc}</p>
              {endpoint.params.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.inkMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {endpoint.method === 'POST' ? 'Request Body' : 'Query Parameters'}
                  </p>
                  {endpoint.params.map((p) => (
                    <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <label style={{ fontSize: 12, fontFamily: 'monospace', color: C.inkMuted, width: 140, flexShrink: 0 }}>
                        {p.label}
                        {p.required && <span style={{ color: C.tanDeep, marginLeft: 4 }}>*</span>}
                      </label>
                      <input
                        type="text"
                        placeholder={p.placeholder}
                        value={values[p.key] ?? ''}
                        onChange={(e) => setValue(p.key, e.target.value)}
                        style={{ flex: 1, minWidth: 0, background: C.creamDeep, border: `1px solid ${C.hairSoft}`, borderRadius: 10, padding: '8px 10px', fontSize: 13, fontFamily: 'monospace', color: C.ink }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: C.inkFaint, fontStyle: 'italic' }}>No parameters required.</p>
              )}

              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: '#B91C1C' }}>
                  {error}
                </div>
              )}

              <button
                onClick={send}
                disabled={loading}
                style={{ width: '100%', padding: '11px 0', background: C.forest, color: C.onPrimary, border: 'none', borderRadius: 14, fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Sending…' : '▶ Send Request'}
              </button>
            </div>
          </div>

          {result && (
            <div style={{ background: C.codeBg, borderRadius: 20, overflow: 'hidden' }}>
              <div style={{ padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Response</span>
                <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: result.ok ? C.forestLight : '#F87171' }}>
                  {result.status} {result.ok ? 'OK' : 'Error'}
                </span>
              </div>
              <pre style={{ margin: 0, padding: 18, fontSize: 12.5, fontFamily: 'monospace', color: C.tanSoft, overflowX: 'auto', lineHeight: 1.65, maxHeight: 480 }}>
                <code>{JSON.stringify(result.data, null, 2)}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
