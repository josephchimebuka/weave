'use client';

import Link from 'next/link';
import { ArrowLeft, Scale } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-20 px-6 fade-up">
      <Link href="/support" className="inline-flex items-center gap-2 text-forest-deep font-semibold hover:text-forest transition-colors mb-12">
        <ArrowLeft size={16} />
        Back to Support
      </Link>

      <div className="space-y-12">
        <header className="space-y-4">
          <div className="w-16 h-16 bg-cream-deep rounded-2xl flex items-center justify-center text-ink-soft mb-6">
            <Scale size={32} />
          </div>
          <h1 className="font-display text-[56px] font-semibold text-ink tracking-tight leading-tight">Terms of Use</h1>
          <p className="text-ink-muted text-[17px]">Last Updated: April 25, 2026</p>
        </header>

        <section className="space-y-6 text-ink-soft leading-relaxed">
          <p>
            Welcome to Weave. By accessing our platform or using our APIs, you agree to be bound by these Terms of Use. Please read them carefully.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">1. Service Description</h2>
          <p>Weave provides cross-border payment processing and settlement services. Our platform allows merchants to accept fiat and cryptocurrency payments and settle them into their preferred currency or chain.</p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">2. Merchant Obligations</h2>
          <ul className="list-disc pl-6 space-y-3">
            <li><strong>KYB Requirements:</strong> You must provide accurate and complete business information for verification. Failure to pass KYB will result in blocked payouts.</li>
            <li><strong>Legal Compliance:</strong> You agree not to use Weave for any illegal activities, including money laundering, terrorist financing, or the sale of prohibited goods.</li>
            <li><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your API keys and dashboard credentials.</li>
          </ul>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">3. Settlement & Fees</h2>
          <p>
            Settlement times vary by corridor. While we strive for "instant" settlement on crypto-native paths, bank-led corridors generally settle within 30 seconds to 2 minutes. All fees are clearly displayed at the time of transaction or quote generation.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">4. Limitation of Liability</h2>
          <p>
            Weave is provided "as is." We are not liable for any indirect, incidental, or consequential damages arising from the use of our platform, including loss of funds due to third-party blockchain failures or user error (e.g., incorrect wallet addresses).
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">5. Termination</h2>
          <p>
            We reserve the right to suspend or terminate any account found in violation of these terms or exhibiting suspicious activity, at our sole discretion.
          </p>
        </section>

        <footer className="pt-10 border-t border-hair-soft text-[14px] text-ink-muted">
          By using our services, you acknowledge that you have read and understood these terms.
        </footer>
      </div>
    </div>
  );
}
