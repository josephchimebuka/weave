'use client';

import { useState } from 'react';
import {
  FileText, Code, Globe, Zap, Shield, Bell, Layers, Terminal,
  Check, Copy, ChevronDown, Network, GitBranch,
} from 'lucide-react';

type DocTab = 'html' | 'react' | 'nextjs' | 'api';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<DocTab>('html');
  const [openEndpoint, setOpenEndpoint] = useState<string | null>(null);

  const scrollToIntegration = (tab: DocTab) => {
    setActiveTab(tab);
    document.getElementById('widget-integration')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-14 pb-24">

      {/* Hero */}
      <div className="fade-up pt-4">
        <div className="inline-flex items-center gap-2 text-[12px] font-semibold text-forest bg-forest/8 px-3 py-1.5 rounded-full mb-5 border border-forest/15">
          <FileText size={11} /> Integration Guide
        </div>
        <h1 className="font-display text-[48px] font-semibold text-ink tracking-tight leading-tight">
          Accept any currency,<br />settle anywhere.
        </h1>
        <p className="text-ink-muted text-[17px] mt-4 max-w-2xl leading-relaxed">
          Weave lets your customers pay in crypto or fiat. You receive NGN to your bank account or USDC to a wallet — no manual conversion required.
        </p>
      </div>

      {/* Quick-start cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 fade-up" style={{ animationDelay: '80ms' }}>
        <DocCard icon={<Zap className="text-forest" size={18} />} title="2-Minute Setup" description="One script tag. No build step required." onClick={() => scrollToIntegration('html')} />
        <DocCard icon={<Layers className="text-forest" size={18} />} title="React + Next.js" description="First-class component with full TypeScript." onClick={() => scrollToIntegration('nextjs')} />
        <DocCard icon={<Terminal className="text-forest" size={18} />} title="REST API" description="Server-side orders and programmatic control." onClick={() => scrollToIntegration('api')} />
        <DocCard icon={<Network className="text-forest" size={18} />} title="Payment Corridors" description="ChainRails, NEAR Intents, Paycrest, Paystack." onClick={() => document.getElementById('payment-corridors')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
      </div>

      {/* Settlement note */}
      <div className="bg-forest/5 border border-forest/15 rounded-2xl px-5 py-4 text-[13.5px] text-forest-deep leading-relaxed fade-up" style={{ animationDelay: '120ms' }}>
        <strong>Settlement times:</strong> NGN bank payments via Paystack settle <strong>T+1 business day</strong>. Crypto-sourced NGN payments (customer pays ETH/USDC → you receive NGN) settle in <strong>30 s – 2 min</strong> via Paycrest. Crypto wallet payouts are near-instant.
      </div>

      {/* Asset Key primer */}
      <div className="bg-cream-soft border border-hair-soft rounded-2xl px-5 py-4 fade-up" style={{ animationDelay: '140ms' }}>
        <p className="text-[11px] font-semibold text-ink-soft uppercase tracking-widest mb-3">Asset Key Format</p>
        <p className="text-[13.5px] text-ink-muted mb-4 leading-relaxed">
          Every asset in Weave uses a canonical <code className="bg-cream-deep px-1.5 py-0.5 rounded text-forest-deep font-mono text-[12px]">crypto:CHAIN:TOKEN</code> or <code className="bg-cream-deep px-1.5 py-0.5 rounded text-forest-deep font-mono text-[12px]">fiat:CCY</code> identifier. Chain and token are always uppercase.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4">
          {[
            ['fiat:NGN',         'Nigerian Naira'],
            ['crypto:BASE:USDC', 'USDC on Base'],
            ['crypto:ETH:USDC',  'USDC on Ethereum'],
            ['crypto:ETH:ETH',   'Ether on Ethereum'],
            ['crypto:ARB:USDC',  'USDC on Arbitrum'],
            ['crypto:SOL:SOL',   'SOL on Solana'],
          ].map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <code className="text-[11.5px] font-mono text-forest-deep bg-cream-deep px-2 py-0.5 rounded shrink-0">{key}</code>
              <span className="text-[11.5px] text-ink-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Widget Integration tabs */}
      <section id="widget-integration" className="space-y-6 fade-up" style={{ animationDelay: '160ms' }}>
        <h2 className="font-display text-[28px] font-semibold text-ink">Widget Integration</h2>

        <div className="flex items-center gap-1 p-1 bg-cream-deep/50 rounded-2xl border border-hair-soft w-fit overflow-x-auto">
          {(['html', 'react', 'nextjs', 'api'] as DocTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-[13.5px] font-medium transition-all ${
                activeTab === tab
                  ? 'bg-cream-soft text-forest-deep shadow-leaf'
                  : 'text-ink-muted hover:text-ink-soft'
              }`}
            >
              {tab === 'html' ? 'HTML / JS' : tab === 'api' ? 'REST API' : tab === 'nextjs' ? 'Next.js' : 'React'}
            </button>
          ))}
        </div>

        <div className="bg-ink rounded-[32px] p-8 md:p-10 text-cream-soft overflow-hidden shadow-leaf-lg relative group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-forest/10 blur-[120px] pointer-events-none group-hover:bg-forest/15 transition-all" />
          <div className="relative z-10 space-y-6">

            {activeTab === 'html' && (
              <div className="fade-in space-y-5">
                <SectionLabel icon={<Globe size={13} />} label="HTML / Vanilla JS" />
                <p className="text-[14.5px] text-cream-soft/70 leading-relaxed">
                  Drop two tags into any page. Your publishable key is on the <strong className="text-cream-soft/90">Developer</strong> tab in Settings.
                </p>
                <CodeBlock language="html">{`<div id="weave-checkout"></div>

<script src="https://unpkg.com/@weave/widget/dist/umd.js"></script>
<script>
  Weave.mount('#weave-checkout', {
    apiKey:       'pk_live_...',
    theme:        'organic',      // 'organic' | 'minimal'
    accentColor:  'forest',       // 'forest' | 'tan' | any hex, e.g. '#0F5D4C'
    borderRadius: 16,
    merchant: {
      name:        'Acme Store',
      amount:      5000,
      currency:    'NGN',
      description: 'Order #1042',
      // amountIn: 'dest'  — customer pays whatever crypto covers this exact NGN amount
      // sourceAssetKey: 'crypto:ETH:USDC'  — lock the payer's asset
      // destAssetKey:   'fiat:NGN'         — lock the settlement asset
    },
    onSuccess: (txn) => console.log('Order complete', txn.orderId, txn.status),
    onError:   (err) => console.error(err.message),
    onClose:   ()    => console.log('Widget closed'),
  });
</script>`}</CodeBlock>
              </div>
            )}

            {activeTab === 'react' && (
              <div className="fade-in space-y-5">
                <SectionLabel icon={<Code size={13} />} label="React" />
                <CodeBlock language="bash">{`npm install @weave/widget`}</CodeBlock>
                <CodeBlock language="tsx">{`import { WeaveCheckout } from '@weave/widget';

export default function CheckoutPage() {
  return (
    <WeaveCheckout
      apiKey="pk_live_..."
      theme="organic"         // 'organic' | 'minimal'
      accentColor="forest"    // 'forest' | 'tan' | any hex colour
      borderRadius={16}
      merchant={{
        name:        'Acme Store',
        amount:      5000,
        currency:    'NGN',
        description: 'Order #1042',
        // amountIn: 'dest' — exact NGN the merchant receives; customer pays the crypto equivalent
        // sourceAssetKey: 'crypto:ETH:USDC' — pre-lock the payer's asset
        // destAssetKey:   'fiat:NGN'         — pre-lock the settlement asset
      }}
      onSuccess={(txn) => fulfillOrder(txn.orderId)}
      onError={(err)   => showError(err.message)}
      onClose={()      => setShowCheckout(false)}
    />
  );
}`}</CodeBlock>
              </div>
            )}

            {activeTab === 'nextjs' && (
              <div className="fade-in space-y-5">
                <SectionLabel icon={<Zap size={13} />} label="Next.js (App Router)" />
                <p className="text-[14.5px] text-cream-soft/70 leading-relaxed">
                  The widget accesses <code>window</code> and wallet APIs, so it must be a client component or lazy-loaded with <code>ssr: false</code>.
                </p>
                <CodeBlock language="tsx">{`'use client';

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
      accentColor="forest"
      borderRadius={16}
      merchant={{
        name:        'Acme Store',
        amount:      5000,
        currency:    'NGN',
        description: 'Order #1042',
      }}
      onSuccess={(txn) => console.log('Paid:', txn.orderId)}
      onError={(err)   => console.error(err.message)}
      onClose={()      => router.back()}
    />
  );
}`}</CodeBlock>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="fade-in space-y-6">
                <SectionLabel icon={<Terminal size={13} />} label="REST API — Core Workflow" />
                <p className="text-[14.5px] text-cream-soft/70 leading-relaxed">
                  Use your <strong className="text-cream-soft/90">API key</strong> (<code>x-api-key</code>) for server-side requests. Never expose secret keys in client code.
                </p>

                <p className="text-[11px] font-semibold text-cream-soft/40 uppercase tracking-widest">Step 1 — Get a Quote</p>
                <CodeBlock language="bash">{`curl "https://api.paywithweave.com/api/v1/quotes?from=crypto:ETH:USDC&to=fiat:NGN&amount=50" \\
  -H "x-api-key: pk_live_..."`}</CodeBlock>
                <CodeBlock language="json">{`{
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
        { "provider": "nearintents", "fromAsset": "crypto:ETH:USDC", "toAsset": "crypto:BASE:USDC", "expectedFeeBps": 25,  "expectedSecs": 90 },
        { "provider": "paycrest",    "fromAsset": "crypto:BASE:USDC", "toAsset": "fiat:NGN",         "expectedFeeBps": 85,  "expectedSecs": 90 }
      ],
      "totalExpectedFeeBps": 110,
      "totalExpectedSecs":   180
    }
  }
}`}</CodeBlock>

                <p className="text-[11px] font-semibold text-cream-soft/40 uppercase tracking-widest">Step 2a — Create Order (External Flow — NEAR Intents)</p>
                <p className="text-[13px] text-cream-soft/60 leading-relaxed">Default. Generates a deposit address — customer sends from any wallet.</p>
                <CodeBlock language="bash">{`curl https://api.paywithweave.com/api/v1/orders \\
  -X POST -H "x-api-key: pk_live_..." -H "Content-Type: application/json" \\
  -d '{
    "source": {
      "inline": {
        "kind":          "crypto_wallet",
        "assetKey":      "crypto:ETH:USDC",
        "walletAddress": "0xCustomerWallet"
      }
    },
    "amount":        50,
    "flow":          "external",
    "refundAddress": "0xCustomerWallet"
  }'`}</CodeBlock>
                <CodeBlock language="json">{`{
  "data": {
    "order": { "id": "ord_abc123", "status": "awaiting_deposit", "sourceAmount": 50.38 },
    "nextAction": {
      "screen":         "collect_crypto",
      "depositAddress": "0xNEARIntentsDepositAddress",
      "depositMemo":    null,
      "amount":         50.38,
      "token":          "USDC",
      "chain":          "ETHEREUM"
    }
  }
}`}</CodeBlock>

                <p className="text-[11px] font-semibold text-cream-soft/40 uppercase tracking-widest">Step 2b — Create Order (Self Flow — ChainRails Connected Wallet)</p>
                <p className="text-[13px] text-cream-soft/60 leading-relaxed">EVM only. The customer signs from their connected wallet — no deposit address copy-paste required. Lower fee (0.15 %) and faster (~60 s).</p>
                <CodeBlock language="bash">{`curl https://api.paywithweave.com/api/v1/orders \\
  -X POST -H "x-api-key: pk_live_..." -H "Content-Type: application/json" \\
  -d '{
    "source": {
      "inline": {
        "kind":          "crypto_wallet",
        "assetKey":      "crypto:ETH:USDC",
        "walletAddress": "0xConnectedWallet"
      }
    },
    "amount": 50,
    "flow":   "self"
  }'`}</CodeBlock>
                <CodeBlock language="json">{`{
  "data": {
    "order": { "id": "ord_xyz789", "status": "awaiting_deposit", "sourceAmount": 50.15 },
    "nextAction": {
      "screen":         "collect_crypto",
      "depositAddress": "0xChainRailsIntentContractAddress",
      "amount":         50.15,
      "token":          "USDC",
      "chain":          "ETHEREUM"
    }
  }
}`}</CodeBlock>

                <p className="text-[11px] font-semibold text-cream-soft/40 uppercase tracking-widest">Step 3 — Poll Order Status</p>
                <CodeBlock language="bash">{`curl https://api.paywithweave.com/api/v1/orders/ord_abc123 \\
  -H "x-api-key: pk_live_..."`}</CodeBlock>
                <CodeBlock language="json">{`{
  "data": {
    "id":     "ord_abc123",
    "status": "completed",
    "steps": [
      { "sequence": 0, "provider": "nearintents", "status": "done", "depositAddress": "0x..." },
      { "sequence": 1, "provider": "paycrest",    "status": "done" }
    ]
  }
}`}</CodeBlock>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* Props reference */}
      <section className="space-y-5 fade-up" style={{ animationDelay: '185ms' }}>
        <h2 className="font-display text-[28px] font-semibold text-ink">Widget Props</h2>

        <div className="space-y-4">
          {/* WeaveCheckout props */}
          <div className="bg-cream-soft rounded-[24px] border border-hair-soft overflow-hidden shadow-leaf">
            <div className="px-6 py-3 border-b border-hair-soft">
              <p className="text-[13px] font-semibold text-ink font-mono">WeaveCheckout</p>
            </div>
            {[
              { prop: 'apiKey',       type: 'string',                     req: false, desc: 'Your publishable key (pk_live_… or pk_test_…). Falls back to window.__WEAVE_API_KEY__ or the VITE_WEAVE_PUBLIC_KEY env var.' },
              { prop: 'merchant',     type: 'Merchant',                   req: false, desc: 'Payment context passed to the widget. See Merchant props below.' },
              { prop: 'theme',        type: '"organic" | "minimal"',      req: false, desc: 'Visual theme. organic (default) uses soft curves and a warmer palette; minimal is flatter.' },
              { prop: 'accentColor',  type: 'string',                     req: false, desc: 'Brand accent. Pass "forest" | "tan" or any hex value (e.g. "#0F5D4C"). Controls buttons, highlights, and the receipt.' },
              { prop: 'borderRadius', type: 'number',                     req: false, desc: 'Corner radius of the widget frame in px. Default: 16.' },
              { prop: 'userAddress',  type: 'string',                     req: false, desc: 'Pre-fill a connected wallet address. Useful when your app already manages the wallet connection.' },
              { prop: 'apiBase',      type: 'string',                     req: false, desc: 'Override the API base URL. Useful for proxying through your own backend or testing against a local server.' },
              { prop: 'onSuccess',    type: '(txn) => void',              req: false, desc: 'Called when the order reaches completed status. txn contains orderId and status.' },
              { prop: 'onError',      type: '(err: Error) => void',       req: false, desc: 'Called on any unrecoverable error (order creation failure, provider error, etc.).' },
              { prop: 'onClose',      type: '() => void',                 req: false, desc: 'Called when the user dismisses the widget without completing payment.' },
            ].map(({ prop, type, req, desc }, i, arr) => (
              <div key={prop} className={`flex items-start gap-4 px-6 py-4 ${i < arr.length - 1 ? 'border-b border-hair-soft' : ''}`}>
                <div className="min-w-[180px] shrink-0">
                  <code className="text-[12.5px] font-mono font-semibold text-forest-deep">{prop}</code>
                  {!req && <span className="ml-2 text-[10px] font-semibold text-ink-faint uppercase tracking-wide">optional</span>}
                </div>
                <div className="flex-1">
                  <p className="text-[11.5px] font-mono text-ink-soft mb-1">{type}</p>
                  <p className="text-[12.5px] text-ink-muted leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Merchant props */}
          <div className="bg-cream-soft rounded-[24px] border border-hair-soft overflow-hidden shadow-leaf">
            <div className="px-6 py-3 border-b border-hair-soft">
              <p className="text-[13px] font-semibold text-ink font-mono">Merchant</p>
            </div>
            {[
              { prop: 'name',           type: 'string',                              req: true,  desc: 'Your business or store name, shown to the payer throughout the checkout.' },
              { prop: 'amount',         type: 'number',                              req: true,  desc: 'Payment amount, denominated in currency (or in the dest asset when amountIn is "dest").' },
              { prop: 'currency',       type: 'string',                              req: true,  desc: 'ISO 4217 code for the settlement currency, e.g. "NGN".' },
              { prop: 'description',    type: 'string',                              req: false, desc: 'Order description shown in the widget and printed on the receipt.' },
              { prop: 'amountIn',       type: '"source" | "dest"',                  req: false, desc: '"source" (default) — amount is what the customer deposits. "dest" — amount is what you receive exactly; the customer pays the crypto equivalent including all fees.' },
              { prop: 'sourceAssetKey', type: 'string',                              req: false, desc: 'Lock the payer to a specific asset, e.g. "crypto:ETH:USDC". When omitted the widget lets the customer choose.' },
              { prop: 'destAssetKey',   type: 'string',                              req: false, desc: 'Lock the settlement destination asset, e.g. "fiat:NGN". Overrides your configured default payout instrument.' },
              { prop: 'destInstrument', type: 'InlineBankInstrument | InlineWalletInstrument', req: false, desc: 'Explicit payout instrument for this order. Overrides both destAssetKey and the merchant default.' },
            ].map(({ prop, type, req, desc }, i, arr) => (
              <div key={prop} className={`flex items-start gap-4 px-6 py-4 ${i < arr.length - 1 ? 'border-b border-hair-soft' : ''}`}>
                <div className="min-w-[180px] shrink-0">
                  <code className="text-[12.5px] font-mono font-semibold text-forest-deep">{prop}</code>
                  {req
                    ? <span className="ml-2 text-[10px] font-bold text-terracotta-deep uppercase tracking-wide">required</span>
                    : <span className="ml-2 text-[10px] font-semibold text-ink-faint uppercase tracking-wide">optional</span>}
                </div>
                <div className="flex-1">
                  <p className="text-[11.5px] font-mono text-ink-soft mb-1">{type}</p>
                  <p className="text-[12.5px] text-ink-muted leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Corridors */}
      <section id="payment-corridors" className="space-y-6 fade-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center gap-3">
          <Network className="text-forest" size={22} />
          <h2 className="font-display text-[28px] font-semibold text-ink">Payment Corridors</h2>
        </div>
        <p className="text-[15px] text-ink-muted leading-relaxed -mt-2">
          Weave automatically selects the right provider based on the source/destination asset pair and the <code className="bg-cream-deep px-1.5 py-0.5 rounded text-forest-deep font-mono text-[12px]">flow</code> parameter. The routing engine finds the shortest valid path using BFS across provider edges — up to 3 hops.
        </p>

        <div className="space-y-4">
          <ProviderCard
            name="Paystack"
            badge="NGN → NGN"
            badgeColor="bg-tan/15 text-tan-deep"
            flow="external"
            settlement="T+1 business day"
            fee="~1.5%"
            description="Handles direct Nigerian Naira bank-to-bank transfers. The customer completes payment via a Paystack-hosted popup (bank transfer or card). Your configured NGN bank account receives funds the next business day."
            trigger="Automatically selected when both source and destination are fiat:NGN. Pass flow: &quot;external&quot; (the default). The nextAction contains a Paystack access_code — the widget opens the popup using it."
            assetKey="fiat:NGN → fiat:NGN"
          />
          <ProviderCard
            name="NEAR Intents"
            badge="30+ chains"
            badgeColor="bg-forest/10 text-forest-deep"
            flow='"external" (default)'
            settlement="30 – 90 seconds"
            fee="built into rate"
            description="Handles cross-chain swaps from ~30 supported chains to USDC on Base. A deposit address is generated — the customer sends from any wallet, anywhere. Used as the first hop before Paycrest settles funds to fiat."
            trigger="Selected on crypto→fiat or crypto→USDC paths when flow: &quot;external&quot;. The widget shows the nextAction.depositAddress. For chains that require a memo (XRP, TON, XLM, NEAR native), nextAction.depositMemo will be non-null."
            assetKey="crypto:*:* → crypto:BASE:USDC"
          />
          <ProviderCard
            name="ChainRails"
            badge="EVM Connected Wallet"
            badgeColor="bg-ink/8 text-ink-soft"
            flow='"self"'
            settlement="~60 seconds"
            fee="built into rate"
            description="Bridges EVM tokens (USDC, USDT, ETH, DAI, BNB) from any supported EVM chain (Ethereum, Arbitrum, Optimism, Polygon, BSC, Avalanche, Base) to USDC on Base. The customer signs the transaction directly from their connected wallet — no deposit address copy-paste. Lower fee and faster than NEAR Intents for EVM sources."
            trigger="Selected by passing flow: &quot;self&quot; on POST /orders with an EVM source asset. The nextAction.depositAddress is the ChainRails intent contract address the wallet sends to."
            assetKey="crypto:EVM:* → crypto:BASE:USDC"
          />
          <ProviderCard
            name="Paycrest"
            badge="USDC ↔ Fiat"
            badgeColor="bg-forest/10 text-forest-deep"
            flow="automatic"
            settlement="30 seconds – 2 minutes"
            fee="built into rate"
            description="Handles the crypto↔fiat conversion leg. For offramps (crypto → fiat) it receives USDC on Base and pushes NGN to your bank account. For onramps (fiat → crypto) it receives the customer's local payment and releases USDC on Base. Always used as the terminal fiat settlement hop — you do not select it directly."
            trigger="Automatically selected whenever a route touches fiat. No flow parameter controls Paycrest; it is always the settlement provider for fiat corridors."
            assetKey="crypto:BASE:USDC ↔ fiat:NGN"
          />
        </div>

        {/* flow parameter box */}
        <div className="bg-ink rounded-[28px] p-7 shadow-leaf-lg space-y-4">
          <SectionLabel icon={<GitBranch size={13} />} label="The flow Parameter" />
          <p className="text-[13.5px] text-cream-soft/70 leading-relaxed">
            Pass <code className="text-cream-soft/90">flow</code> on <code className="text-cream-soft/90">POST /orders</code> to choose the cross-chain bridge. Defaults to <code className="text-cream-soft/90">"external"</code>.
          </p>
          <CodeBlock language="json">{`// flow: "external"  →  NEAR Intents
//   Customer sends to a deposit address from any wallet on any supported chain.
//   Works for 30+ chains. Good when you don't control the payer's wallet.
{
  "source": { "inline": { "kind": "crypto_wallet", "assetKey": "crypto:SOL:SOL", "walletAddress": "..." } },
  "amount": 50,
  "flow":   "external"
}

// flow: "self"  →  ChainRails
//   Customer signs directly from a connected EVM wallet.
//   EVM chains only. Lower fee (0.15 %) and faster (~60 s) than NEAR Intents.
{
  "source": { "inline": { "kind": "crypto_wallet", "assetKey": "crypto:ETH:USDC", "walletAddress": "0x..." } },
  "amount": 50,
  "flow":   "self"
}`}</CodeBlock>
        </div>
      </section>

      {/* API Reference */}
      <section className="space-y-5 fade-up" style={{ animationDelay: '220ms' }}>
        <h2 className="font-display text-[28px] font-semibold text-ink">API Reference</h2>
        <p className="text-[15px] text-ink-muted leading-relaxed -mt-2">
          Base URL: <code className="bg-cream-deep px-1.5 py-0.5 rounded-md text-forest-deep font-mono text-[12px]">https://api.paywithweave.com/api/v1</code>. Authenticate with <code className="bg-cream-deep px-1.5 py-0.5 rounded-md text-forest-deep font-mono text-[12px]">x-api-key: pk_live_...</code> on every request.
        </p>

        <div className="space-y-2">
          {[
            {
              method: 'GET',
              path: '/quotes',
              summary: 'Live exchange rate and fee breakdown for any asset pair',
              params: [
                { name: 'from',     type: 'string',           req: true,  desc: 'Source asset key — e.g. crypto:ETH:USDC' },
                { name: 'to',       type: 'string',           req: true,  desc: 'Destination asset key — e.g. fiat:NGN' },
                { name: 'amount',   type: 'number',           req: true,  desc: 'Amount in source asset (or dest asset when amountIn=dest)' },
                { name: 'amountIn', type: '"source" | "dest"', req: false, desc: 'Whether amount is source- or dest-denominated. Default: source' },
              ],
              response: `{
  "data": {
    "estimatedDest": 74250.00,   // amount the recipient will receive
    "breakdown": {
      "usdEquivalent": 50,       // source value in USD
      "sourceAmount":  50,       // deposit amount for the customer
      "senderFeeUsd":  0.375,    // Paycrest / Paystack cut (SENDER_FEE_BPS)
      "appFeeUsd":     0.05,     // Weave platform fee (APP_FEE_BPS)
      "bridgeFeeUsd":  0.10,     // bridge / swap spread
      "netUsd":        49.475,   // after all deductions
      "sellRate":      1500.00,  // NGN per USDC (null for crypto→crypto)
      "buyRate":       null
    },
    "route": {
      "steps": [
        { "provider": "nearintents", "fromAsset": "crypto:ETH:USDC", "toAsset": "crypto:BASE:USDC", "expectedFeeBps": 25, "expectedSecs": 90 },
        { "provider": "paycrest",    "fromAsset": "crypto:BASE:USDC", "toAsset": "fiat:NGN",         "expectedFeeBps": 85, "expectedSecs": 90 }
      ],
      "totalExpectedFeeBps": 110,
      "totalExpectedSecs":   180
    }
  }
}`,
            },
            {
              method: 'POST',
              path: '/orders',
              summary: 'Create a payment order and receive nextAction for the widget',
              params: [
                { name: 'source',                     type: 'InstrumentRef',      req: true,  desc: 'Source instrument — see InstrumentRef below' },
                { name: 'source.inline.kind',         type: '"crypto_wallet" | "bank_account"', req: true, desc: 'Type of the source instrument' },
                { name: 'source.inline.assetKey',     type: 'string',             req: true,  desc: 'Asset key, e.g. crypto:ETH:USDC or fiat:NGN' },
                { name: 'source.inline.walletAddress',type: 'string',             req: false, desc: 'Customer wallet address (crypto only)' },
                { name: 'amount',                     type: 'number',             req: true,  desc: 'Payment amount in source units (unless amountIn=dest)' },
                { name: 'amountIn',                   type: '"source" | "dest"',  req: false, desc: 'Whether amount is source- or dest-denominated. Default: source' },
                { name: 'flow',                       type: '"external" | "self"',req: false, desc: 'Bridge provider. "external" = NEAR Intents (deposit address, any chain). "self" = ChainRails (connected wallet, EVM only). Default: external' },
                { name: 'refundAddress',              type: 'string',             req: false, desc: 'Customer wallet to receive a refund on failure (crypto source). Defaults to walletAddress' },
                { name: 'reference',                  type: 'string',             req: false, desc: 'Your unique order ID for idempotent creation — returns HTTP 409 if a matching order already exists' },
                { name: 'dest',                       type: 'InstrumentRef',      req: false, desc: 'Override the payout destination. Defaults to your merchant default payout instrument' },
              ],
              response: `{
  "data": {
    "order": {
      "id":             "ord_abc123",
      "status":         "awaiting_deposit",
      "sourceAmount":   50.38,
      "destAmount":     74250.00,
      "sourceAssetKey": "crypto:ETH:USDC",
      "destAssetKey":   "fiat:NGN",
      "senderFeeUsd":   0.375,
      "appFeeUsd":      0.05,
      "bridgeFeeUsd":   0.10,
      "routePlan":      { "steps": [...], "totalExpectedFeeBps": 110, "totalExpectedSecs": 180 },
      "createdAt":      "2026-04-29T10:00:00Z"
    },
    "nextAction": {
      // screen: "collect_crypto" for crypto payments, "paystack_popup" for NGN bank transfers
      "screen":         "collect_crypto",
      "depositAddress": "0xDepositAddress",
      // depositMemo is non-null for XRP, TON, XLM, and NEAR-native chains
      "depositMemo":    null,
      "amount":         50.38,
      "token":          "USDC",
      "chain":          "ETHEREUM"
    }
  }
}`,
            },
            {
              method: 'GET',
              path: '/orders/:id',
              summary: 'Fetch a single order. Triggers a live sync from the active provider before returning',
              params: [
                { name: ':id', type: 'string', req: true, desc: 'Order ID from POST /orders response' },
              ],
              response: `{
  "data": {
    "id":             "ord_abc123",
    "status":         "completed",   // awaiting_deposit | processing | completed | failed | expired
    "sourceAmount":   50.38,
    "destAmount":     74250.00,
    "sourceAssetKey": "crypto:ETH:USDC",
    "destAssetKey":   "fiat:NGN",
    "steps": [
      {
        "sequence":       0,
        "provider":       "nearintents",
        "status":         "done",    // pending | awaiting_deposit | in_flight | done | failed
        "depositAddress": "0xNEARDeposit",
        "depositMemo":    null,
        "externalId":     "ni_...",
        "amountIn":       50.38
      },
      {
        "sequence":  1,
        "provider":  "paycrest",
        "status":    "done",
        "externalId": "pc_..."
      }
    ]
  }
}`,
            },
            {
              method: 'GET',
              path: '/orders',
              summary: 'List your last 50 orders, newest first',
              params: [],
              response: `{
  "data": [
    { "id": "ord_abc123", "status": "completed",        "sourceAmount": 50.38, "createdAt": "2026-04-29T10:05:00Z" },
    { "id": "ord_xyz789", "status": "awaiting_deposit", "sourceAmount": 100,   "createdAt": "2026-04-29T09:12:00Z" }
  ]
}`,
            },
            {
              method: 'GET',
              path: '/institutions',
              summary: 'List supported bank institutions for a currency — use to populate bank pickers in onramp flows',
              params: [
                { name: 'currency', type: 'string', req: true, desc: 'ISO 4217 currency code, e.g. NGN' },
              ],
              response: `{
  "data": [
    { "name": "Access Bank",  "code": "ACCESS",  "id": "..." },
    { "name": "GTBank",       "code": "GTBANK",  "id": "..." },
    { "name": "Zenith Bank",  "code": "ZENITH",  "id": "..." }
  ]
}`,
            },
          ].map((ep) => {
            const key = `${ep.method} ${ep.path}`;
            const isOpen = openEndpoint === key;
            return (
              <div
                key={key}
                className={`rounded-2xl border transition-all overflow-hidden ${isOpen ? 'bg-cream-soft border-hair shadow-leaf' : 'bg-cream-soft/60 border-hair-soft hover:border-hair'}`}
              >
                <button
                  onClick={() => setOpenEndpoint(isOpen ? null : key)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left"
                >
                  <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-md shrink-0 ${ep.method === 'GET' ? 'bg-cream-deep text-ink-soft' : 'bg-forest/10 text-forest-deep'}`}>
                    {ep.method}
                  </span>
                  <code className="text-[13.5px] font-mono text-ink font-semibold flex-1">{ep.path}</code>
                  <span className="text-[12px] text-ink-muted hidden md:block truncate max-w-[280px]">{ep.summary}</span>
                  <ChevronDown size={16} strokeWidth={2} className={`text-ink-muted shrink-0 transition-transform ${isOpen ? 'rotate-180 text-forest-deep' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 space-y-5 fade-up">
                    <p className="text-[13.5px] text-ink-muted leading-relaxed">{ep.summary}</p>

                    {ep.params.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-ink-soft uppercase tracking-widest mb-3">Parameters</p>
                        <div className="space-y-2">
                          {ep.params.map(p => (
                            <div key={p.name} className="flex items-start gap-3 text-[12.5px]">
                              <code className="font-mono text-forest-deep bg-cream-deep px-1.5 py-0.5 rounded text-[11.5px] shrink-0 mt-0.5">{p.name}</code>
                              <span className="text-ink-faint font-mono text-[11px] shrink-0 mt-0.5">{p.type}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 mt-0.5 uppercase tracking-wide ${p.req ? 'bg-terracotta/10 text-terracotta-deep' : 'bg-cream-deep text-ink-faint'}`}>{p.req ? 'req' : 'opt'}</span>
                              <span className="text-ink-muted leading-relaxed">{p.desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-[11px] font-semibold text-ink-soft uppercase tracking-widest mb-3">Response</p>
                      <CodeBlock language="json" light>{ep.response}</CodeBlock>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Webhooks */}
      <section className="space-y-6 fade-up" style={{ animationDelay: '240ms' }}>
        <div className="flex items-center gap-3">
          <Bell className="text-forest" size={22} />
          <h2 className="font-display text-[28px] font-semibold text-ink">Webhooks</h2>
        </div>
        <p className="text-[15px] text-ink-muted leading-relaxed -mt-2">
          Register a webhook URL in <strong>Settings → Developer</strong>. Weave signs every request with HMAC-SHA256 using your webhook secret — always verify before fulfilling. Weave retries with exponential back-off if your endpoint does not return 2xx.
        </p>

        <div className="bg-cream-soft rounded-[28px] p-7 border border-hair-soft shadow-leaf space-y-5">
          <div>
            <p className="text-[11px] font-semibold text-ink-soft uppercase tracking-widest mb-3">Events</p>
            <div className="space-y-2">
              {[
                { event: 'order.completed',  color: 'bg-forest',    desc: 'All route steps settled. Trigger fulfillment here.' },
                { event: 'order.processing', color: 'bg-ink/30',    desc: 'Deposit confirmed — bridge/settlement in progress.' },
                { event: 'order.failed',     color: 'bg-red-400',   desc: 'Payment failed or expired. No funds moved.' },
              ].map(({ event, color, desc }) => (
                <div key={event} className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                  <code className="bg-cream-deep px-1.5 py-0.5 rounded-md text-forest-deep font-mono text-[12px] shrink-0">{event}</code>
                  <span className="text-[13px] text-ink-muted">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-ink-soft uppercase tracking-widest mb-3">Payload</p>
            <CodeBlock language="json" light>{`{
  "event": "order.completed",
  "data": {
    "orderId":      "ord_abc123",
    "status":       "completed",
    "sourceAsset":  "crypto:BASE:USDC",
    "destAsset":    "fiat:NGN",
    "sourceAmount": 50.38,
    "destAmount":   74800.00
  }
}`}</CodeBlock>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-ink-soft uppercase tracking-widest mb-3">Signature Verification — <code className="font-mono lowercase normal-case tracking-normal">x-weave-signature</code></p>
            <p className="text-[13px] text-ink-muted mb-3 leading-relaxed">
              The header contains the HMAC-SHA256 hex digest of the raw request body using your webhook secret.
            </p>
            <CodeBlock language="ts" light>{`import crypto from 'crypto';

const sig  = req.headers['x-weave-signature'] as string;
const hash = crypto
  .createHmac('sha256', process.env.WEAVE_WEBHOOK_SECRET!)
  .update(rawBody)   // raw Buffer — do not parse JSON first
  .digest('hex');

if (sig !== hash) return res.status(401).send('Invalid signature');
// safe to fulfil order
`}</CodeBlock>
          </div>
        </div>
      </section>

      {/* Order Lifecycle */}
      <section className="space-y-6 fade-up" style={{ animationDelay: '270ms' }}>
        <h2 className="font-display text-[28px] font-semibold text-ink">Order Lifecycle</h2>
        <p className="text-[15px] text-ink-muted leading-relaxed -mt-2">
          Every payment follows the same pipeline regardless of provider or corridor.
        </p>

        <div className="relative">
          <div className="absolute left-[19px] top-8 bottom-8 w-px bg-hair-soft" />
          <div className="space-y-4">
            {[
              {
                n: 1,
                title: 'Order Created',
                color: 'bg-amber-400',
                body: 'POST /v1/orders returns an order ID and a nextAction object. For Paystack (NGN→NGN) nextAction contains a Paystack access_code. For crypto flows it contains a depositAddress (and depositMemo for memo-based chains). For ChainRails (self flow) the depositAddress is the intent contract.',
              },
              {
                n: 2,
                title: 'Deposit Received',
                color: 'bg-blue-400',
                body: 'Paystack fires a charge.success webhook (fiat). For NEAR Intents and ChainRails, the provider fires their own signed webhook to Weave. Weave verifies the signature, checks idempotency, and enqueues the event via QStash for processing.',
              },
              {
                n: 3,
                title: 'Bridge / Settlement',
                color: 'bg-tan-deep',
                body: 'NEAR Intents and ChainRails bridge funds to USDC on Base (~30–90 s). Paycrest then converts USDC to NGN and pushes to your bank (30 s – 2 min). For Paystack NGN→NGN routes, settlement to your bank is T+1 business day.',
              },
              {
                n: 4,
                title: 'Order Completed',
                color: 'bg-forest',
                body: 'All route steps reach "done". The Order status transitions to completed. Weave fires your registered merchant webhook (event: "order.completed") with the full settlement detail, signed with HMAC-SHA256.',
              },
              {
                n: 5,
                title: 'Webhook Confirmed',
                color: 'bg-ink/40',
                body: 'Your server receives the signed POST, verifies the x-weave-signature header, and fulfils the order. Weave retries with exponential back-off if your endpoint does not return 2xx.',
              },
            ].map(({ n, title, color, body }) => (
              <div key={n} className="flex gap-5">
                <div className={`relative z-10 w-10 h-10 rounded-full ${color} flex items-center justify-center flex-shrink-0 text-white text-[13px] font-bold shadow-leaf`}>
                  {n}
                </div>
                <div className="bg-cream-soft border border-hair-soft rounded-2xl px-5 py-4 flex-1">
                  <p className="text-[14px] font-semibold text-ink mb-1">{title}</p>
                  <p className="text-[13px] text-ink-muted leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Order statuses */}
      <section className="space-y-5 fade-up" style={{ animationDelay: '300ms' }}>
        <h2 className="font-display text-[28px] font-semibold text-ink">Order Statuses</h2>
        <div className="bg-cream-soft rounded-[28px] border border-hair-soft overflow-hidden shadow-leaf">
          {[
            { status: 'awaiting_deposit', color: 'bg-amber-400', desc: 'Created — waiting for the customer to send funds.' },
            { status: 'processing',       color: 'bg-blue-400',  desc: 'Deposit detected — bridge/settlement in progress.' },
            { status: 'completed',        color: 'bg-forest',    desc: 'Funds delivered to your payout destination.' },
            { status: 'failed',           color: 'bg-red-400',   desc: 'Payment failed or expired. No funds moved.' },
            { status: 'expired',          color: 'bg-ink/30',    desc: 'No deposit received within the session window.' },
          ].map(({ status, color, desc }, i, arr) => (
            <div key={status} className={`flex items-start gap-4 px-6 py-4 ${i < arr.length - 1 ? 'border-b border-hair-soft' : ''}`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${color}`} />
              <div>
                <code className="text-[13px] font-mono font-semibold text-ink">{status}</code>
                <p className="text-[13px] text-ink-muted mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-cream-soft rounded-[28px] border border-hair-soft overflow-hidden shadow-leaf">
          <div className="px-6 py-3 border-b border-hair-soft">
            <p className="text-[11px] font-semibold text-ink-soft uppercase tracking-widest">Route Step Statuses</p>
          </div>
          {[
            { status: 'pending',          color: 'bg-ink/20',    desc: 'Step queued but provider resource not yet created.' },
            { status: 'awaiting_deposit', color: 'bg-amber-400', desc: 'Provider resource created — waiting for deposit.' },
            { status: 'in_flight',        color: 'bg-blue-400',  desc: 'Funds received — provider processing the hop.' },
            { status: 'done',             color: 'bg-forest',    desc: 'Hop completed — funds forwarded to next step.' },
            { status: 'failed',           color: 'bg-red-400',   desc: 'Hop failed. Triggers order-level failure.' },
          ].map(({ status, color, desc }, i, arr) => (
            <div key={status} className={`flex items-start gap-4 px-6 py-4 ${i < arr.length - 1 ? 'border-b border-hair-soft' : ''}`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${color}`} />
              <div>
                <code className="text-[13px] font-mono font-semibold text-ink">{status}</code>
                <p className="text-[13px] text-ink-muted mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="flex flex-col items-center bg-forest/5 rounded-[36px] p-10 md:p-14 border border-forest/10 text-center fade-up" style={{ animationDelay: '360ms' }}>
        <Shield className="text-forest mb-5" size={40} strokeWidth={1.5} />
        <h2 className="font-display text-[28px] font-semibold text-forest-deep mb-3">Security Model</h2>
        <div className="text-ink-muted leading-relaxed max-w-xl text-[15px] space-y-3">
          <p>
            <strong className="text-ink">API keys are scoped.</strong> Your publishable key (<code>pk_</code>) is safe in the browser and the widget. Never use it for server-side mutations — use your secret key there and keep it out of client code.
          </p>
          <p>
            <strong className="text-ink">All webhooks are signature-verified.</strong> Incoming provider webhooks (Paystack, Paycrest, ChainRails) are verified with HMAC-SHA256 before any state is mutated. Requests fail closed if the webhook secret is missing. Outgoing merchant webhooks are also signed so you can verify them.
          </p>
          <p>
            <strong className="text-ink">Idempotent processing.</strong> Every webhook event is deduplicated by <code>(source, event, externalId)</code> before being enqueued. Duplicate deliveries from providers are ignored safely.
          </p>
        </div>
      </section>

      <footer className="pt-10 border-t border-hair-soft text-center text-ink-faint text-[11px] uppercase tracking-widest">
        Weave · A product of <span className="font-bold text-ink-muted">Dewdrop Labs</span> · © 2026
      </footer>
    </div>
  );
}

function DocCard({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="text-left group bg-cream-soft rounded-[24px] p-6 border border-hair-soft shadow-leaf hover:border-forest/30 hover:-translate-y-0.5 transition-all w-full">
      <div className="mb-3">{icon}</div>
      <h3 className="font-display text-[17px] font-semibold text-ink mb-1 group-hover:text-forest-deep transition-colors">{title}</h3>
      <p className="text-[13px] text-ink-muted leading-relaxed">{description}</p>
      <span className="block mt-3 text-[12px] text-forest-deep/60 group-hover:text-forest-deep transition-colors font-medium">View guide →</span>
    </button>
  );
}

function ProviderCard({ name, badge, badgeColor, flow, settlement, fee, description, trigger, assetKey }: {
  name: string; badge: string; badgeColor: string; flow: string;
  settlement: string; fee: string; description: string; trigger: string; assetKey: string;
}) {
  return (
    <div className="bg-cream-soft rounded-[24px] border border-hair-soft shadow-leaf p-6 space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="font-display text-[18px] font-semibold text-ink">{name}</p>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-[12px] text-ink-muted"><span className="font-semibold text-ink">Flow:</span> <code className="font-mono text-[11px] bg-cream-deep px-1.5 py-0.5 rounded text-forest-deep">{flow}</code></span>
          <span className="text-[12px] text-ink-muted"><span className="font-semibold text-ink">Settles in:</span> {settlement}</span>
          <span className="text-[12px] text-ink-muted"><span className="font-semibold text-ink">Fee:</span> {fee}</span>
        </div>
      </div>
      <p className="text-[13.5px] text-ink-muted leading-relaxed">{description}</p>
      <div className="bg-cream-deep/70 rounded-xl px-3 py-2.5 flex items-start gap-3">
        <code className="text-[11px] font-mono text-forest-deep shrink-0 mt-0.5 font-semibold">{assetKey}</code>
        <span className="text-[12px] text-ink-muted leading-relaxed" dangerouslySetInnerHTML={{ __html: `— ${trigger}` }} />
      </div>
    </div>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="text-cream-faint text-[11px] font-semibold uppercase tracking-widest flex items-center gap-2">
      {icon} {label}
    </div>
  );
}

function CodeBlock({ children, language, light = false }: { children: string; language: string; light?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(children.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative rounded-2xl p-5 font-mono text-[12.5px] border overflow-x-auto ${
      light
        ? 'bg-cream-deep/40 text-ink-soft border-hair-soft'
        : 'bg-ink-deep text-cream-soft/90 border-cream-soft/10'
    }`}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] uppercase tracking-widest font-bold opacity-40">{language}</span>
        <button
          onClick={copy}
          className={`flex items-center gap-1.5 text-[11px] font-medium transition-all px-2 py-1 rounded-lg ${
            light ? 'hover:bg-cream-deep text-ink-muted' : 'hover:bg-cream-soft/10 text-cream-soft/50'
          }`}
        >
          {copied ? <><Check size={11} className="text-forest" /> Copied!</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-words"><code>{children.trim()}</code></pre>
    </div>
  );
}
