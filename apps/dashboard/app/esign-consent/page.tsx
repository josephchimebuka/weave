'use client';

import Link from 'next/link';
import { ArrowLeft, PenLine } from 'lucide-react';

export default function EsignConsentPage() {
  return (
    <div className="max-w-4xl mx-auto py-20 px-6 fade-up">
      <Link href="/support" className="inline-flex items-center gap-2 text-forest-deep font-semibold hover:text-forest transition-colors mb-12">
        <ArrowLeft size={16} />
        Back to Support
      </Link>

      <div className="space-y-12">
        <header className="space-y-4">
          <div className="w-16 h-16 bg-forest-surface rounded-2xl flex items-center justify-center text-forest-deep mb-6">
            <PenLine size={32} />
          </div>
          <h1 className="font-display text-[56px] font-semibold text-ink tracking-tight leading-tight">Electronic Records and Signatures Consent</h1>
          <p className="text-ink-muted text-[17px]">Last Updated: August 12, 2026</p>
        </header>

        <section className="space-y-6 text-ink-soft leading-relaxed">
          <p>
            This Electronic Records and Signatures Consent (this &ldquo;Consent&rdquo;) applies to your use of the services provided by
            <strong> Dewdrop Labs Limited</strong> (&ldquo;Dewdrop Labs&rdquo;, &ldquo;Weave&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or
            &ldquo;our&rdquo;) through the Weave platform (the &ldquo;Services&rdquo;). To use the Services, you must agree to receive certain
            records and disclosures electronically and to transact with us using electronic signatures. Please read this Consent carefully and
            keep a copy for your records.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">1. Scope of your consent</h2>
          <p>Your consent covers all records, agreements, disclosures, notices, and communications (&ldquo;Records&rdquo;) that we provide to
            you or that you sign in connection with the Services, including:</p>
          <ul className="list-disc pl-6 space-y-3">
            <li>the Terms of Use and Privacy Policy, and any updates to them;</li>
            <li>account opening, verification (KYB/KYC), and onboarding documents;</li>
            <li>transaction confirmations, receipts, statements, and settlement or payout notices;</li>
            <li>fee schedules and changes to them;</li>
            <li>legal, regulatory, tax, and compliance notices; and</li>
            <li>any other communications relating to your account or the Services.</li>
          </ul>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">2. Consent to electronic Records and signatures</h2>
          <p>By agreeing to this Consent, you:</p>
          <ul className="list-disc pl-6 space-y-3">
            <li>agree that we may provide all Records to you electronically &mdash; by posting them within the Weave dashboard, emailing them to
              the address on file, or another electronic method we reasonably choose;</li>
            <li>agree that your electronic signature (including clicking &ldquo;I agree&rdquo;, &ldquo;Accept&rdquo;, or &ldquo;Submit&rdquo;, or
              typing your name) has the same legal effect as a handwritten signature and binds you to the associated Record;</li>
            <li>agree that electronic Records and signatures may be used as evidence to the same extent as original paper documents; and</li>
            <li>confirm you are able to access and retain the Records as described in Section 5.</li>
          </ul>
          <p>
            This Consent is intended to comply with applicable Nigerian law recognising electronic records and signatures, including the
            Evidence Act 2011.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">3. Delivery method</h2>
          <p>
            We will deliver Records to you through the Weave dashboard and/or to the email address associated with your account. You agree
            that delivery by these methods constitutes valid delivery, whether or not you actually access or read the Record. It is your
            responsibility to review Records we make available to you.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">4. Keeping your information current</h2>
          <p>
            You must keep the contact information on your account &mdash; in particular your email address &mdash; accurate and up to date so that we
            can deliver Records to you. You can update it in your account settings or by contacting us at
            <a href="mailto:hello@dewdroplabs.com" className="text-forest-deep underline"> hello@dewdroplabs.com</a>. If your email address
            becomes invalid such that Records are returned as undeliverable, we may treat this as a withdrawal of your consent (see Section 7).
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">5. Hardware and software requirements</h2>
          <p>To access and retain Records, you will need a device with internet access, a current web browser, a valid and accessible email
            account, software able to view and save or print PDF and HTML documents, and sufficient storage to retain Records or the ability to
            print them. If our system requirements change in a way that creates a material risk you cannot access or retain Records, we will
            notify you and give you the opportunity to withdraw your consent without charge.</p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">6. Requesting paper copies</h2>
          <p>
            You may request a paper copy of any Record we provided electronically by contacting us at
            <a href="mailto:hello@dewdroplabs.com" className="text-forest-deep underline"> hello@dewdroplabs.com</a>. Requesting a paper copy
            does not, by itself, withdraw your consent to receive Records electronically.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">7. Withdrawing your consent</h2>
          <p>
            You may withdraw your consent to receive Records electronically at any time by contacting us at
            <a href="mailto:hello@dewdroplabs.com" className="text-forest-deep underline"> hello@dewdroplabs.com</a>. Because the Services are
            provided electronically, withdrawing your consent may mean we can no longer provide the Services to you, and we may suspend or close
            your account. Withdrawal is effective only after we have had a reasonable period to process it, and it does not affect the validity
            of Records provided or signatures made before it took effect.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">8. Changes to this Consent</h2>
          <p>
            We may update this Consent from time to time. If we make a material change, we will notify you electronically. Your continued use
            of the Services after the update takes effect constitutes your acceptance of the revised Consent.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">9. Affirmative consent</h2>
          <p>
            You hereby give your affirmative consent to the provision of electronic Records and to the use of electronic signatures as
            described in this Consent. By clicking &ldquo;I agree&rdquo; (or the equivalent), creating an account, or using the Services, you
            confirm that you have read and understood this Consent, that you can access and retain electronic Records, that you consent to
            receive Records electronically and to use electronic signatures, and that you are authorised to bind the account holder to this
            Consent.
          </p>
          <p className="text-[15px] text-ink-muted">
            Merchants who complete onboarding by signed document rather than by click-to-accept may execute this Consent in counterpart on
            request; either method constitutes valid consent. See also our <Link href="/terms" className="text-forest-deep underline">Terms of
            Use</Link> and <Link href="/privacy" className="text-forest-deep underline">Privacy Policy</Link>.
          </p>
        </section>

        <footer className="pt-10 border-t border-hair-soft text-[14px] text-ink-muted">
          Dewdrop Labs Limited &middot; Enugu, Nigeria &middot; <a href="mailto:hello@dewdroplabs.com" className="text-forest-deep underline">hello@dewdroplabs.com</a>
        </footer>
      </div>
    </div>
  );
}
