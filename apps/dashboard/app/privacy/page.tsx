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
          <p className="text-ink-muted text-[17px]">Last Updated: August 12, 2026</p>
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

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">4. Third-Party Sharing &amp; Consent</h2>
          <p>
            To provide the Services, we share information with the parties below. By using the Services and providing information (including
            information about your own customers), you consent to this sharing and confirm you have a lawful basis and, where required, the
            consent of the relevant individuals to have their data processed as described here:
          </p>
          <ul className="list-disc pl-6 space-y-3">
            <li><strong>Banking-as-a-service and payment-infrastructure providers</strong> that process transactions on our behalf, <strong>and
              their partner financial institutions</strong>, in order to open accounts, verify identity, collect payments, and settle funds.</li>
            <li><strong>Identity-verification, fraud, and compliance providers</strong> used to perform KYB/KYC, sanctions screening, and
              transaction monitoring.</li>
            <li><strong>Liquidity and settlement providers</strong> required to execute a chosen payment corridor.</li>
            <li><strong>Regulatory, law-enforcement, and other authorities</strong> where required by law or to meet a legal, regulatory, or
              provider obligation.</li>
          </ul>
          <p>
            We never sell your data to third parties for marketing purposes. Our providers are permitted to use the data only to deliver the
            Services and to meet their own legal and regulatory obligations.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">5. Your Data Protection Rights</h2>
          <p>
            We process personal data in accordance with the Nigeria Data Protection Act 2023 and other applicable data-protection laws. Subject
            to those laws, you have the right to access, rectify, erase, restrict the processing of, and port your personal data, and to withdraw
            consent where processing is based on it. To exercise any of these rights, contact us at
            <a href="mailto:hello@dewdroplabs.com" className="text-forest-deep underline"> hello@dewdroplabs.com</a>. Where you provide us with
            personal data about your own customers, you are responsible for informing them and obtaining any consent required for the processing
            and sharing described in this Policy.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">6. Data Retention</h2>
          <p>
            We retain personal and business information for as long as your account is active and thereafter for the period required to meet our
            legal, regulatory, tax, and compliance obligations (including KYB/AML record-keeping), after which it is deleted or anonymised.
          </p>
        </section>

        <footer className="pt-10 border-t border-hair-soft text-[14px] text-ink-muted">
          Need clarification? Contact our privacy officer at <a href="mailto:hello@dewdroplabs.com" className="text-forest-deep underline">hello@dewdroplabs.com</a>
        </footer>
      </div>
    </div>
  );
}
