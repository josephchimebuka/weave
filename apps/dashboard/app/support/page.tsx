'use client';

import { useState } from 'react';
import {
  Search,
  BookOpen,
  MessagesSquare,
  Code2,
  ChevronDown,
  HelpCircle,
  Wallet,
  UserCircle2,
  ShieldCheck,
} from 'lucide-react';

type FAQCategory = {
  title: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  items: { q: string; a: string }[];
};

const FAQ: FAQCategory[] = [
  {
    title: 'Payments',
    icon: Wallet,
    items: [
      {
        q: 'When do I receive my payouts?',
        a: 'Settled funds arrive within 2 business days for fiat corridors and within minutes for crypto destinations. Check your Settings page for your active payout destination.',
      },
      {
        q: 'How do I refund a transaction?',
        a: 'Open the transaction from the Transactions page and click Issue Refund. Refunds are returned to the original payment method within 5–10 business days.',
      },
      {
        q: 'Which currencies and chains are supported?',
        a: 'We support USD, NGN, and most G20 fiat currencies, plus USDC/USDT across Base, Ethereum, Polygon, Arbitrum, and NEAR Intents for other chains.',
      },
    ],
  },
  {
    title: 'Account',
    icon: UserCircle2,
    items: [
      {
        q: 'How do I update my banking information?',
        a: 'Go to Settings → Payout destination. Changes take effect after a 24-hour cooldown to protect against unauthorized changes.',
      },
      {
        q: 'How do I invite a team member?',
        a: 'Settings → Team. Invited members receive an email link to join with the role you assign.',
      },
    ],
  },
  {
    title: 'Compliance',
    icon: ShieldCheck,
    items: [
      {
        q: 'Why do I need to complete KYB?',
        a: 'Know Your Business verification is required by payment regulations and partner banks before we can release merchant payouts.',
      },
      {
        q: 'How long does KYB review take?',
        a: 'Typical reviews complete in 1–3 business days once all documents are submitted.',
      },
    ],
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<string | null>('Payments:0');

  return (
    <div className="space-y-10">
      {/* Top utility bar */}
      <div className="flex items-center justify-between gap-4 fade-up">
        <div className="relative flex-1 max-w-md">
          <Search size={15} strokeWidth={1.9} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-3 bg-cream-soft border border-hair rounded-full text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-forest/40 transition-colors shadow-leaf"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            aria-label="Notifications"
            className="w-11 h-11 rounded-full hover:bg-cream-deep/60 text-forest-deep flex items-center justify-center transition-colors"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </button>
          <button
            aria-label="Help"
            className="w-11 h-11 rounded-full hover:bg-cream-deep/60 text-forest-deep flex items-center justify-center transition-colors"
          >
            <HelpCircle size={19} strokeWidth={1.75} />
          </button>
          <div className="w-11 h-11 rounded-full bg-forest-surface border-2 border-forest/20 text-forest-deep font-display font-semibold flex items-center justify-center text-sm">
            S
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="text-center py-8 fade-up" style={{ animationDelay: '80ms' }}>
        <h1 className="font-display font-display-tight text-[48px] md:text-[64px] lg:text-[72px] font-semibold text-ink leading-[1.05] tracking-tight max-w-4xl mx-auto">
          How can we help you today?
        </h1>
        <p className="text-ink-muted text-[16px] mt-5 max-w-xl mx-auto">
          Search our knowledge base or browse categories below to find the answers you need.
        </p>

        {/* Ask a question */}
        <div className="mt-10 max-w-2xl mx-auto relative">
          <div className="relative flex items-center gap-2 bg-cream-soft border border-hair rounded-full pl-6 pr-2 py-2 shadow-leaf-lg">
            <Search size={18} strokeWidth={1.9} className="text-forest-deep shrink-0" />
            <input
              type="text"
              placeholder="Ask a question..."
              className="flex-1 bg-transparent py-3 text-[15px] text-ink placeholder:text-ink-faint focus:outline-none"
            />
            <button className="bg-forest text-cream-soft px-7 py-3 rounded-full text-[14px] font-semibold hover:bg-forest-deep transition-colors shrink-0">
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Category tiles */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5 fade-up" style={{ animationDelay: '140ms' }}>
        <CategoryTile
          icon={BookOpen}
          iconTone="bg-forest-surface text-forest-deep"
          title="Knowledge Base"
          description="Detailed guides and tutorials"
        />
        <CategoryTile
          icon={MessagesSquare}
          iconTone="bg-tan-mist text-tan-deep"
          title="Community Forum"
          description="Connect with other merchants"
        />
        <CategoryTile
          icon={Code2}
          iconTone="bg-cream-deep text-ink-soft"
          title="API Documentation"
          description="Technical resources for devs"
        />
      </section>

      {/* FAQ + Contact */}
      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-8">
        {/* FAQ */}
        <div className="fade-up" style={{ animationDelay: '180ms' }}>
          <div className="flex items-center gap-2.5 mb-6">
            <span className="w-8 h-8 rounded-lg bg-forest-surface text-forest-deep flex items-center justify-center">
              <HelpCircle size={17} strokeWidth={2} />
            </span>
            <h2 className="font-display text-[28px] font-semibold text-ink tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="rule-dotted mb-6" />

          <div className="space-y-8">
            {FAQ.map((cat) => {
              const CatIcon = cat.icon;
              return (
                <div key={cat.title}>
                  <div className="flex items-center gap-2 mb-3">
                    <CatIcon size={15} strokeWidth={1.9} className="text-tan-deep" />
                    <h3 className="font-display text-[18px] font-semibold text-tan-deep">
                      {cat.title}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {cat.items.map((item, idx) => {
                      const key = `${cat.title}:${idx}`;
                      const isOpen = openFaq === key;
                      return (
                        <div
                          key={key}
                          className={`rounded-2xl border transition-all ${
                            isOpen
                              ? 'bg-cream-soft border-hair shadow-leaf'
                              : 'bg-cream-soft/60 border-hair-soft hover:border-hair'
                          }`}
                        >
                          <button
                            onClick={() => setOpenFaq(isOpen ? null : key)}
                            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                          >
                            <span className="text-[14px] font-medium text-ink">{item.q}</span>
                            <ChevronDown
                              size={16}
                              strokeWidth={2}
                              className={`text-ink-muted shrink-0 transition-transform ${isOpen ? 'rotate-180 text-forest-deep' : ''}`}
                            />
                          </button>
                          {isOpen && (
                            <div className="px-5 pb-4 pt-1 text-[13.5px] text-ink-soft leading-relaxed fade-up">
                              {item.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact sidebar */}
        <aside
          className="rounded-[24px] bg-cream-soft border border-hair-soft shadow-leaf px-7 py-7 self-start lg:sticky lg:top-8 fade-up"
          style={{ animationDelay: '220ms' }}
        >
          <h3 className="font-display text-[28px] font-semibold text-ink tracking-tight leading-tight">
            Still need help?
          </h3>
          <p className="text-[13.5px] text-ink-muted mt-2 leading-relaxed">
            Send us a message and our support team will get back to you within 24 hours.
          </p>

          <form className="mt-6 space-y-5">
            <div>
              <label className="text-[12px] font-semibold text-ink-soft uppercase tracking-[0.1em]">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Jane Doe"
                className="mt-2 w-full bg-cream-deep/40 border border-hair-soft rounded-xl px-4 py-3 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-forest/40 focus:bg-cream-soft transition-colors"
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-ink-soft uppercase tracking-[0.1em]">
                Email Address
              </label>
              <input
                type="email"
                placeholder="jane@example.com"
                className="mt-2 w-full bg-cream-deep/40 border border-hair-soft rounded-xl px-4 py-3 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-forest/40 focus:bg-cream-soft transition-colors"
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-ink-soft uppercase tracking-[0.1em]">
                Topic
              </label>
              <div className="relative mt-2">
                <select
                  defaultValue="payments"
                  className="w-full bg-cream-deep/40 border border-hair-soft rounded-xl px-4 py-3 text-[14px] text-ink focus:outline-none focus:border-forest/40 focus:bg-cream-soft transition-colors appearance-none cursor-pointer pr-10"
                >
                  <option value="payments">Payments &amp; Payouts</option>
                  <option value="account">Account</option>
                  <option value="compliance">Compliance &amp; KYB</option>
                  <option value="api">API &amp; Integration</option>
                  <option value="other">Other</option>
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted text-[11px]">▾</span>
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-ink-soft uppercase tracking-[0.1em]">
                Message
              </label>
              <textarea
                rows={4}
                placeholder="Tell us what's going on…"
                className="mt-2 w-full bg-cream-deep/40 border border-hair-soft rounded-xl px-4 py-3 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-forest/40 focus:bg-cream-soft transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-forest text-cream-soft py-3.5 rounded-full text-[14px] font-semibold hover:bg-forest-deep transition-colors shadow-leaf"
            >
              Send Message
            </button>
          </form>
        </aside>
      </section>
    </div>
  );
}

function CategoryTile({
  icon: Icon,
  iconTone,
  title,
  description,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  iconTone: string;
  title: string;
  description: string;
}) {
  return (
    <button className="group text-left relative rounded-[24px] bg-cream-soft border border-hair-soft shadow-leaf px-7 py-8 hover:border-forest/30 hover:-translate-y-0.5 transition-all overflow-hidden">
      <span className={`w-12 h-12 rounded-2xl ${iconTone} flex items-center justify-center`}>
        <Icon size={20} strokeWidth={1.9} />
      </span>
      <p className="mt-5 font-display text-[22px] font-semibold text-ink leading-tight">
        {title}
      </p>
      <p className="mt-1 text-[13.5px] text-ink-muted">{description}</p>
      <span className="absolute bottom-7 right-7 text-ink-muted group-hover:text-forest-deep transition-colors">
        →
      </span>
    </button>
  );
}
