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
import Link from 'next/link';

type FAQCategory = {
  title: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  items: { q: string; a: string }[];
};

const FAQ: FAQCategory[] = [
  {
    title: 'Payouts & Settlement',
    icon: Wallet,
    items: [
      {
        q: 'How long do payouts take?',
        a: 'Settlement times depend on your payout type. For NGN bank accounts, customers paying in Naira via bank transfer (Paystack) are settled on a T+1 business day schedule — funds arrive the next business day. For crypto-sourced NGN payments (e.g. a customer paying in ETH or USDC), settlement is near-instant via Paycrest, typically within 30 seconds to 2 minutes. Crypto-native settlements (USDC/USDT to a wallet) are virtually instant.',
      },
      {
        q: 'Where are my funds settled?',
        a: 'Funds are settled to the payout destination you configured in your Settings page. You can choose between a local bank account or a stablecoin wallet (USDC/USDT) across several supported chains.',
      },
      {
        q: 'Is there a minimum payout amount?',
        a: 'Yes. For Naira (NGN) bank transfers, the minimum is ₦1,000. For cryptocurrency settlements, the minimum is 0.5 USDC (or equivalent) plus the network gas fee.',
      },
    ],
  },
  {
    title: 'Verification (KYB)',
    icon: ShieldCheck,
    items: [
      {
        q: 'Why do I need to verify my business?',
        a: 'Know Your Business (KYB) verification is a regulatory requirement that allows us to ensure platform security and comply with global anti-money laundering (AML) laws. It is required to move live funds.',
      },
      {
        q: 'What documents are required for KYB?',
        a: 'Generally, you need your Certificate of Incorporation, Proof of Address, and a government-issued ID for the primary director or business owner.',
      },
      {
        q: 'How long does the review take?',
        a: 'Our compliance team typically reviews applications within 1-3 business days. You will receive an automated email as soon as your account is approved or if we need more information.',
      },
    ],
  },
  {
    title: 'Integration & API',
    icon: Code2,
    items: [
      {
        q: 'Where can I find my API keys?',
        a: 'API keys are located in Settings → API Keys. You have both Public keys for front-end widgets and Secret keys for backend integrations. Never share your Secret key.',
      },
      {
        q: 'How do I test before going live?',
        a: 'Toggle the "Test Mode" switch in your dashboard. This allows you to generate test transactions and ensure your integration is working correctly without moving real funds.',
      },
      {
        q: 'Do you provide a hosted checkout page?',
        a: 'Yes! Our Payment Links feature allows you to generate a secure, Weave-hosted checkout page in seconds without writing any code.',
      },
    ],
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<string | null>('Payments:0');

  return (
    <div className="space-y-10">
      {/* Top utility bar */}
      <div className="flex items-center justify-end gap-3 fade-up">
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

      {/* Hero */}
      <section className="text-center py-12 md:py-20 fade-up" style={{ animationDelay: '80ms' }}>
        <h1 className="font-display font-display-tight text-[36px] sm:text-[48px] md:text-[64px] lg:text-[72px] font-semibold text-ink leading-[1.05] tracking-tight max-w-4xl mx-auto">
          How can we help?
        </h1>
        <p className="text-ink-muted text-[17px] mt-6 max-w-xl mx-auto leading-relaxed">
          Need assistance with your account or integration? Browse our most common questions below or message our support team directly.
        </p>
      </section>

      {/* Category tiles */}
      {/* Legal Links Bar */}
      <section className="bg-cream-soft border border-hair-soft rounded-3xl p-6 flex flex-wrap items-center justify-between gap-6 fade-up" style={{ animationDelay: '140ms' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-forest/10 rounded-full flex items-center justify-center text-forest-deep">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-ink">Trust & Compliance</p>
            <p className="text-[11px] text-ink-muted">Read our legal agreements and policies</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="text-[13px] font-semibold text-forest-deep hover:text-forest transition-colors">
            Terms of Use
          </Link>
          <div className="w-1 h-1 rounded-full bg-hair" />
          <Link href="/privacy" className="text-[13px] font-semibold text-forest-deep hover:text-forest transition-colors">
            Privacy Policy
          </Link>
        </div>
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
                          className={`rounded-2xl border transition-all ${isOpen
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

          <SupportForm />
        </aside>
      </section>
    </div>
  );
}

function SupportForm() {
  const [formData, setFormData] = useState({ name: '', email: '', topic: 'payments', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to send message. Please try again.');
      
      setSuccess(true);
      setFormData({ name: '', email: '', topic: 'payments', message: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mt-8 bg-forest/5 border border-forest/20 rounded-2xl p-6 text-center space-y-3 fade-up">
        <div className="w-12 h-12 bg-forest rounded-full flex items-center justify-center mx-auto text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <p className="font-semibold text-forest-deep text-[15px]">Message Sent Successfully</p>
        <p className="text-[13px] text-forest/70">Our team will get back to you within 24 hours via email.</p>
        <button 
          onClick={() => setSuccess(false)}
          className="text-[13px] font-semibold text-forest-deep underline underline-offset-4 pt-2"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-terracotta/5 border border-terracotta/20 rounded-xl p-3 text-[13px] text-terracotta-deep font-medium">
          {error}
        </div>
      )}
      
      <div>
        <label className="text-[12px] font-semibold text-ink-soft uppercase tracking-[0.1em]">
          Full Name
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
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
          required
          value={formData.email}
          onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
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
            value={formData.topic}
            onChange={e => setFormData(p => ({ ...p, topic: e.target.value }))}
            className="w-full bg-cream-deep/40 border border-hair-soft rounded-xl px-4 py-3 text-[14px] text-ink focus:outline-none focus:border-forest/40 focus:bg-cream-soft transition-colors appearance-none cursor-pointer pr-10"
          >
            <option value="payments">Payments &amp; Payouts</option>
            <option value="account">Account Settings</option>
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
          required
          value={formData.message}
          onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
          placeholder="Tell us what's going on…"
          className="mt-2 w-full bg-cream-deep/40 border border-hair-soft rounded-xl px-4 py-3 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus:border-forest/40 focus:bg-cream-soft transition-colors resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-forest text-cream-soft py-3.5 rounded-full text-[14px] font-semibold hover:bg-forest-deep transition-all shadow-leaf disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Sending Message...' : 'Send Message'}
      </button>
    </form>
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
