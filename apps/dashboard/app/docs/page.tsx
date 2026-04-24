'use client';

import { useState } from 'react';
import { 
  FileText, Code, Globe, Zap, Shield, Bell, Layers, Terminal, Check, Copy 
} from 'lucide-react';

type DocTab = 'html' | 'react' | 'nextjs' | 'api';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<DocTab>('html');

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div className="fade-up">
        <h1 className="font-display text-[48px] font-semibold text-ink tracking-tight leading-tight">
          Integration Guide
        </h1>
        <p className="text-ink-muted text-[17px] mt-4 max-w-2xl leading-relaxed">
          Whether you're using a simple HTML page or a complex React application, Weave provides the most flexible payment primitives in the industry.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 fade-up" style={{ animationDelay: '100ms' }}>
         <DocCard 
           icon={<Zap className="text-forest" />}
           title="2-Minute Setup"
           description="The fastest way to accept crypto and fiat. Copy a single script tag and you're live."
         />
         <DocCard 
           icon={<Layers className="text-forest" />}
           title="Native Components"
           description="First-class React support with full type-safety and theme customisation built-in."
         />
      </div>

      {/* Integration Tabs */}
      <section className="space-y-8 fade-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center gap-1 p-1 bg-cream-deep/50 rounded-2xl border border-hair-soft w-fit overflow-x-auto">
          {(['html', 'react', 'nextjs', 'api'] as DocTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-[14px] font-medium transition-all capitalize ${
                activeTab === tab
                  ? 'bg-cream-soft text-forest-deep shadow-leaf'
                  : 'text-ink-muted hover:text-ink-soft'
              }`}
            >
              {tab === 'html' ? 'HTML/JS' : tab === 'api' ? 'REST API' : tab}
            </button>
          ))}
        </div>

        <div className="bg-ink rounded-[40px] p-10 text-cream-soft overflow-hidden shadow-leaf-lg relative group min-h-[500px]">
           <div className="absolute top-0 right-0 w-80 h-80 bg-forest/10 blur-[120px] pointer-events-none group-hover:bg-forest/15 transition-all" />
           
           <div className="relative z-10 space-y-6">
              {activeTab === 'html' && (
                <div className="fade-in space-y-6">
                  <h3 className="text-cream-faint text-[13px] font-semibold uppercase tracking-widest flex items-center gap-2">
                    <Globe size={14} /> Managed HTML Integration
                  </h3>
                  <p className="text-[15px] text-cream-soft/70 leading-relaxed">
                    Drop our script into any website. No NPM, no build step, no headaches.
                  </p>
                  <CodeBlock language="html">
{`<!-- 1. The container -->
<div id="weave-checkout"></div>

<!-- 2. The script -->
<script src="https://unpkg.com/@weave/widget/dist/umd.js"></script>

<!-- 3. The magic -->
<script>
  Weave.mount('#weave-checkout', {
    apiKey: 'pk_live_...',
    merchant: {
      name: 'Global Textiles',
      amount: 4500,
      currency: 'NGN'
    }
  });
</script>`}
                  </CodeBlock>
                </div>
              )}

              {activeTab === 'react' && (
                <div className="fade-in space-y-6">
                  <h3 className="text-cream-faint text-[13px] font-semibold uppercase tracking-widest flex items-center gap-2">
                    <Code size={14} /> React Component
                  </h3>
                  <p className="text-[15px] text-cream-soft/70 leading-relaxed">
                    Install our package and get full type-safety and lifecycle hooks.
                  </p>
                  <CodeBlock language="bash">{`npm install @weave/widget`}</CodeBlock>
                  <CodeBlock language="tsx">
{`import { WeaveCheckout } from '@weave/widget';

export default function Checkout() {
  return (
    <WeaveCheckout 
      apiKey="pk_live_..."
      onSuccess={(data) => console.log('Paid!', data)}
      merchant={{
        name: 'My Store',
        amount: 25.00,
        currency: 'USDC'
      }}
    />
  );
}`}
                  </CodeBlock>
                </div>
              )}

              {activeTab === 'nextjs' && (
                <div className="fade-in space-y-6">
                  <h3 className="text-cream-faint text-[13px] font-semibold uppercase tracking-widest flex items-center gap-2">
                    <Zap size={14} /> Next.js (App Router)
                  </h3>
                  <p className="text-[15px] text-cream-soft/70 leading-relaxed">
                    Since Weave requires the browser (window) object, ensure you use <code>'use client'</code> at the top of your file.
                  </p>
                  <CodeBlock language="tsx">
{`'use client'; // Required for widget

import dynamic from 'next/dynamic';

// If you want to disable SSR entirely for this component:
const WeaveCheckout = dynamic(
  () => import('@weave/widget').then(m => m.WeaveCheckout),
  { ssr: false }
);

export default function CheckoutPage() {
  return (
    <main>
      <h1>Express Checkout</h1>
      <WeaveCheckout 
        apiKey="pk_live_..."
        merchant={{
          name: 'My Store',
          amount: 45.00,
          currency: 'NGN'
        }}
      />
    </main>
  );
}`}
                  </CodeBlock>
                </div>
              )}

              {activeTab === 'api' && (
                <div className="fade-in space-y-6">
                  <h3 className="text-cream-faint text-[13px] font-semibold uppercase tracking-widest flex items-center gap-2">
                    <Terminal size={14} /> Direct REST API
                  </h3>
                  <p className="text-[15px] text-cream-soft/70 leading-relaxed">
                    Create payment links or orders programmatically from your server.
                  </p>
                  <CodeBlock language="bash">
{`curl -X POST https://api.weave.dev/v1/links \\
  -H "x-secret-key: sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Custom Order",
    "amount": 50.00,
    "currency": "NGN"
  }'`}
                  </CodeBlock>
                </div>
              )}
           </div>
        </div>
      </section>

      {/* Webhooks Section (Keeping from before but styled consistently) */}
      <section className="space-y-6 fade-up" style={{ animationDelay: '300ms' }}>
        <div className="flex items-center gap-3">
          <Bell className="text-forest" size={24} />
          <h2 className="font-display text-[28px] font-semibold text-ink">Webhooks</h2>
        </div>
        <div className="bg-cream-soft rounded-[32px] p-8 border border-hair-soft shadow-leaf">
          <p className="text-[15px] text-ink-muted leading-relaxed mb-6">
            Listening for the <code className="bg-cream-deep px-1.5 py-0.5 rounded text-forest-deep">order.completed</code> event is the best way to handle inventory fulfillment.
          </p>
          <CodeBlock language="json" light>
{`{
  "event": "order.completed",
  "data": {
    "orderId": "tr_6f7g2...",
    "amount": 4500.00,
    "currency": "NGN"
  }
}`}
          </CodeBlock>
        </div>
      </section>

      {/* Security Section (Keeping) */}
      <section className="flex flex-col items-center bg-forest/5 rounded-[40px] p-12 border border-forest/10 text-center fade-up" style={{ animationDelay: '400ms' }}>
        <Shield className="text-forest mb-6" size={48} strokeWidth={1} />
        <h2 className="font-display text-[32px] font-semibold text-forest-deep mb-4">Banking Grade Security</h2>
        <p className="text-ink-muted leading-relaxed max-w-xl mx-auto">
          Weave uses HMAC-SHA256 signatures for all webhooks and standard JWT session tokens for API security. Your Secret Key should never be exposed in client-side code.
        </p>
      </section>

      {/* Footer Attribution */}
      <footer className="mt-32 pt-12 border-t border-hair-soft text-center text-ink-faint text-[11px] uppercase tracking-widest pb-20">
        Weave is a product of <span className="font-bold text-ink-muted">Dewdrop Labs</span> · &copy; 2026 All Rights Reserved
      </footer>
    </div>
  );
}

function DocCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-cream-soft rounded-[32px] p-8 border border-hair-soft shadow-leaf hover:shadow-leaf-lg transition-all active:scale-[0.98]">
      <div className="mb-4">{icon}</div>
      <h3 className="font-display text-[20px] font-semibold text-ink mb-2">{title}</h3>
      <p className="text-[14px] text-ink-muted leading-relaxed">{description}</p>
    </div>
  );
}

function CodeBlock({ children, language, light = false }: { children: string, language: string, light?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(children.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative group rounded-2xl p-6 font-mono text-[13px] border overflow-x-auto ${
      light 
        ? 'bg-cream-deep/30 text-ink-soft border-hair-soft' 
        : 'bg-ink-deep text-cream-soft/90 border-cream-soft/10'
    }`}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-[10px] uppercase tracking-widest font-bold opacity-40">{language}</span>
        <button 
          onClick={copyToClipboard}
          className={`flex items-center gap-1.5 text-[11px] font-medium transition-all px-2 py-1 rounded-lg ${
            light ? 'hover:bg-cream-deep text-ink-muted' : 'hover:bg-cream-soft/10 text-cream-soft/50'
          }`}
        >
          {copied ? <><Check size={12} className="text-forest" /> Copied!</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>
      <pre><code>{children}</code></pre>
    </div>
  );
}


