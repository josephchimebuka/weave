'use client';

import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-20 px-6 fade-up">
      <Link href="/support" className="inline-flex items-center gap-2 text-forest-deep font-semibold hover:text-forest transition-colors mb-12">
        <ArrowLeft size={16} />
        Back to Support
      </Link>

      <div className="space-y-12">
        <header className="space-y-4">
          <div className="w-16 h-16 bg-forest-surface rounded-2xl flex items-center justify-center text-forest-deep mb-6">
            <Shield size={32} />
          </div>
          <h1 className="font-display text-[56px] font-semibold text-ink tracking-tight leading-tight">Privacy Policy</h1>
          <p className="text-ink-muted text-[17px]">Last Updated: April 25, 2026</p>
        </header>

        <section className="space-y-6 text-ink-soft leading-relaxed">
          <p>
            At Weave (a product of Dewdrop Labs), your privacy is our priority. This Privacy Policy explains how we collect, use, and protect your personal and business information when you use our platform and services.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">1. Information We Collect</h2>
          <p> We collect information to provide and improve our payment services, including:</p>
          <ul className="list-disc pl-6 space-y-3">
            <li><strong>Personal Information:</strong> Name, email address, phone number, and physical address.</li>
            <li><strong>Business Information:</strong> Legal business name, registration details, tax identification numbers, and business documentation (KYB).</li>
            <li><strong>Financial Information:</strong> Bank account details, wallet addresses, and transaction history.</li>
            <li><strong>Usage Data:</strong> IP addresses, browser types, and interaction data with our APIs and dashboard.</li>
          </ul>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">2. How We Use Your Information</h2>
          <p>We use the data we collect to:</p>
          <ul className="list-disc pl-6 space-y-3">
            <li>Process and settle transactions across fiat and crypto corridors.</li>
            <li>Verify business identities (KYB) and prevent fraudulent activity.</li>
            <li>Provide technical support and platform updates.</li>
            <li>Comply with anti-money laundering (AML) and counter-terrorism financing (CTF) regulations.</li>
          </ul>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">3. Data Security & Storage</h2>
          <p>
            We implement industry-standard security measures, including AES-256 encryption and secure socket layer (SSL) technology. Your sensitive documentation is stored using secure cloud providers with restricted access. We do not store full payment card details; these are handled by PCI-compliant partners.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">4. Third-Party Sharing</h2>
          <p>
            We may share information with banking partners, liquidity providers, and regulatory authorities as required to execute transactions and maintain compliance. We never sell your data to third parties for marketing purposes.
          </p>
        </section>

        <footer className="pt-10 border-t border-hair-soft text-[14px] text-ink-muted">
          Need clarification? Contact our privacy officer at <a href="mailto:privacy@weave.com" className="text-forest-deep underline">privacy@weave.com</a>
        </footer>
      </div>
    </div>
  );
}
