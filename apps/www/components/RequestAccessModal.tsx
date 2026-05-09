'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type Step = 'form' | 'booking' | 'success';

const FORM_STYLES = {
  input: `w-full bg-transparent border border-hair-soft rounded-lg px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest-mist transition-colors`,
  select: `w-full bg-transparent border border-hair-soft rounded-lg px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest-mist transition-colors`,
  label: `text-sm font-medium text-forest-deep mb-2 block`,
  error: `text-xs text-terracotta mt-1`,
};

export function RequestAccessModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    company: '',
    email: '',
    useCase: '',
    otherUseCase: '',
    volume: '',
    timeline: '',
  });

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep('form');
      setError(null);
      setFormData({ company: '', email: '', useCase: '', otherUseCase: '', volume: '', timeline: '' });
    }
  }, [isOpen]);

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.company.trim() || !formData.email.trim() || !formData.useCase) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.useCase === 'other' && !formData.otherUseCase.trim()) {
      setError('Please describe your use case');
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    // Just move to booking step - form data stays in local state
    setStep('booking');
  }

  async function handleBookingComplete() {
    // Booking is already confirmed on Calendly; the access-request POST is a
    // best-effort admin notification. Failures are intentionally swallowed —
    // the user has already converted, and surfacing an error would only
    // confuse them. We still log to the console for diagnostics.
    setLoading(true);
    try {
      // NEXT_PUBLIC_API_URL already includes the /api/v1 prefix.
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/access-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error('[access-request] admin notification failed:', data?.error ?? res.status);
      }
    } catch (err) {
      console.error('[access-request] network error:', err);
    } finally {
      setLoading(false);
      setStep('success');
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-lg max-w-md w-full max-h-[65vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-forest-surface px-6 py-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-forest-deep">
            {step === 'form' && 'Request Access'}
            {step === 'booking' && 'Book a Call'}
            {step === 'success' && 'Confirmed!'}
          </h2>
          <button
            onClick={onClose}
            className="text-forest-deep/60 hover:text-forest-deep transition-colors p-1"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'form' && (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className={FORM_STYLES.label}>
                  Company name <span className="text-terracotta">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Acme Inc"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className={FORM_STYLES.input}
                />
              </div>

              <div>
                <label className={FORM_STYLES.label}>
                  Email <span className="text-terracotta">*</span>
                </label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={FORM_STYLES.input}
                />
              </div>

              <div>
                <label className={FORM_STYLES.label}>
                  Use case <span className="text-terracotta">*</span>
                </label>
                <select
                  value={formData.useCase}
                  onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                  className={FORM_STYLES.select}
                >
                  <option value="">Select a use case</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="saas">SaaS subscriptions</option>
                  <option value="marketplace">Marketplace</option>
                  <option value="remittance">Remittance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {formData.useCase === 'other' && (
                <div>
                  <label className={FORM_STYLES.label}>
                    Please describe your use case <span className="text-terracotta">*</span>
                  </label>
                  <textarea
                    placeholder="Tell us about your use case..."
                    value={formData.otherUseCase}
                    onChange={(e) => setFormData({ ...formData, otherUseCase: e.target.value })}
                    className={`${FORM_STYLES.input} resize-none`}
                    rows={3}
                  />
                </div>
              )}

              <div>
                <label className={FORM_STYLES.label}>Monthly transaction volume</label>
                <input
                  type="text"
                  placeholder="e.g. ₦100k - ₦1M"
                  value={formData.volume}
                  onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                  className={FORM_STYLES.input}
                />
              </div>

              <div>
                <label className={FORM_STYLES.label}>Timeline to launch</label>
                <select
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                  className={FORM_STYLES.select}
                >
                  <option value="">Select timeline</option>
                  <option value="immediate">Immediate (this week)</option>
                  <option value="2-4weeks">2-4 weeks</option>
                  <option value="1-3months">1-3 months</option>
                  <option value="3months+">3+ months</option>
                  <option value="exploring">Just exploring</option>
                </select>
              </div>

              {error && <p className={FORM_STYLES.error}>{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-forest hover:bg-forest-deep text-cream-soft py-2.5 rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-6 shadow-md"
              >
                {loading ? 'Processing...' : 'Continue'}
              </button>
            </form>
          )}

          {step === 'booking' && (
            <div className="space-y-4">
              <p className="text-sm text-forest-deep/70">
                Great! Now let's find a time that works for you. Click below to book a 30-minute discovery call with our team.
              </p>

              {/* Calendly Embed */}
              <div style={{ minHeight: 500 }}>
                <CalendlyEmbed onBookingComplete={handleBookingComplete} />
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-forest-mist rounded-full flex items-center justify-center mx-auto">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-forest"
                >
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div>
                <h3 className="font-display text-lg font-semibold text-forest-deep">
                  You're all set!
                </h3>
                <p className="text-sm text-forest-deep/60 mt-2">
                  Check your email for a booking confirmation. Our team will follow up with any questions.
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-forest hover:bg-forest-deep text-cream-soft py-2.5 rounded-lg font-medium transition-colors mt-6 shadow-md"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CalendlyEmbed({ onBookingComplete }: { onBookingComplete: () => void }) {
  const embedContainerId = 'calendly-embed-container';

  // Keep the latest callback in a ref so the message listener stays in sync
  // with the parent's current closure without re-attaching on every render.
  const onBookingCompleteRef = useRef(onBookingComplete);
  useEffect(() => {
    onBookingCompleteRef.current = onBookingComplete;
  }, [onBookingComplete]);

  useEffect(() => {
    let cancelled = false;

    // Don't double-mount the Calendly iframe in React StrictMode.
    const attemptInit = () => {
      if (!window.Calendly) return false;
      const target = document.getElementById(embedContainerId);
      if (!target || target.childElementCount > 0) return true;
      window.Calendly.initInlineWidget({
        url: 'https://calendly.com/dewdroplabs/30min',
        parentElement: target,
        resize: true,
      });
      return true;
    };

    attemptInit();

    let attempts = 0;
    const interval = setInterval(() => {
      if (cancelled || attemptInit() || attempts > 50) clearInterval(interval);
      attempts++;
    }, 100);

    function handleMessage(e: MessageEvent) {
      if (e.origin !== 'https://calendly.com') return;
      if (e.data?.event === 'calendly.event_scheduled') {
        setTimeout(() => onBookingCompleteRef.current(), 500);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <div
      id={embedContainerId}
      style={{
        minWidth: '320px',
        minHeight: '500px',
      }}
    />
  );
}

// Declare Calendly on window for TypeScript
declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (options: {
        url: string;
        parentElement: HTMLElement | null;
        resize?: boolean;
      }) => void;
    };
  }
}
