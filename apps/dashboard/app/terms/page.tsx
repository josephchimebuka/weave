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
          <p className="text-ink-muted text-[17px]">Last Updated: August 12, 2026</p>
        </header>

        <section className="space-y-6 text-ink-soft leading-relaxed">
          <p>
            These Terms of Use (the &ldquo;Terms&rdquo;) govern your access to and use of the Weave platform, dashboard, APIs, and related
            services (together, the &ldquo;Services&rdquo;). The Services are operated by <strong>Dewdrop Labs Limited</strong>, a company duly
            incorporated under the laws of the Federal Republic of Nigeria (&ldquo;Dewdrop Labs&rdquo;, &ldquo;Weave&rdquo;, &ldquo;we&rdquo;,
            &ldquo;us&rdquo;, or &ldquo;our&rdquo;). By creating an account, accessing the platform, or using our APIs, you (the
            &ldquo;Merchant&rdquo;, &ldquo;you&rdquo;, or &ldquo;your&rdquo;) agree to be bound by these Terms. Please read them carefully. If you
            do not agree, do not use the Services.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">1. The Service</h2>
          <p>
            Weave is a payment-orchestration platform. We enable Merchants to accept payment from their customers across supported
            payment methods and to receive settlement in a chosen corridor &mdash; Naira to a bank account, or a supported digital asset to a
            wallet. Weave orchestrates the routing, verification, status tracking, and reporting for each payment.
          </p>
          <p>
            <strong>Weave does not take custody of funds and is not a bank, deposit-taking institution, or licensed payment service
            provider.</strong> The regulated activities involved in a payment &mdash; including holding of funds, settlement, collection, and
            currency conversion &mdash; are performed by separately licensed third-party providers (each, a &ldquo;Provider&rdquo;). Your use of a
            payment corridor may be subject to the applicable Provider&rsquo;s own terms, verification requirements, and limits.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">2. Eligibility &amp; Account Registration</h2>
          <p>
            To use the Services you must be a business or a person acting on behalf of a business, and you must be able to form a legally
            binding contract. You agree to provide accurate, current, and complete information during registration and to keep it up to
            date. You are responsible for all activity that occurs under your account.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">3. Merchant Obligations</h2>
          <ul className="list-disc pl-6 space-y-3">
            <li><strong>Verification (KYB):</strong> You must provide accurate and complete business and director information for
              Know-Your-Business verification. Access to certain features and payouts may be limited or blocked until verification is
              completed and approved.</li>
            <li><strong>Legal compliance:</strong> You will use the Services only for lawful purposes and in compliance with all applicable
              laws and regulations, including anti-money-laundering, counter-terrorist-financing, sanctions, and data-protection laws.</li>
            <li><strong>Account security:</strong> You are responsible for maintaining the confidentiality of your API keys, secret keys, and
              dashboard credentials, and for all actions taken using them. Notify us immediately of any suspected compromise.</li>
            <li><strong>Accurate instructions:</strong> You are responsible for the accuracy of the payment and settlement details you
              provide (including bank account and wallet details). We are not liable for losses arising from inaccurate instructions.</li>
          </ul>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">4. Acceptable Use &amp; Prohibited Activities</h2>
          <p>You agree not to use the Services, and not to permit any person to use the Services, to:</p>
          <ul className="list-disc pl-6 space-y-3">
            <li>engage in money laundering, terrorist financing, fraud, or any other criminal activity;</li>
            <li>transact with sanctioned persons, entities, or jurisdictions, or in breach of any applicable sanctions regime;</li>
            <li>sell or facilitate prohibited or restricted goods or services, or any activity prohibited by a Provider; or</li>
            <li>interfere with, disrupt, reverse-engineer, or attempt to gain unauthorised access to the Services or their infrastructure.</li>
          </ul>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">5. Compliance, KYC/AML &amp; Sanctions Screening</h2>
          <p>
            As a condition of providing the Services, we and our Providers may carry out identity verification, sanctions and
            politically-exposed-person screening, and ongoing transaction monitoring. You agree to provide information and documentation we
            reasonably request for these purposes, and you acknowledge that we may decline, delay, suspend, or reverse a transaction, or
            suspend an account, where required to meet a legal, regulatory, or Provider obligation.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">6. Quotes, Settlement &amp; Timing</h2>
          <p>
            Where a payment involves currency conversion, the applicable rate is the one quoted at the time of the transaction. Settlement
            times vary by corridor: bank-led Naira corridors generally settle within 30 seconds to 2 minutes, and digital-asset payouts are
            typically near-instant, but settlement is not guaranteed and may be affected by Provider processing, verification, network
            conditions, or events beyond our control.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">7. Fees, Taxes &amp; Stamp Duty</h2>
          <p>
            Our fees are displayed at the time of quote generation or transaction, and/or as agreed with you in writing. Provider fees and
            statutory charges &mdash; including any applicable taxes and CBN stamp duty &mdash; may apply in addition and may be passed through to you
            or the payer. You are responsible for any taxes arising from your use of the Services other than taxes on our income.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">8. Refunds, Reversals &amp; Chargebacks</h2>
          <p>
            Refunds and reversals are handled in accordance with the applicable Provider&rsquo;s rules and may not be possible once a payment
            has settled, particularly for digital-asset transactions, which are generally irreversible. Where a payment is reversed, charged
            back, disputed, or found to be fraudulent or made in error, you authorise us and our Providers to reverse the corresponding
            settlement or to recover the amount (together with any associated fees) from you or your settlement balance.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">9. Customer Data &amp; Privacy</h2>
          <p>
            Our collection and use of personal information is described in our <Link href="/privacy" className="text-forest-deep underline">Privacy
            Policy</Link>, and we process personal data in accordance with the Nigeria Data Protection Act 2023 and other applicable
            data-protection laws. Where you provide us with personal data about your customers, you confirm that you have a lawful basis to do
            so and to have it processed as described in the Privacy Policy.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">10. Electronic Communications &amp; Signatures</h2>
          <p>
            You consent to receive records, disclosures, and communications from us electronically, and to the use of electronic signatures,
            as set out in our <Link href="/esign-consent" className="text-forest-deep underline">Electronic Records and Signatures
            Consent</Link>.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">11. Intellectual Property</h2>
          <p>
            The Services, and all software, content, logos, trademarks, and other materials made available through them, are owned by or
            licensed to Dewdrop Labs and are protected by intellectual-property laws. We grant you a limited, non-exclusive, non-transferable
            right to use the Services in accordance with these Terms. Nothing in these Terms grants you any right to use our trademarks or
            intellectual property without our prior written consent.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">12. Service Availability &amp; Force Majeure</h2>
          <p>
            We aim to keep the Services available but do not guarantee uninterrupted or error-free operation. The Services may be unavailable
            during scheduled or emergency maintenance, or due to failures of telecommunications, internet, blockchain, or Provider systems.
            We are not liable for any failure or delay in performance caused by events beyond our reasonable control.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">13. Disclaimers &amp; Limitation of Liability</h2>
          <p>
            The Services are provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind, whether express or
            implied, to the fullest extent permitted by law. We are not liable for any indirect, incidental, special, or consequential
            damages, or for loss of funds arising from third-party Provider or blockchain failures, or from your own error (for example, an
            incorrect wallet address or bank account).
          </p>
          <p>
            To the fullest extent permitted by law, our total aggregate liability arising out of or in connection with the Services will not
            exceed the total fees you paid to Weave in the three (3) months preceding the event giving rise to the claim. Nothing in these
            Terms excludes or limits liability that cannot be excluded or limited under applicable law.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">14. Indemnity</h2>
          <p>
            You agree to indemnify and hold harmless Dewdrop Labs and its officers, employees, and agents from and against any losses,
            liabilities, claims, and expenses (including reasonable legal fees) arising out of your breach of these Terms, your violation of
            any law or third-party right, inaccurate instructions or information you provide, or your misuse of the Services &mdash; except to the
            extent caused by our own gross negligence, fraud, or wilful misconduct.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">15. Suspension &amp; Termination</h2>
          <p>
            We may suspend or terminate your access to the Services, in whole or in part, where we reasonably consider it necessary &mdash;
            including where your account is in violation of these Terms, exhibits suspicious activity, or where required to meet a legal,
            regulatory, or Provider obligation. Where practicable and lawful, we will give you notice. You may stop using the Services at any
            time. Provisions that by their nature should survive termination (including fees owed, indemnity, and limitation of liability)
            will survive.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">16. Changes to these Terms</h2>
          <p>
            We may update these Terms from time to time. If we make a material change, we will notify you electronically and, where a change
            increases fees or materially reduces your rights, we will endeavour to give you reasonable prior notice before it takes effect,
            except where a shorter period is required by law or a regulator. Your continued use of the Services after a change takes effect
            constitutes acceptance of the updated Terms.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">17. Governing Law &amp; Dispute Resolution</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any dispute arising out
            of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Nigeria, without prejudice to
            any right the parties may agree to resolve a dispute by arbitration or other alternative means.
          </p>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">18. General</h2>
          <ul className="list-disc pl-6 space-y-3">
            <li><strong>Assignment:</strong> You may not assign or transfer your rights under these Terms without our prior written consent.
              We may assign our rights and obligations to an affiliate or successor.</li>
            <li><strong>Severability:</strong> If any provision is found invalid or unenforceable, the remaining provisions continue in full
              force and effect.</li>
            <li><strong>Waiver:</strong> No failure or delay in exercising a right is a waiver of it, and any waiver must be given expressly in
              writing.</li>
            <li><strong>Entire agreement:</strong> These Terms, together with the Privacy Policy and the Electronic Records and Signatures
              Consent, constitute the entire agreement between you and us regarding the Services.</li>
            <li><strong>Notices:</strong> We may give notices to you electronically. You may contact us at the address below.</li>
          </ul>

          <h2 className="text-[24px] font-semibold text-ink font-display mt-10">19. Contact</h2>
          <p>
            Dewdrop Labs Limited &middot; Enugu, Nigeria &middot; <a href="mailto:hello@dewdroplabs.com" className="text-forest-deep underline">hello@dewdroplabs.com</a>
          </p>
        </section>

        <footer className="pt-10 border-t border-hair-soft text-[14px] text-ink-muted">
          By using our Services, you acknowledge that you have read and understood these Terms.
        </footer>
      </div>
    </div>
  );
}
