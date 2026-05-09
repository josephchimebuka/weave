'use client';

import { useState } from 'react';
import {
  BookOpen, Info, Layout, Cpu, Bell, Globe, Shield,
  MessageSquare, Zap, Network, GitBranch, Terminal,
  Check, Copy, ChevronDown, KeyRound, Play,
  AlertTriangle, FlaskConical, Lock, ArrowRight,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const WeaveCheckout = dynamic(
  () => import('@weave/widget').then(m => m.WeaveCheckout),
  { ssr: false }
);

type DocPage = 'introduction' | 'widget' | 'api' | 'playground' | 'webhooks' | 'security' | 'support';
type CodeTab  = 'html' | 'react' | 'nextjs';

export default function DocsPage() {
  const [activePage, setActivePage] = useState<DocPage>('introduction');
  const [copied, setCopied] = useState<string | null>(null);

  function copy(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="flex min-h-[calc(100vh-120px)] bg-cream-soft rounded-[32px] overflow-hidden border border-hair-soft shadow-leaf-lg mb-12">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-[220px] border-r border-hair-soft bg-cream-soft flex-col shrink-0">
        <div className="p-6 border-b border-hair-soft">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={13} strokeWidth={2} className="text-forest-deep" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">Docs</span>
          </div>
          <h2 className="font-display text-[15px] font-semibold text-ink">Weave v1.0</h2>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          <NavGroup label="Guides">
            <NavItem icon={<Info size={14} />}    label="Introduction"       active={activePage === 'introduction'} onClick={() => setActivePage('introduction')} />
            <NavItem icon={<Layout size={14} />}  label="Widget Playground"  active={activePage === 'widget'}       onClick={() => setActivePage('widget')} />
          </NavGroup>
          <NavGroup label="Reference">
            <NavItem icon={<Cpu size={14} />}        label="API Reference"    active={activePage === 'api'}        onClick={() => setActivePage('api')} />
            <NavItem icon={<Terminal size={14} />}   label="API Playground"   active={activePage === 'playground'} onClick={() => setActivePage('playground')} />
            <NavItem icon={<Bell size={14} />}       label="Webhooks"         active={activePage === 'webhooks'}   onClick={() => setActivePage('webhooks')} />
          </NavGroup>
          <NavGroup label="More">
            <NavItem icon={<Shield size={14} />}        label="Security" active={activePage === 'security'} onClick={() => setActivePage('security')} />
            <NavItem icon={<MessageSquare size={14} />} label="Support"  active={activePage === 'support'}  onClick={() => setActivePage('support')} />
          </NavGroup>
        </nav>

        <div className="p-4 border-t border-hair-soft">
          <div className="bg-forest/6 rounded-xl p-3 border border-forest/12">
            <p className="text-[11px] text-forest-deep leading-snug">
              Need a custom corridor?{' '}
              <a href="mailto:support@weave.dev" className="underline underline-offset-2 font-semibold">Contact us</a>
            </p>
          </div>
        </div>
      </aside>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-10">
          {activePage === 'introduction' && <IntroductionPage setActivePage={setActivePage} copy={copy} copied={copied} />}
          {activePage === 'widget'       && <WidgetPlayground />}
          {activePage === 'api'          && <ApiReferencePage copy={copy} copied={copied} />}
          {activePage === 'playground'   && <ApiPlayground />}
          {activePage === 'webhooks'     && <WebhooksPage copy={copy} copied={copied} />}
          {activePage === 'security'     && <SecurityPage copy={copy} copied={copied} />}
          {activePage === 'support'      && <SupportPage />}
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Introduction
// ─────────────────────────────────────────────────────────────────────────────

function IntroductionPage({ setActivePage, copy, copied }: { setActivePage: (p: DocPage) => void; copy: (id: string, text: string) => void; copied: string | null }) {
  const [tab, setTab] = useState<CodeTab>('html');

  const SNIPPETS: Record<CodeTab, string> = {
    html: `<div id="weave-checkout"></div>

<script src="https://unpkg.com/@weave/widget/dist/umd.js"></script>
<script>
  Weave.mount('#weave-checkout', {
    apiKey:       'pk_live_...',
    theme:        'organic',
    accentColor:  '#3D6B50',
    borderRadius: 16,
    merchant: {
      name:        'Acme Store',
      amount:      5000,
      currency:    'NGN',
      description: 'Order #1042',
    },
    onSuccess: (txn) => console.log('Paid', txn.orderId),
    onError:   (err) => console.error(err.message),
    onClose:   ()    => console.log('closed'),
  });
</script>`,
    react: `import { WeaveCheckout } from '@weave/widget';
// npm install @weave/widget

export default function CheckoutPage() {
  return (
    <WeaveCheckout
      apiKey="pk_live_..."
      theme="organic"
      accentColor="#3D6B50"
      borderRadius={16}
      merchant={{
        name:        'Acme Store',
        amount:      5000,
        currency:    'NGN',
        description: 'Order #1042',
      }}
      onSuccess={(txn) => fulfillOrder(txn.orderId)}
      onError={(err)   => showError(err.message)}
      onClose={()      => setOpen(false)}
    />
  );
}`,
    nextjs: `'use client';
// The widget uses window + wallet APIs — must be client-only.
import dynamic from 'next/dynamic';

const WeaveCheckout = dynamic(
  () => import('@weave/widget').then(m => m.WeaveCheckout),
  { ssr: false }
);

export default function CheckoutPage() {
  return (
    <WeaveCheckout
      apiKey="pk_live_..."
      theme="organic"
      accentColor="#3D6B50"
      borderRadius={16}
      merchant={{ name: 'Acme Store', amount: 5000, currency: 'NGN' }}
      onSuccess={(txn) => console.log('paid', txn.orderId)}
      onError={(err)   => console.error(err.message)}
      onClose={()      => router.back()}
    />
  );
}`,
  };

  return (
    <div className="space-y-14 fade-up pb-16">
      {/* Hero */}
      <header className="space-y-4 pt-2">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold text-forest bg-forest/8 px-3 py-1.5 rounded-full border border-forest/15 uppercase tracking-widest">
          <BookOpen size={11} /> Integration Guide
        </div>
        <h1 className="font-display text-[44px] font-semibold text-ink tracking-tight leading-[1.05]">
          Accept any currency,<br />settle anywhere.
        </h1>
        <p className="text-[17px] text-ink-muted max-w-2xl leading-relaxed">
          Weave is a universal payment orchestrator. Customers pay in 30+ chains or fiat;
          you receive NGN to your bank account or USDC to a wallet — automatically.
        </p>
      </header>

      {/* Settlement note */}
      <div className="bg-forest/5 border border-forest/15 rounded-2xl px-5 py-4 text-[13.5px] text-forest-deep leading-relaxed">
        <strong>Settlement times:</strong> NGN via Paystack — <strong>T+1 business day</strong>.
        Crypto-sourced NGN via Paycrest — <strong>30 s – 2 min</strong>.
        Crypto wallet payouts — <strong>near-instant</strong>.
      </div>

      {/* Quick-nav cards */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { icon: <Zap size={17} className="text-forest" />, title: '2-min setup', desc: 'One script tag. No build step.', action: () => {} },
          { icon: <Terminal size={17} className="text-forest" />, title: 'REST API', desc: 'Server-side, programmatic control.', action: () => setActivePage('api') },
          { icon: <Network size={17} className="text-forest" />, title: 'Corridors', desc: 'ChainRails, NEAR Intents, Paycrest.', action: () => {} },
          { icon: <Bell size={17} className="text-forest" />, title: 'Webhooks', desc: 'HMAC-signed async notifications.', action: () => setActivePage('webhooks') },
        ].map(({ icon, title, desc, action }) => (
          <button key={title} onClick={action} className="group text-left bg-cream-deep/30 hover:bg-cream-deep/60 border border-hair-soft hover:border-forest/25 rounded-[20px] p-5 transition-all">
            <div className="mb-3">{icon}</div>
            <p className="font-display text-[15px] font-semibold text-ink group-hover:text-forest-deep transition-colors">{title}</p>
            <p className="text-[12.5px] text-ink-muted mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      <div className="rule-dotted" />

      {/* Authentication */}
      <section className="space-y-5">
        <SectionHeading icon={<KeyRound size={18} />} title="Authentication" />
        <p className="text-[14.5px] text-ink-muted leading-relaxed">
          Every request must include an <IC>x-api-key</IC> header. Two key types exist — use each in the right context.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-cream-soft border border-hair-soft rounded-[20px] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold bg-forest/10 text-forest-deep px-2 py-0.5 rounded-full uppercase tracking-wider">Public</span>
              <code className="text-[12px] font-mono text-forest-deep">pk_live_…</code>
            </div>
            <p className="text-[13px] text-ink-muted leading-relaxed">Safe to use in browser code and the widget. Used for <strong className="text-ink">quotes</strong> and <strong className="text-ink">order creation</strong>. Never grants read access to your account details.</p>
          </div>
          <div className="bg-cream-soft border border-hair-soft rounded-[20px] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold bg-tan/15 text-tan-deep px-2 py-0.5 rounded-full uppercase tracking-wider">Secret</span>
              <code className="text-[12px] font-mono text-tan-deep">sk_live_…</code>
            </div>
            <p className="text-[13px] text-ink-muted leading-relaxed">Server-side only. Never expose in client code, logs, or version control. Shown exactly once after generation — store it immediately.</p>
          </div>
        </div>
        <CodeBlock id="auth-header" copy={copy} copied={copied} lang="bash">
{`# Publishable key — safe in the browser / widget
curl "https://api.paywithweave.com/api/v1/quotes?from=crypto:BASE:USDC&to=fiat:NGN&amount=50" \\
  -H "x-api-key: pk_live_..."`}
        </CodeBlock>
      </section>

      <div className="rule-dotted" />

      {/* Sandbox */}
      <section className="space-y-5">
        <SectionHeading icon={<FlaskConical size={18} />} title="Sandbox Mode" />
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl px-5 py-4 text-[13.5px] text-amber-900 leading-relaxed">
          Use <IC>pk_test_…</IC> keys for development. Orders auto-complete instantly with mock amounts — no real funds move.
        </div>
        <p className="text-[14.5px] text-ink-muted leading-relaxed">
          Your sandbox publishable key is on the <strong className="text-ink">Developer</strong> tab in Settings. Sandbox orders appear in your dashboard with a sandbox badge and are excluded from revenue metrics.
        </p>
        <div className="bg-cream-soft border border-hair-soft rounded-[20px] overflow-hidden">
          {[
            { label: 'Sandbox key prefix',    value: 'pk_test_…'     },
            { label: 'Orders auto-complete',  value: 'Yes — instant' },
            { label: 'Real provider calls',   value: 'None'          },
            { label: 'Emails / webhooks',     value: 'Suppressed'    },
            { label: 'Revenue metrics',       value: 'Excluded'      },
          ].map(({ label, value }, i, arr) => (
            <div key={label} className={`flex justify-between items-center px-5 py-3.5 text-[13px] ${i < arr.length - 1 ? 'border-b border-hair-soft' : ''}`}>
              <span className="text-ink-muted">{label}</span>
              <span className="font-mono font-semibold text-ink text-[12.5px]">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="rule-dotted" />

      {/* Asset Key format */}
      <section className="space-y-5">
        <SectionHeading icon={<Network size={18} />} title="Asset Key Format" />
        <p className="text-[14.5px] text-ink-muted leading-relaxed">
          Every asset uses a canonical <IC>crypto:CHAIN:TOKEN</IC> or <IC>fiat:CCY</IC> identifier. Chain and token are always uppercase.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            ['fiat:NGN',            'Nigerian Naira'],
            ['crypto:BASE:USDC',    'USDC on Base'],
            ['crypto:ETHEREUM:ETH', 'ETH on Ethereum'],
            ['crypto:ETHEREUM:USDC','USDC on Ethereum'],
            ['crypto:ARBITRUM:USDC','USDC on Arbitrum'],
            ['crypto:SOLANA:SOL',   'SOL on Solana'],
          ].map(([key, label]) => (
            <div key={key} className="bg-cream-deep/50 border border-hair-soft rounded-xl p-3 space-y-1">
              <code className="block text-[11.5px] font-mono text-forest-deep font-semibold">{key}</code>
              <span className="text-[11px] text-ink-muted">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="rule-dotted" />

      {/* Quick setup */}
      <section className="space-y-5">
        <SectionHeading icon={<Zap size={18} />} title="Quick Setup" />

        <div className="flex items-center gap-1 p-1 bg-cream-deep/50 rounded-2xl border border-hair-soft w-fit">
          {(['html', 'react', 'nextjs'] as CodeTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-[13px] font-medium transition-all ${tab === t ? 'bg-cream-soft text-forest-deep shadow-leaf' : 'text-ink-muted hover:text-ink'}`}
            >
              {t === 'html' ? 'HTML / JS' : t === 'react' ? 'React' : 'Next.js'}
            </button>
          ))}
        </div>

        <CodeBlock id="quickstart" copy={copy} copied={copied} lang={tab === 'html' ? 'html' : 'tsx'}>
          {SNIPPETS[tab]}
        </CodeBlock>

        {tab === 'nextjs' && (
          <div className="bg-forest/5 border border-forest/15 rounded-xl px-4 py-3 text-[13px] text-forest-deep leading-relaxed">
            The widget accesses <code>window</code> and wallet APIs — it must be a client component or lazy-loaded with <code>ssr: false</code>.
          </div>
        )}
      </section>

      <div className="rule-dotted" />

      {/* Payment corridors summary */}
      <section className="space-y-5">
        <SectionHeading icon={<GitBranch size={18} />} title="Payment Corridors" />
        <p className="text-[14.5px] text-ink-muted leading-relaxed">
          Weave routes automatically. Pass <IC>flow</IC> on <IC>POST /orders</IC> to control the bridge provider.
        </p>
        <div className="space-y-3">
          {[
            {
              name: 'Paystack', route: 'fiat:NGN → fiat:NGN', flow: 'external',
              settle: 'T+1 business day',
              desc: 'Direct Nigerian bank transfer via Paystack. Customer completes payment through a Paystack-hosted popup.',
            },
            {
              name: 'NEAR Intents', route: 'any chain → crypto:BASE:USDC', flow: 'external',
              settle: '30 – 90 s',
              desc: 'Cross-chain swap from 30+ chains. A deposit address is generated; customer sends from any wallet.',
            },
            {
              name: 'ChainRails', route: 'EVM → crypto:BASE:USDC', flow: 'self',
              settle: '~60 s',
              desc: 'EVM connected-wallet flow. Customer signs from their wallet — no deposit address copy-paste. Lower fee than NEAR Intents.',
            },
            {
              name: 'Paycrest', route: 'crypto:BASE:USDC ↔ fiat:NGN', flow: 'automatic',
              settle: '30 s – 2 min',
              desc: 'Automatic terminal settlement hop whenever a route touches NGN. Also handles onramps (NGN → USDC).',
            },
          ].map(({ name, route, flow, settle, desc }) => (
            <div key={name} className="bg-cream-soft border border-hair-soft rounded-[20px] p-5 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display font-semibold text-[15px] text-ink">{name}</span>
                <code className="text-[11px] font-mono bg-cream-deep px-2 py-0.5 rounded-lg text-forest-deep">{route}</code>
              </div>
              <div className="flex flex-wrap gap-4 text-[12px] text-ink-muted">
                <span><strong className="text-ink">flow:</strong> <code className="font-mono text-[11.5px]">{flow}</code></span>
                <span><strong className="text-ink">Settles in:</strong> {settle}</span>
              </div>
              <p className="text-[13px] text-ink-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="rule-dotted" />

      {/* Security callout */}
      <section className="bg-forest/5 border border-forest/15 rounded-[24px] p-7 space-y-4">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-forest" strokeWidth={1.75} />
          <h3 className="font-display text-[20px] font-semibold text-forest-deep">Security Model</h3>
        </div>
        <div className="space-y-3 text-[13.5px] text-forest-deep/80 leading-relaxed">
          <p><strong className="text-forest-deep">API keys are scoped.</strong> Publishable keys (<IC>pk_</IC>) are browser-safe. Secret keys (<IC>sk_</IC>) must never leave your server.</p>
          <p><strong className="text-forest-deep">All webhooks are signature-verified.</strong> Incoming provider webhooks (Paystack, Paycrest, ChainRails) are HMAC-verified before any state is mutated. Outgoing merchant webhooks are signed with HMAC-SHA256 over <IC>{`${'`${timestamp}.${rawBody}`'}`}</IC>.</p>
          <p><strong className="text-forest-deep">Idempotent processing.</strong> Every incoming webhook event is deduplicated by <IC>{'(source, event, externalId)'}</IC>; outgoing events ship with a stable <IC>data.id</IC> for your handler to dedupe on.</p>
        </div>
        <button
          onClick={() => setActivePage('security')}
          className="text-[12.5px] font-semibold text-forest-deep hover:underline underline-offset-2 inline-flex items-center gap-1.5 mt-1"
        >
          Read the full Security guide <ArrowRight size={13} strokeWidth={2.2} />
        </button>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Widget Playground
// ─────────────────────────────────────────────────────────────────────────────

function WidgetPlayground() {
  const [theme,   setTheme]   = useState<'organic' | 'minimal'>('organic');
  const [accent,  setAccent]  = useState('#3D6B50');
  const [radius,  setRadius]  = useState(16);
  const [amount,  setAmount]  = useState(5000);
  const [currency,setCurrency]= useState('NGN');
  const [amountIn,setAmountIn]= useState<'source' | 'dest'>('dest');
  const [key,     setKey]     = useState(0);
  const [copied,  setCopied]  = useState(false);

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

  return (
    <div className="space-y-8 pb-16 fade-up">
      <header>
        <h1 className="font-display text-[36px] font-semibold text-ink tracking-tight leading-tight">Widget Playground</h1>
        <p className="text-ink-muted mt-2 text-[15px] leading-relaxed">Configure the widget in real-time and copy the generated code.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-cream-deep/30 border border-hair-soft rounded-[24px] p-6 space-y-6">
            <div>
              <Label>Theme</Label>
              <div className="mt-2 flex gap-2">
                {(['organic', 'minimal'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium border transition-all ${theme === t ? 'bg-forest text-cream-soft border-forest shadow-leaf' : 'bg-cream-soft text-ink-muted border-hair-soft hover:border-hair'}`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-2">
                <Label>Corner Radius</Label>
                <span className="text-[12px] font-mono text-ink-muted">{radius}px</span>
              </div>
              <input
                type="range" min="0" max="32" step="4" value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="organic-range w-full"
              />
              <div className="flex justify-between text-[11px] text-ink-faint mt-1">
                <span>Sharp</span><span>Soft</span>
              </div>
            </div>

            <div>
              <Label>Accent Color</Label>
              <div className="mt-2 flex gap-2 flex-wrap">
                {[['#3D6B50','bg-forest'],['#B8935A','bg-tan'],['#1C1B17','bg-ink'],['#7B6B4E','bg-tan-deep']].map(([hex,cls]) => (
                  <button
                    key={hex}
                    onClick={() => setAccent(hex)}
                    className={`w-8 h-8 rounded-full ${cls} transition-all ${accent === hex ? 'ring-2 ring-offset-2 ring-offset-cream-soft ring-forest scale-110' : 'hover:scale-110'}`}
                    aria-label={hex}
                  />
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-hair-soft space-y-4">
              <Label>Payment</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-ink-faint uppercase tracking-widest block mb-1.5">Amount</span>
                  <input
                    type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value))}
                    className="w-full bg-cream-soft border border-hair-soft rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:border-forest/40"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-ink-faint uppercase tracking-widest block mb-1.5">Currency</span>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full bg-cream-soft border border-hair-soft rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:border-forest/40">
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-ink-faint uppercase tracking-widest block mb-1.5">Amount Logic</span>
                <div className="flex gap-2">
                  <button onClick={() => setAmountIn('dest')} className={`flex-1 py-2 rounded-xl text-[12px] font-medium border transition-all ${amountIn === 'dest' ? 'bg-forest/8 text-forest-deep border-forest/25' : 'bg-cream-soft text-ink-muted border-hair-soft'}`}>
                    Merchant gets exact
                  </button>
                  <button onClick={() => setAmountIn('source')} className={`flex-1 py-2 rounded-xl text-[12px] font-medium border transition-all ${amountIn === 'source' ? 'bg-forest/8 text-forest-deep border-forest/25' : 'bg-cream-soft text-ink-muted border-hair-soft'}`}>
                    Customer pays exact
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setKey(k => k + 1)}
              className="w-full py-3 bg-forest text-cream-soft rounded-2xl font-semibold text-[14px] hover:bg-forest-deep transition-all shadow-leaf flex items-center justify-center gap-2"
            >
              <Play size={14} fill="currentColor" /> Update Preview
            </button>
          </div>

          {/* Generated code */}
          <div className="bg-ink rounded-[24px] overflow-hidden border border-cream-soft/5 shadow-leaf-lg">
            <div className="px-5 py-3 border-b border-cream-soft/5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-cream-soft/30 uppercase tracking-[0.2em]">Generated Code</span>
              <button onClick={copy} className="flex items-center gap-1.5 text-[11px] text-cream-soft/40 hover:text-cream-soft transition-colors">
                {copied ? <><Check size={12} className="text-forest-light" /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
            <pre className="p-5 text-[12px] font-mono text-tan-soft overflow-x-auto leading-relaxed">
              <code>{snippet}</code>
            </pre>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-7 flex justify-center sticky top-6">
          <div className="w-full max-w-sm p-8 rounded-[32px] bg-cream-deep/40 border border-hair-soft shadow-leaf-lg">
            <p className="text-[10px] font-bold text-ink-faint uppercase tracking-widest mb-5 text-center">Live Preview</p>
            <div style={{ pointerEvents: 'none' }}>
              <WeaveCheckout
                key={key}
                apiKey="pk_test_docs_playground"
                theme={theme}
                accentColor={accent}
                borderRadius={radius}
                merchant={{ name: 'Playground Store', amount, currency: currency as any, amountIn }}
                onSuccess={() => {}} onError={() => {}} onClose={() => {}}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// API Playground
// ─────────────────────────────────────────────────────────────────────────────

type PlaygroundParam = { key: string; label: string; placeholder: string; required: boolean; inBody?: boolean };
type PlaygroundEndpoint = {
  method: 'GET' | 'POST';
  path: string;
  desc: string;
  params: PlaygroundParam[];
};

const PLAYGROUND_ENDPOINTS: PlaygroundEndpoint[] = [
  {
    method: 'GET', path: '/quotes',
    desc: 'Get a live exchange rate and fee breakdown for any asset pair.',
    params: [
      { key: 'from',     label: 'From',      placeholder: 'crypto:BASE:USDC', required: true  },
      { key: 'to',       label: 'To',        placeholder: 'fiat:NGN',         required: true  },
      { key: 'amount',   label: 'Amount',    placeholder: '50',               required: true  },
      { key: 'amountIn', label: 'Amount In', placeholder: 'source',           required: false },
    ],
  },
  {
    method: 'POST', path: '/orders',
    desc: 'Create a payment order. Returns nextAction for the widget.',
    params: [
      { key: 'source.inline.kind',         label: 'Source Kind',    placeholder: 'crypto_wallet',        required: true,  inBody: true },
      { key: 'source.inline.assetKey',     label: 'Source Asset',   placeholder: 'crypto:BASE:USDC',    required: true,  inBody: true },
      { key: 'source.inline.walletAddress',label: 'Wallet Address', placeholder: '0xYourWallet',         required: false, inBody: true },
      { key: 'amount',                     label: 'Amount',         placeholder: '50',                   required: true,  inBody: true },
      { key: 'flow',                       label: 'Flow',           placeholder: 'external',             required: false, inBody: true },
    ],
  },
  {
    method: 'GET', path: '/orders/:id',
    desc: 'Fetch a single order status. Triggers a live sync from the active provider.',
    params: [
      { key: ':id', label: 'Order ID', placeholder: 'ord_abc123', required: true },
    ],
  },
  {
    method: 'GET', path: '/orders',
    desc: 'List your last 50 orders, newest first.',
    params: [],
  },
  {
    method: 'GET', path: '/institutions',
    desc: 'List supported bank institutions for a currency.',
    params: [
      { key: 'currency', label: 'Currency', placeholder: 'NGN', required: true },
    ],
  },
];

function ApiPlayground() {
  const [apiKey, setApiKey]           = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [values, setValues]           = useState<Record<string, string>>({});
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<{ status: number; ok: boolean; data: unknown } | null>(null);
  const [error, setError]             = useState<string | null>(null);

  const endpoint = PLAYGROUND_ENDPOINTS[selectedIdx];

  function setValue(key: string, val: string) {
    setValues(v => ({ ...v, [key]: val }));
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
    if (!apiKey.trim()) { setError('Enter an API key (pk_test_… or pk_live_…) to send requests.'); return; }
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      // Build path (replace :param segments)
      let resolvedPath = endpoint.path;
      for (const p of endpoint.params) {
        if (p.key.startsWith(':')) {
          resolvedPath = resolvedPath.replace(p.key, values[p.key] ?? '');
        }
      }

      // Separate query params from body params
      const query: Record<string, string> = {};
      const bodyObj: Record<string, unknown> = {};

      for (const p of endpoint.params) {
        if (p.key.startsWith(':')) continue;
        const val = values[p.key] ?? '';
        if (!val) continue;
        if (p.inBody) {
          // Nested key support: "source.inline.kind" → { source: { inline: { kind: val } } }
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

  return (
    <div className="space-y-8 pb-16 fade-up">
      <header>
        <h1 className="font-display text-[36px] font-semibold text-ink tracking-tight leading-tight">API Playground</h1>
        <p className="text-ink-muted mt-2 text-[15px] leading-relaxed">
          Send live requests against the Weave API. Use <code className="bg-cream-deep px-1.5 py-0.5 rounded-md font-mono text-[12px] text-forest-deep">pk_test_…</code> to test without moving real funds.
        </p>
      </header>

      {/* API key bar */}
      <div className="flex items-center gap-3 bg-cream-deep/40 border border-hair-soft rounded-2xl px-4 py-3">
        <KeyRound size={15} className="text-ink-muted shrink-0" strokeWidth={1.9} />
        <input
          type="password"
          placeholder="pk_test_… or pk_live_…"
          value={apiKey}
          onChange={(e) => { setApiKey(e.target.value); setError(null); }}
          className="flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-ink-faint focus:outline-none font-mono"
          autoComplete="off"
        />
        {apiKey && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
            apiKey.startsWith('pk_test_') ? 'bg-amber-100 text-amber-700' : 'bg-forest/10 text-forest-deep'
          }`}>
            {apiKey.startsWith('pk_test_') ? 'Sandbox' : 'Live'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Endpoint list */}
        <div className="md:col-span-4 space-y-1.5">
          <p className="text-[10px] font-bold text-ink-faint uppercase tracking-widest px-1 mb-2">Endpoints</p>
          {PLAYGROUND_ENDPOINTS.map((ep, i) => (
            <button
              key={`${ep.method} ${ep.path}`}
              onClick={() => selectEndpoint(i)}
              className={`w-full text-left px-4 py-3 rounded-2xl border transition-all ${
                selectedIdx === i
                  ? 'bg-cream-soft border-hair shadow-leaf'
                  : 'bg-cream-soft/50 border-hair-soft hover:border-hair hover:bg-cream-soft/80'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <MethodBadge method={ep.method} />
                <code className="text-[12px] font-mono font-semibold text-ink truncate">{ep.path}</code>
              </div>
              <p className="text-[11.5px] text-ink-muted leading-snug line-clamp-1">{ep.desc}</p>
            </button>
          ))}
        </div>

        {/* Request + response */}
        <div className="md:col-span-8 space-y-5">
          {/* Request builder */}
          <div className="bg-cream-soft border border-hair-soft rounded-[24px] overflow-hidden shadow-leaf">
            <div className="px-5 py-4 border-b border-hair-soft bg-cream-deep/20 flex items-center gap-3">
              <MethodBadge method={endpoint.method} />
              <code className="font-mono text-[13px] font-semibold text-ink flex-1">{endpoint.path}</code>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-[13px] text-ink-muted leading-relaxed">{endpoint.desc}</p>

              {endpoint.params.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">
                    {endpoint.method === 'POST' ? 'Request Body' : 'Query Parameters'}
                  </p>
                  {endpoint.params.map((p) => (
                    <div key={p.key} className="flex items-center gap-3">
                      <label className="text-[12px] font-mono text-ink-soft w-36 shrink-0">
                        {p.label}
                        {p.required && <span className="text-tan-deep ml-1">*</span>}
                      </label>
                      <input
                        type="text"
                        placeholder={p.placeholder}
                        value={values[p.key] ?? ''}
                        onChange={(e) => setValue(p.key, e.target.value)}
                        className="flex-1 bg-cream-deep/50 border border-hair-soft rounded-xl px-3 py-2 text-[13px] font-mono text-ink focus:outline-none focus:border-forest/40 transition-colors placeholder:text-ink-faint"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-ink-faint italic">No parameters required.</p>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[12.5px] text-red-700 flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                onClick={send}
                disabled={loading}
                className="w-full py-3 bg-forest text-cream-soft rounded-2xl font-semibold text-[14px] hover:bg-forest-deep transition-all shadow-leaf flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? <><div className="w-4 h-4 border-2 border-cream-soft/30 border-t-cream-soft rounded-full animate-spin" /> Sending…</>
                  : <><Play size={14} fill="currentColor" /> Send Request</>}
              </button>
            </div>
          </div>

          {/* Response */}
          {result && (
            <div className="bg-ink rounded-[24px] overflow-hidden shadow-leaf-lg border border-cream-soft/5 fade-up">
              <div className="px-5 py-3 border-b border-cream-soft/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-cream-soft/30 uppercase tracking-[0.18em]">Response</span>
                <span className={`text-[11px] font-mono font-bold ${result.ok ? 'text-forest-light' : 'text-red-400'}`}>
                  {result.status} {result.ok ? 'OK' : 'Error'}
                </span>
              </div>
              <pre className="p-5 text-[12.5px] font-mono text-tan-soft overflow-x-auto leading-[1.65] max-h-[480px]">
                <code>{JSON.stringify(result.data, null, 2)}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// API Reference
// ─────────────────────────────────────────────────────────────────────────────

function ApiReferencePage({ copy, copied }: { copy: (id: string, text: string) => void; copied: string | null }) {
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (key: string) => setOpen(o => o === key ? null : key);

  return (
    <div className="space-y-12 pb-16 fade-up">
      <header>
        <h1 className="font-display text-[36px] font-semibold text-ink tracking-tight leading-tight">API Reference</h1>
        <p className="text-ink-muted mt-2 text-[15px] leading-relaxed">
          Base URL: <IC>https://api.paywithweave.com/api/v1</IC><br />
          Authenticate with <IC>x-api-key: pk_live_…</IC> on every request.
        </p>
      </header>

      {/* Widget Props */}
      <section className="space-y-4">
        <SectionHeading icon={<Layout size={17} />} title="Widget Props" />

        <PropsTable title="WeaveCheckout" rows={[
          { name: 'apiKey',       type: 'string',                    req: false, desc: 'Publishable key (pk_live_… or pk_test_…). Falls back to window.__WEAVE_API_KEY__ or VITE_WEAVE_PUBLIC_KEY.' },
          { name: 'merchant',     type: 'Merchant',                  req: false, desc: 'Payment context. See Merchant props below.' },
          { name: 'theme',        type: '"organic" | "minimal"',     req: false, desc: 'Visual theme. organic (default) = soft curves + warmer palette; minimal = flat.' },
          { name: 'accentColor',  type: 'string',                    req: false, desc: 'Brand accent. "forest" | "tan" or any hex, e.g. "#0F5D4C". Controls buttons and receipt.' },
          { name: 'borderRadius', type: 'number',                    req: false, desc: 'Corner radius of the widget frame in px. Default: 16.' },
          { name: 'userAddress',  type: 'string',                    req: false, desc: 'Pre-fill a connected wallet address.' },
          { name: 'apiBase',      type: 'string',                    req: false, desc: 'Override the API base URL for proxying or local testing.' },
          { name: 'onSuccess',    type: '(txn: { orderId, status }) => void', req: false, desc: 'Called when the order reaches completed status.' },
          { name: 'onError',      type: '(err: Error) => void',      req: false, desc: 'Called on unrecoverable errors.' },
          { name: 'onClose',      type: '() => void',                req: false, desc: 'Called when the user dismisses without completing.' },
        ]} />

        <PropsTable title="Merchant" rows={[
          { name: 'name',           type: 'string',                             req: true,  desc: 'Business or store name shown to the payer.' },
          { name: 'amount',         type: 'number',                             req: true,  desc: 'Payment amount denominated in currency (or in dest asset when amountIn is "dest").' },
          { name: 'currency',       type: 'string',                             req: true,  desc: 'ISO 4217 settlement currency, e.g. "NGN".' },
          { name: 'description',    type: 'string',                             req: false, desc: 'Order description shown in the widget and on the receipt.' },
          { name: 'amountIn',       type: '"source" | "dest"',                 req: false, desc: '"source" (default) — customer deposits exactly this. "dest" — you receive exactly this; customer pays the crypto equivalent including fees.' },
          { name: 'sourceAssetKey', type: 'string',                             req: false, desc: 'Lock payer to a specific asset, e.g. "crypto:ETHEREUM:USDC". Widget lets customer choose when omitted.' },
          { name: 'destAssetKey',   type: 'string',                             req: false, desc: 'Lock settlement destination asset, e.g. "fiat:NGN". Overrides your configured default payout.' },
          { name: 'destInstrument', type: 'InlineBankInstrument | InlineWalletInstrument', req: false, desc: 'Explicit payout instrument for this order. Overrides both destAssetKey and the merchant default.' },
        ]} />
      </section>

      <div className="rule-dotted" />

      {/* Endpoints */}
      <section className="space-y-4">
        <SectionHeading icon={<Terminal size={17} />} title="Endpoints" />

        {([
          {
            method: 'GET', path: '/quotes',
            summary: 'Live exchange rate and full fee breakdown for any asset pair.',
            params: [
              { name: 'from',     type: 'string',            req: true,  desc: 'Source asset key — e.g. crypto:ETHEREUM:USDC' },
              { name: 'to',       type: 'string',            req: true,  desc: 'Destination asset key — e.g. fiat:NGN' },
              { name: 'amount',   type: 'number',            req: true,  desc: 'Amount in source asset (or dest when amountIn=dest)' },
              { name: 'amountIn', type: '"source" | "dest"', req: false, desc: 'Whether amount is source- or dest-denominated. Default: source' },
            ],
            request: `curl "https://api.paywithweave.com/api/v1/quotes?from=crypto:ETHEREUM:USDC&to=fiat:NGN&amount=50" \\
  -H "x-api-key: pk_live_..."`,
            response: `{
  "data": {
    "estimatedDest": 74250.00,
    "breakdown": {
      "usdEquivalent": 50,
      "sourceAmount":  50,
      "senderFeeUsd":  0.375,
      "appFeeUsd":     0.05,
      "bridgeFeeUsd":  0.10,
      "netUsd":        49.475,
      "sellRate":      1500.00
    },
    "route": {
      "steps": [
        { "provider": "nearintents", "fromAsset": "crypto:ETHEREUM:USDC",  "toAsset": "crypto:BASE:USDC", "expectedFeeBps": 25, "expectedSecs": 90 },
        { "provider": "paycrest",    "fromAsset": "crypto:BASE:USDC", "toAsset": "fiat:NGN",          "expectedFeeBps": 85, "expectedSecs": 90 }
      ],
      "totalExpectedFeeBps": 110,
      "totalExpectedSecs":   180
    }
  }
}`,
          },
          {
            method: 'POST', path: '/orders',
            summary: 'Create a payment order and receive nextAction for the widget.',
            params: [
              { name: 'source.inline.kind',         type: '"crypto_wallet" | "bank_account"', req: true,  desc: 'Type of source instrument' },
              { name: 'source.inline.assetKey',     type: 'string',             req: true,  desc: 'Source asset key, e.g. crypto:ETHEREUM:USDC' },
              { name: 'source.inline.walletAddress',type: 'string',             req: false, desc: 'Customer wallet address (crypto sources)' },
              { name: 'amount',                     type: 'number',             req: true,  desc: 'Payment amount in source units (unless amountIn=dest)' },
              { name: 'amountIn',                   type: '"source" | "dest"',  req: false, desc: 'Whether amount is source- or dest-denominated. Default: source' },
              { name: 'flow',                       type: '"external" | "self"',req: false, desc: '"external" = NEAR Intents (deposit address, any chain). "self" = ChainRails (connected EVM wallet). Default: external' },
              { name: 'refundAddress',              type: 'string',             req: false, desc: 'Customer wallet for refunds on failure. Defaults to walletAddress' },
              { name: 'reference',                  type: 'string',             req: false, desc: 'Your unique ID for idempotent creation — returns HTTP 409 if a matching order already exists' },
              { name: 'dest',                       type: 'InstrumentRef',      req: false, desc: 'Override the payout destination. Defaults to your merchant default' },
            ],
            request: `curl https://api.paywithweave.com/api/v1/orders \\
  -X POST -H "x-api-key: pk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": {
      "inline": {
        "kind":          "crypto_wallet",
        "assetKey":      "crypto:ETHEREUM:USDC",
        "walletAddress": "0xCustomerWallet"
      }
    },
    "amount":        50,
    "flow":          "external",
    "refundAddress": "0xCustomerWallet"
  }'`,
            response: `{
  "data": {
    "order": {
      "id":             "ord_abc123",
      "status":         "awaiting_deposit",
      "sourceAmount":   50.38,
      "destAmount":     74250.00,
      "sourceAssetKey": "crypto:ETHEREUM:USDC",
      "destAssetKey":   "fiat:NGN",
      "senderFeeUsd":   0.375,
      "appFeeUsd":      0.05,
      "bridgeFeeUsd":   0.10,
      "createdAt":      "2026-05-01T10:00:00Z"
    },
    "nextAction": {
      "screen":         "collect_crypto",
      "depositAddress": "0xNEARIntentsDepositAddress",
      "depositMemo":    null,
      "amount":         50.38,
      "token":          "USDC",
      "chain":          "ETHEREUM"
    }
  }
}`,
          },
          {
            method: 'GET', path: '/orders/:id',
            summary: 'Fetch a single order. Triggers a live sync from the active provider before returning.',
            params: [
              { name: ':id', type: 'string', req: true, desc: 'Order ID from POST /orders' },
            ],
            request: `curl https://api.paywithweave.com/api/v1/orders/ord_abc123 \\
  -H "x-api-key: pk_live_..."`,
            response: `{
  "data": {
    "id":             "ord_abc123",
    "status":         "completed",
    "sourceAmount":   50.38,
    "destAmount":     74250.00,
    "sourceAssetKey": "crypto:ETHEREUM:USDC",
    "destAssetKey":   "fiat:NGN",
    "steps": [
      {
        "sequence":       0,
        "provider":       "nearintents",
        "status":         "done",
        "depositAddress": "0xNEARDeposit",
        "depositMemo":    null,
        "amountIn":       50.38,
        "amountOut":      50.30
      },
      {
        "sequence":  1,
        "provider":  "paycrest",
        "status":    "done",
        "amountIn":  50.30,
        "amountOut": 74250.00
      }
    ]
  }
}`,
          },
          {
            method: 'GET', path: '/orders',
            summary: 'List your last 50 orders, newest first.',
            params: [],
            request: `curl https://api.paywithweave.com/api/v1/orders \\
  -H "x-api-key: pk_live_..."`,
            response: `{
  "data": [
    {
      "id":             "ord_abc123",
      "status":         "completed",
      "sourceAmount":   50.38,
      "sourceAssetKey": "crypto:ETHEREUM:USDC",
      "destAssetKey":   "fiat:NGN",
      "createdAt":      "2026-05-01T10:05:00Z"
    },
    {
      "id":             "ord_xyz789",
      "status":         "awaiting_deposit",
      "sourceAmount":   100,
      "sourceAssetKey": "crypto:BASE:USDC",
      "destAssetKey":   "fiat:NGN",
      "createdAt":      "2026-05-01T09:12:00Z"
    }
  ]
}`,
          },
          {
            method: 'GET', path: '/institutions',
            summary: 'List supported bank institutions for a currency — use to populate bank pickers in onramp flows.',
            params: [
              { name: 'currency', type: 'string', req: true, desc: 'ISO 4217 currency code, e.g. NGN' },
            ],
            request: `curl "https://api.paywithweave.com/api/v1/institutions?currency=NGN" \\
  -H "x-api-key: pk_live_..."`,
            response: `{
  "data": [
    { "name": "Access Bank", "code": "ACCESS", "id": "..." },
    { "name": "GTBank",      "code": "GTBANK", "id": "..." },
    { "name": "Zenith Bank", "code": "ZENITH", "id": "..." }
  ]
}`,
          },
        ] as EndpointDef[]).map((ep) => {
          const key = `${ep.method} ${ep.path}`;
          const isOpen = open === key;
          return (
            <div key={key} className={`rounded-[20px] border overflow-hidden transition-all ${isOpen ? 'bg-cream-soft border-hair shadow-leaf' : 'bg-cream-soft/60 border-hair-soft hover:border-hair'}`}>
              <button onClick={() => toggle(key)} className="w-full flex items-center gap-4 px-5 py-4 text-left">
                <MethodBadge method={ep.method} />
                <code className="font-mono text-[13.5px] font-semibold text-ink flex-1">{ep.path}</code>
                <span className="text-[12px] text-ink-muted hidden sm:block truncate max-w-[240px]">{ep.summary.split('.')[0]}</span>
                <ChevronDown size={15} strokeWidth={2} className={`text-ink-muted shrink-0 transition-transform ${isOpen ? 'rotate-180 text-forest-deep' : ''}`} />
              </button>

              {isOpen && (
                <div className="px-5 pb-6 space-y-6 border-t border-hair-soft fade-up">
                  <p className="text-[13.5px] text-ink-muted leading-relaxed pt-5">{ep.summary}</p>

                  {ep.params.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-3">Parameters</p>
                      <div className="bg-cream-deep/40 rounded-xl overflow-hidden border border-hair-soft">
                        {ep.params.map((p, i, arr) => (
                          <div key={p.name} className={`flex items-start gap-3 px-4 py-3 text-[12.5px] ${i < arr.length - 1 ? 'border-b border-hair-soft' : ''}`}>
                            <code className="font-mono text-forest-deep text-[11.5px] shrink-0 mt-0.5 min-w-[140px]">{p.name}</code>
                            <span className="text-ink-faint font-mono text-[11px] shrink-0 mt-0.5 min-w-[80px]">{p.type}</span>
                            <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold shrink-0 mt-0.5 uppercase tracking-wide ${p.req ? 'bg-tan/15 text-tan-deep' : 'bg-cream-deep text-ink-faint'}`}>
                              {p.req ? 'req' : 'opt'}
                            </span>
                            <span className="text-ink-muted leading-relaxed">{p.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-3">Request</p>
                    <CodeBlock id={`req-${key}`} copy={copy} copied={copied} lang="bash">{ep.request}</CodeBlock>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-ink-soft uppercase tracking-widest mb-3">Response</p>
                    <CodeBlock id={`res-${key}`} copy={copy} copied={copied} lang="json" light>{ep.response}</CodeBlock>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="rule-dotted" />

      {/* Order statuses */}
      <section className="space-y-5">
        <SectionHeading icon={<GitBranch size={17} />} title="Order Statuses" />
        <div className="bg-cream-soft rounded-[20px] border border-hair-soft overflow-hidden">
          {[
            { status: 'awaiting_deposit', dot: 'bg-amber-400', desc: 'Created — waiting for the customer to send funds.' },
            { status: 'processing',       dot: 'bg-forest/50', desc: 'Deposit detected — bridge / settlement in progress.' },
            { status: 'completed',        dot: 'bg-forest',    desc: 'Funds delivered to your payout destination.' },
            { status: 'failed',           dot: 'bg-red-400',   desc: 'Payment failed or expired. No funds moved.' },
            { status: 'expired',          dot: 'bg-ink/25',    desc: 'No deposit received within the session window.' },
          ].map(({ status, dot, desc }, i, arr) => (
            <div key={status} className={`flex items-start gap-4 px-5 py-4 ${i < arr.length - 1 ? 'border-b border-hair-soft' : ''}`}>
              <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${dot}`} />
              <div>
                <code className="text-[13px] font-mono font-semibold text-ink">{status}</code>
                <p className="text-[13px] text-ink-muted mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-cream-soft rounded-[20px] border border-hair-soft overflow-hidden">
          <div className="px-5 py-3 border-b border-hair-soft">
            <p className="text-[11px] font-bold text-ink-soft uppercase tracking-widest">Route Step Statuses</p>
          </div>
          {[
            { status: 'pending',          dot: 'bg-ink/20',    desc: 'Step queued — provider resource not yet created.' },
            { status: 'awaiting_deposit', dot: 'bg-amber-400', desc: 'Provider created — waiting for deposit.' },
            { status: 'in_flight',        dot: 'bg-forest/50', desc: 'Funds received — provider processing the hop.' },
            { status: 'done',             dot: 'bg-forest',    desc: 'Hop completed — funds forwarded to next step.' },
            { status: 'failed',           dot: 'bg-red-400',   desc: 'Hop failed. Triggers order-level failure.' },
          ].map(({ status, dot, desc }, i, arr) => (
            <div key={status} className={`flex items-start gap-4 px-5 py-4 ${i < arr.length - 1 ? 'border-b border-hair-soft' : ''}`}>
              <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${dot}`} />
              <div>
                <code className="text-[13px] font-mono font-semibold text-ink">{status}</code>
                <p className="text-[13px] text-ink-muted mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhooks
// ─────────────────────────────────────────────────────────────────────────────

function WebhooksPage({ copy, copied }: { copy: (id: string, text: string) => void; copied: string | null }) {
  return (
    <div className="space-y-12 pb-16 fade-up">
      <header>
        <h1 className="font-display text-[36px] font-semibold text-ink tracking-tight leading-tight">Webhooks</h1>
        <p className="text-ink-muted mt-2 text-[15px] leading-relaxed">
          Real-time signed notifications delivered to your server when order status changes.
        </p>
      </header>

      {/* Setup */}
      <section className="space-y-5">
        <SectionHeading icon={<Bell size={17} />} title="Setup" />
        <p className="text-[14px] text-ink-muted leading-relaxed">
          Register your endpoint URL in <strong className="text-ink">Settings → Developer → Webhooks</strong>.
          Weave signs every request with HMAC-SHA256 using your webhook secret and retries with exponential back-off if your endpoint does not return <IC>2xx</IC>.
        </p>
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl px-5 py-4 flex gap-3">
          <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-[13.5px] text-amber-900 leading-relaxed">
            <strong>Always verify the signature</strong> before trusting webhook payloads. Never fulfil orders based on unverified requests.
          </p>
        </div>
      </section>

      <div className="rule-dotted" />

      {/* Events */}
      <section className="space-y-5">
        <SectionHeading icon={<Zap size={17} />} title="Events" />
        <div className="bg-cream-soft rounded-[20px] border border-hair-soft overflow-hidden">
          {[
            { event: 'order.completed', dot: 'bg-forest',    desc: 'All route steps settled. Funds delivered to your payout destination. Trigger fulfilment here.' },
            { event: 'order.failed',    dot: 'bg-red-400',   desc: 'Payment failed, expired, or refunded. No funds delivered.' },
          ].map(({ event, dot, desc }, i, arr) => (
            <div key={event} className={`flex items-start gap-4 px-5 py-4 ${i < arr.length - 1 ? 'border-b border-hair-soft' : ''}`}>
              <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${dot}`} />
              <div className="flex-1">
                <code className="text-[13px] font-mono font-semibold text-ink">{event}</code>
                <p className="text-[13px] text-ink-muted mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[13px] text-ink-muted leading-relaxed">
          Two more event types are reserved for future use — <IC>order.created</IC> and <IC>order.processing</IC> — but are not yet emitted.
        </p>
      </section>

      <div className="rule-dotted" />

      {/* Headers */}
      <section className="space-y-5">
        <SectionHeading icon={<Lock size={17} />} title="Delivery Headers" />
        <div className="bg-cream-soft rounded-[20px] border border-hair-soft overflow-hidden">
          {[
            { header: 'X-Weave-Signature', value: 'sha256=<hex>',        desc: 'HMAC-SHA256 of "{timestamp}.{rawBody}", signed with your webhook secret.' },
            { header: 'X-Weave-Timestamp', value: '<epoch seconds>',     desc: 'Unix timestamp used in the signature payload. Reject deliveries older than your tolerance window (we recommend 5 minutes).' },
            { header: 'X-Weave-Event',     value: 'order.completed',     desc: 'Convenience header — the event type, also present in the body.' },
            { header: 'User-Agent',        value: 'Weave-Webhook-Dispatcher/1.0', desc: 'Identifies traffic from Weave.' },
          ].map(({ header, value, desc }, i, arr) => (
            <div key={header} className={`flex flex-col gap-1 px-5 py-3.5 ${i < arr.length - 1 ? 'border-b border-hair-soft' : ''}`}>
              <div className="flex items-baseline justify-between gap-4">
                <code className="text-[12.5px] font-mono font-semibold text-forest-deep">{header}</code>
                <code className="text-[11.5px] font-mono text-ink-muted">{value}</code>
              </div>
              <p className="text-[12px] text-ink-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="rule-dotted" />

      {/* Payload */}
      <section className="space-y-5">
        <SectionHeading icon={<Terminal size={17} />} title="Payload" />
        <CodeBlock id="wh-payload" copy={copy} copied={copied} lang="json" light>
{`{
  "event": "order.completed",
  "data": {
    "id":             "clxq8a4...",
    "reference":      "your-internal-id",
    "status":         "completed",
    "sourceAssetKey": "crypto:ETHEREUM:USDC",
    "destAssetKey":   "fiat:NGN",
    "sourceAmount":   50.38,
    "destAmount":     74250,
    "createdAt":      "2026-05-01T10:00:00.000Z"
  }
}`}
        </CodeBlock>
        <p className="text-[13px] text-ink-muted leading-relaxed">
          Use <IC>data.id</IC> as the idempotency key — store processed order IDs and short-circuit duplicate deliveries with a <IC>200</IC>.
          <IC>reference</IC> is the value you supplied on <IC>POST /orders</IC> (or <IC>null</IC> when omitted).
        </p>
      </section>

      <div className="rule-dotted" />

      {/* Signature verification */}
      <section className="space-y-5">
        <SectionHeading icon={<Lock size={17} />} title="Signature Verification" />
        <p className="text-[14px] text-ink-muted leading-relaxed">
          The signature is computed from <strong className="text-ink"><IC>{`${'`${timestamp}.${rawBody}`'}`}</IC></strong> — concatenated with a literal dot — and signed with your webhook secret (<IC>whsec_…</IC>).
          The header value is <IC>sha256=&lt;hex&gt;</IC>; strip the prefix before comparing. Always hash the <strong className="text-ink">raw request body</strong>, not a re-serialized JSON object.
        </p>

        <CodeBlock id="wh-verify-ts" copy={copy} copied={copied} lang="ts">
{`import crypto from 'crypto';
import express from 'express';

const app = express();
const TOLERANCE_SECONDS = 5 * 60;

// Raw body middleware — bodyParser.json() will discard the raw buffer.
app.post('/webhooks/weave', express.raw({ type: 'application/json' }), (req, res) => {
  const header    = (req.headers['x-weave-signature'] as string | undefined) ?? '';
  const timestamp = (req.headers['x-weave-timestamp'] as string | undefined) ?? '';
  const sig       = header.startsWith('sha256=') ? header.slice(7) : header;

  // Replay protection
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) {
    return res.status(401).send('Stale timestamp');
  }

  const expected = crypto
    .createHmac('sha256', process.env.WEAVE_WEBHOOK_SECRET!)
    .update(\`\${timestamp}.\${req.body.toString()}\`)
    .digest('hex');

  if (!sig || !crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
    return res.status(401).send('Invalid signature');
  }

  const { event, data } = JSON.parse(req.body.toString());

  if (event === 'order.completed') {
    await fulfillOrder(data.id);  // dedupe on data.id
  }

  res.json({ received: true });
});`}
        </CodeBlock>

        <CodeBlock id="wh-verify-py" copy={copy} copied={copied} lang="python">
{`import hmac, hashlib, os, time
from flask import Flask, request

app = Flask(__name__)
TOLERANCE_SECONDS = 5 * 60

@app.route('/webhooks/weave', methods=['POST'])
def weave_webhook():
    header    = request.headers.get('x-weave-signature', '')
    timestamp = request.headers.get('x-weave-timestamp', '')
    sig       = header[7:] if header.startswith('sha256=') else header

    if abs(time.time() - int(timestamp)) > TOLERANCE_SECONDS:
        return 'Stale timestamp', 401

    body     = request.get_data()
    secret   = os.environ['WEAVE_WEBHOOK_SECRET'].encode()
    signed   = f'{timestamp}.'.encode() + body
    expected = hmac.new(secret, signed, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(sig, expected):
        return 'Invalid signature', 401

    payload = request.get_json(force=True)
    if payload['event'] == 'order.completed':
        fulfill_order(payload['data']['id'])  # dedupe on data.id

    return {'received': True}`}
        </CodeBlock>
      </section>

      <div className="rule-dotted" />

      {/* Retries */}
      <section className="space-y-5">
        <SectionHeading icon={<ArrowRight size={17} />} title="Retry Behaviour" />
        <div className="bg-cream-soft rounded-[20px] border border-hair-soft overflow-hidden">
          {[
            { label: 'Transport',         value: 'QStash background queue' },
            { label: 'Trigger',           value: 'Non-2xx response or network timeout' },
            { label: 'Timeout per try',   value: '10 seconds' },
            { label: 'Idempotency key',   value: 'data.id (in body)' },
            { label: 'Sandbox',           value: 'Webhooks suppressed for sandbox orders' },
          ].map(({ label, value }, i, arr) => (
            <div key={label} className={`flex justify-between items-start gap-6 px-5 py-3.5 text-[13px] ${i < arr.length - 1 ? 'border-b border-hair-soft' : ''}`}>
              <span className="text-ink-muted shrink-0">{label}</span>
              <span className="text-ink font-medium text-right">{value}</span>
            </div>
          ))}
        </div>
        <p className="text-[13px] text-ink-muted leading-relaxed">
          QStash retries failed deliveries with exponential back-off until the configured retry count is exhausted. Dedupe with <IC>data.id</IC> on your side and return <IC>200</IC> immediately for repeats.
        </p>
        <div className="bg-forest/5 border border-forest/15 rounded-2xl px-5 py-4 text-[13px] text-forest-deep leading-relaxed">
          Use <strong className="text-forest-deep">Settings → Developer → Webhooks → Send test event</strong> to fire a real signed delivery against your endpoint with sample data.
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Security
// ─────────────────────────────────────────────────────────────────────────────

function SecurityPage({ copy, copied }: { copy: (id: string, text: string) => void; copied: string | null }) {
  return (
    <div className="space-y-12 pb-16 fade-up">
      <header>
        <h1 className="font-display text-[36px] font-semibold text-ink tracking-tight leading-tight">Security</h1>
        <p className="text-ink-muted mt-2 text-[15px] leading-relaxed">
          How Weave authenticates requests, signs webhooks, and isolates sandbox traffic. Designed for direct integration without a server-side SDK.
        </p>
      </header>

      <section className="space-y-5">
        <SectionHeading icon={<KeyRound size={18} />} title="API Key Types" />
        <div className="bg-cream-soft rounded-[20px] border border-hair-soft overflow-hidden">
          {[
            { tag: 'pk_live_…',  label: 'Publishable (live)',  hdr: 'x-api-key',                       use: 'Browser widget, public payment pages. Scoped to creating orders + reading your own resources. Never grants account read access.' },
            { tag: 'pk_test_…',  label: 'Publishable (test)',  hdr: 'x-api-key',                       use: 'Sandbox traffic. Orders auto-complete instantly, real providers are not called, and outgoing webhooks are suppressed.' },
            { tag: 'sk_live_…',  label: 'Secret',              hdr: 'x-public-key + x-secret-key',     use: 'Server-to-server only. Required for any flow that should not be possible from the browser. Sent alongside the matching publishable key as a pair; the server compares a hash, never the plaintext.' },
            { tag: 'whsec_…',    label: 'Webhook secret',      hdr: '— (used to sign deliveries)',     use: 'HMAC key for verifying incoming webhook deliveries. Rotate from Settings → Developer → Webhooks; the new value is shown exactly once.' },
          ].map(({ tag, label, hdr, use }, i, arr) => (
            <div key={tag} className={`px-5 py-4 ${i < arr.length - 1 ? 'border-b border-hair-soft' : ''} space-y-1.5`}>
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <code className="text-[13px] font-mono font-semibold text-forest-deep">{tag}</code>
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">{label}</span>
              </div>
              <p className="text-[12px] text-ink-muted"><span className="font-mono text-forest-deep">{hdr}</span></p>
              <p className="text-[13px] text-ink-muted leading-relaxed">{use}</p>
            </div>
          ))}
        </div>
        <CodeBlock id="sec-keypair" copy={copy} copied={copied} lang="bash">
{`# Server-only — uses the secret keypair (never expose either header in the browser).
curl https://api.paywithweave.com/api/v1/orders \\
  -H "x-public-key: pk_live_..." \\
  -H "x-secret-key: sk_live_..." \\
  -H "Content-Type: application/json"`}
        </CodeBlock>
      </section>

      <div className="rule-dotted" />

      <section className="space-y-5">
        <SectionHeading icon={<Shield size={18} />} title="Webhook Verification" />
        <p className="text-[14px] text-ink-muted leading-relaxed">
          Outgoing webhooks are signed with HMAC-SHA256 over <IC>{`${'`${timestamp}.${rawBody}`'}`}</IC>. Always verify the signature
          <strong className="text-ink"> before mutating any state</strong>, and reject deliveries whose timestamp is outside your tolerance window.
          See the full spec under <strong className="text-ink">Webhooks → Signature Verification</strong>.
        </p>
        <ul className="bg-cream-soft rounded-[20px] border border-hair-soft p-5 space-y-2.5 text-[13px] text-ink-muted">
          <li className="flex items-start gap-2.5"><Check size={14} className="text-forest mt-0.5 shrink-0" strokeWidth={2.4} /><span>Hash the <strong className="text-ink">raw body bytes</strong> — not a re-stringified JSON object. Any reformatting breaks the signature.</span></li>
          <li className="flex items-start gap-2.5"><Check size={14} className="text-forest mt-0.5 shrink-0" strokeWidth={2.4} /><span>Strip the <IC>sha256=</IC> prefix from <IC>X-Weave-Signature</IC> before comparing.</span></li>
          <li className="flex items-start gap-2.5"><Check size={14} className="text-forest mt-0.5 shrink-0" strokeWidth={2.4} /><span>Use <IC>crypto.timingSafeEqual</IC> (or equivalent) for the comparison to avoid timing leaks.</span></li>
          <li className="flex items-start gap-2.5"><Check size={14} className="text-forest mt-0.5 shrink-0" strokeWidth={2.4} /><span>Reject deliveries where <IC>X-Weave-Timestamp</IC> is older than ~5 minutes — protects against replay.</span></li>
          <li className="flex items-start gap-2.5"><Check size={14} className="text-forest mt-0.5 shrink-0" strokeWidth={2.4} /><span>Dedupe on <IC>data.id</IC> in your handler and return <IC>200</IC> for repeats.</span></li>
        </ul>
      </section>

      <div className="rule-dotted" />

      <section className="space-y-5">
        <SectionHeading icon={<Lock size={18} />} title="Provider Webhook Hardening" />
        <p className="text-[14px] text-ink-muted leading-relaxed">
          Inbound provider webhooks (Paystack, Paycrest, ChainRails) are HMAC-verified at the edge before any database write. The corresponding secret is required —
          if it is missing the route fails closed with a 401 rather than accepting unverified payloads.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { name: 'Paycrest',    sig: 'HMAC-SHA256(secret, rawBody)' },
            { name: 'ChainRails',  sig: 'HMAC-SHA256(secret, "${ts}.${rawBody}")' },
            { name: 'Paystack',    sig: 'HMAC-SHA512(secret, rawBody)' },
          ].map(({ name, sig }) => (
            <div key={name} className="bg-cream-soft border border-hair-soft rounded-[16px] p-4 space-y-1">
              <p className="text-[13px] font-semibold text-ink">{name}</p>
              <code className="text-[11px] font-mono text-ink-muted break-all">{sig}</code>
            </div>
          ))}
        </div>
      </section>

      <div className="rule-dotted" />

      <section className="space-y-5">
        <SectionHeading icon={<FlaskConical size={18} />} title="Sandbox Isolation" />
        <p className="text-[14px] text-ink-muted leading-relaxed">
          Sandbox keys (<IC>pk_test_…</IC>) live in a separate auth path. Sandbox orders are flagged on the order row and excluded from revenue metrics, list endpoints filter them by default, and outgoing merchant webhooks are suppressed for them.
          No real funds move under any circumstance.
        </p>
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl px-5 py-4 flex gap-3">
          <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" strokeWidth={2} />
          <p className="text-[13.5px] text-amber-900 leading-relaxed">
            Any request authenticated with <IC>pk_test_</IC> implicitly enables sandbox mode for that request. Mixing test and live keys in the same flow will produce mismatched orders that cannot be reconciled — pick one and stay there.
          </p>
        </div>
      </section>

      <div className="rule-dotted" />

      <section className="space-y-5">
        <SectionHeading icon={<AlertTriangle size={18} />} title="Reporting a Vulnerability" />
        <p className="text-[14px] text-ink-muted leading-relaxed">
          Suspected security issues should be reported privately to <a href="mailto:security@paywithweave.com" className="text-forest-deep underline underline-offset-2 font-semibold">security@paywithweave.com</a>.
          Please include reproduction steps and any proof-of-concept artefacts. We acknowledge within one business day and will not pursue good-faith research that respects the boundaries above.
        </p>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Support
// ─────────────────────────────────────────────────────────────────────────────

function SupportPage() {
  const channels = [
    { icon: <MessageSquare size={18} className="text-forest" strokeWidth={1.9} />, title: 'Open a support ticket', desc: 'Integration help, account issues, billing questions. Responses within one business day.', cta: 'Contact form', href: '/support' },
    { icon: <Bell size={18} className="text-forest" strokeWidth={1.9} />,           title: 'Status & incidents',    desc: 'Subscribe to provider incidents that affect Paystack, Paycrest, ChainRails, and NEAR Intents corridors.', cta: 'status@paywithweave.com', href: 'mailto:status@paywithweave.com' },
    { icon: <Shield size={18} className="text-forest" strokeWidth={1.9} />,         title: 'Security disclosures',  desc: 'Private channel for vulnerability reports. Do not file these as regular tickets.', cta: 'security@paywithweave.com', href: 'mailto:security@paywithweave.com' },
    { icon: <KeyRound size={18} className="text-forest" strokeWidth={1.9} />,       title: 'Custom corridor',       desc: 'Need a chain, token, or fiat rail Weave does not currently route? Tell us about your volume and we will scope it.', cta: 'partners@paywithweave.com', href: 'mailto:partners@paywithweave.com' },
  ];

  const faqs = [
    {
      q: 'My webhook signature does not match — what changed?',
      a: 'Most often: middleware re-serialised the JSON body before you hashed it. Hash the raw bytes. Also confirm you are concatenating "{timestamp}.{rawBody}" (with a literal dot) and stripping the "sha256=" prefix from the header.',
    },
    {
      q: 'Order is stuck in awaiting_deposit',
      a: 'GET /orders/:id forces a live sync against the active provider — call it once before raising a ticket. If the order is still stuck after 10 minutes past the corridor SLA, file a support ticket with the order ID.',
    },
    {
      q: 'I rotated my secret key — old integrations stopped working',
      a: 'That is expected. Rotation invalidates the previous secret immediately. Update every server that signs requests, then re-deploy. The publishable key is unaffected.',
    },
    {
      q: 'Can I change a settled order?',
      a: 'No. Once an order reaches completed the route is finalised and the funds have left Weave. Refunds must be issued out-of-band by you to the customer.',
    },
    {
      q: 'Why is my sandbox order missing from /orders?',
      a: 'List endpoints filter on the auth context. Sandbox orders only show when the same /orders call is authenticated with pk_test_ — switch keys (or pass the sandbox key) to see them.',
    },
  ];

  return (
    <div className="space-y-12 pb-16 fade-up">
      <header>
        <h1 className="font-display text-[36px] font-semibold text-ink tracking-tight leading-tight">Support</h1>
        <p className="text-ink-muted mt-2 text-[15px] leading-relaxed">
          The fastest path to an answer depends on the question. Pick the right channel below — and check the FAQ first; most integration issues are covered there.
        </p>
      </header>

      <section className="space-y-5">
        <SectionHeading icon={<MessageSquare size={18} />} title="Channels" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {channels.map(({ icon, title, desc, cta, href }) => (
            <a key={title} href={href} className="group bg-cream-soft border border-hair-soft hover:border-forest/25 rounded-[20px] p-5 transition-all flex flex-col gap-3">
              <div className="flex items-center gap-2.5">{icon}<p className="font-display text-[15px] font-semibold text-ink">{title}</p></div>
              <p className="text-[13px] text-ink-muted leading-relaxed flex-1">{desc}</p>
              <span className="text-[12.5px] font-semibold text-forest-deep group-hover:underline underline-offset-2 inline-flex items-center gap-1.5">
                {cta} <ArrowRight size={13} strokeWidth={2.2} />
              </span>
            </a>
          ))}
        </div>
      </section>

      <div className="rule-dotted" />

      <section className="space-y-5">
        <SectionHeading icon={<Info size={18} />} title="FAQ" />
        <div className="bg-cream-soft rounded-[20px] border border-hair-soft overflow-hidden">
          {faqs.map(({ q, a }, i, arr) => (
            <div key={q} className={`px-5 py-4 ${i < arr.length - 1 ? 'border-b border-hair-soft' : ''} space-y-1.5`}>
              <p className="text-[13.5px] font-semibold text-ink">{q}</p>
              <p className="text-[13px] text-ink-muted leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="rule-dotted" />

      <section className="space-y-3">
        <SectionHeading icon={<Terminal size={18} />} title="Before you file a ticket" />
        <ul className="bg-cream-soft rounded-[20px] border border-hair-soft p-5 space-y-2.5 text-[13px] text-ink-muted">
          <li className="flex items-start gap-2.5"><Check size={14} className="text-forest mt-0.5 shrink-0" strokeWidth={2.4} /><span>Include the <strong className="text-ink">order ID</strong> (and reference if you set one).</span></li>
          <li className="flex items-start gap-2.5"><Check size={14} className="text-forest mt-0.5 shrink-0" strokeWidth={2.4} /><span>Note whether you are on <IC>pk_live_</IC> or <IC>pk_test_</IC>.</span></li>
          <li className="flex items-start gap-2.5"><Check size={14} className="text-forest mt-0.5 shrink-0" strokeWidth={2.4} /><span>Try <IC>GET /orders/:id</IC> once — it forces a live sync and may resolve the issue.</span></li>
          <li className="flex items-start gap-2.5"><Check size={14} className="text-forest mt-0.5 shrink-0" strokeWidth={2.4} /><span>For webhook problems, attach the request headers and raw body received by your endpoint.</span></li>
        </ul>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared components
// ─────────────────────────────────────────────────────────────────────────────

type Param = { name: string; type: string; req: boolean; desc: string };
type EndpointDef = { method: string; path: string; summary: string; params: Param[]; request: string; response: string };

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-3 pt-5 pb-1.5 text-[10px] font-bold text-ink-faint uppercase tracking-widest">{label}</p>
      {children}
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] transition-all ${
        active
          ? 'bg-forest text-cream-soft font-semibold shadow-leaf'
          : 'text-ink-muted hover:bg-cream-deep/60 hover:text-ink'
      }`}
    >
      <span className={active ? 'text-cream-soft' : 'text-ink-faint'}>{icon}</span>
      {label}
    </button>
  );
}

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5 text-forest-deep">
      {icon}
      <h2 className="font-display text-[24px] font-semibold text-ink">{title}</h2>
    </div>
  );
}

function IC({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-cream-deep px-1.5 py-0.5 rounded-md text-forest-deep font-mono text-[12px]">
      {children}
    </code>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-bold text-ink-soft uppercase tracking-widest">{children}</span>;
}

function MethodBadge({ method }: { method: string }) {
  const styles: Record<string, string> = {
    GET:    'bg-cream-deep text-ink-soft',
    POST:   'bg-forest/10 text-forest-deep',
    PATCH:  'bg-tan/15 text-tan-deep',
    PUT:    'bg-tan/15 text-tan-deep',
    DELETE: 'bg-red-50 text-red-600',
  };
  return (
    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md shrink-0 ${styles[method] ?? 'bg-cream-deep text-ink-soft'}`}>
      {method}
    </span>
  );
}

function PropsTable({ title, rows }: { title: string; rows: Param[] }) {
  return (
    <div className="bg-cream-soft rounded-[20px] border border-hair-soft overflow-hidden shadow-leaf">
      <div className="px-5 py-3 border-b border-hair-soft">
        <code className="text-[13px] font-mono font-semibold text-ink">{title}</code>
      </div>
      {rows.map(({ name, type, req, desc }, i, arr) => (
        <div key={name} className={`flex items-start gap-4 px-5 py-4 ${i < arr.length - 1 ? 'border-b border-hair-soft' : ''}`}>
          <div className="min-w-[160px] shrink-0">
            <code className="text-[12.5px] font-mono font-semibold text-forest-deep">{name}</code>
            {req
              ? <span className="ml-2 text-[9.5px] font-bold text-tan-deep uppercase tracking-wide">required</span>
              : <span className="ml-2 text-[9.5px] font-semibold text-ink-faint uppercase tracking-wide">optional</span>}
          </div>
          <div className="flex-1">
            <p className="text-[11.5px] font-mono text-ink-muted mb-1">{type}</p>
            <p className="text-[12.5px] text-ink-muted leading-relaxed">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CodeBlock({
  children, lang, id, copy, copied, light = false,
}: {
  children: string;
  lang: string;
  id: string;
  copy: (id: string, text: string) => void;
  copied: string | null;
  light?: boolean;
}) {
  return (
    <div className={`relative rounded-[20px] border overflow-x-auto ${light ? 'bg-cream-deep/40 border-hair-soft' : 'bg-ink border-cream-soft/5'}`}>
      <div className={`flex justify-between items-center px-5 py-3 border-b ${light ? 'border-hair-soft' : 'border-cream-soft/5'}`}>
        <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${light ? 'text-ink-faint' : 'text-cream-soft/30'}`}>{lang}</span>
        <button
          onClick={() => copy(id, children.trim())}
          className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors px-2 py-1 rounded-lg ${
            light ? 'text-ink-muted hover:bg-cream-deep hover:text-ink' : 'text-cream-soft/40 hover:bg-cream-soft/8 hover:text-cream-soft'
          }`}
        >
          {copied === id
            ? <><Check size={11} className="text-forest" /> Copied</>
            : <><Copy size={11} /> Copy</>}
        </button>
      </div>
      <pre className={`p-5 text-[12.5px] font-mono leading-[1.65] whitespace-pre-wrap break-words ${light ? 'text-ink-soft' : 'text-tan-soft'}`}>
        <code>{children.trim()}</code>
      </pre>
    </div>
  );
}
