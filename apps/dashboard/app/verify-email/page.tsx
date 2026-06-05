'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, CheckCircle, RefreshCw, ArrowRight } from 'lucide-react';

type Stage = 'sending' | 'input' | 'success' | 'error';

export default function VerifyEmailPage() {
  const router      = useRouter();
  const [stage,     setStage]     = useState<Stage>('sending');
  const [otp,       setOtp]       = useState('');
  const [error,     setError]     = useState('');
  const [verifying, setVerifying] = useState(false);
  const [cooldown,  setCooldown]  = useState(0);
  const [email,     setEmail]     = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    sendCode();
    // Fetch email from session for display
    fetch('/api/auth/session', { headers: { 'x-session-token': readToken() } })
      .then(r => r.json())
      .then(j => { if (j?.data?.user?.email) setEmail(j.data.user.email); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Count down the resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function readToken(): string {
    if (typeof document === 'undefined') return '';
    const name = 'weave_session=';
    for (const c of decodeURIComponent(document.cookie).split(';')) {
      const trimmed = c.trim();
      if (trimmed.startsWith(name)) return trimmed.slice(name.length);
    }
    return '';
  }

  async function sendCode() {
    setStage('sending');
    setError('');
    try {
      const res  = await fetch('/api/kyc?action=send', { method: 'POST' });
      const json = await res.json();
      if (json.data?.alreadyVerified) {
        router.replace('/');
        return;
      }
      if (!json.success && res.status !== 429) {
        setStage('error');
        setError(json.error || 'Failed to send code.');
        return;
      }
      setStage('input');
      setCooldown(60);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch {
      setStage('error');
      setError('Unable to reach the server. Check your connection.');
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) { setError('Enter the full 6-digit code.'); return; }
    setVerifying(true);
    setError('');
    try {
      const res  = await fetch('/api/kyc?action=verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ otp }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Invalid code.');
        setVerifying(false);
        return;
      }
      setStage('success');
      setTimeout(() => router.replace('/links'), 1800);
    } catch {
      setError('Something went wrong. Please try again.');
      setVerifying(false);
    }
  }

  if (stage === 'success') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 fade-up">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-forest/20 rounded-full animate-ping opacity-30" />
          <div className="relative w-20 h-20 bg-forest rounded-full flex items-center justify-center shadow-leaf ring-8 ring-forest-surface">
            <CheckCircle size={40} className="text-white" strokeWidth={2.5} />
          </div>
        </div>
        <h1 className="font-display text-[32px] font-semibold text-ink mb-3">Email Verified</h1>
        <p className="text-ink-muted text-[16px]">Taking you to Payment Links…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 fade-up">

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-forest/10 rounded-full flex items-center justify-center mx-auto">
            <Mail size={28} className="text-forest" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="font-display text-[30px] font-semibold text-ink tracking-tight">
              Verify your email
            </h1>
            <p className="text-ink-muted text-[15px] mt-2 leading-relaxed">
              {stage === 'sending'
                ? 'Sending verification code…'
                : `We sent a 6-digit code to ${email || 'your email'}.`}
            </p>
          </div>
        </div>

        {/* OTP Form */}
        {stage === 'input' && (
          <div className="bg-cream-soft border border-hair-soft rounded-[28px] p-8 shadow-sm space-y-6">
            <form onSubmit={verify} className="space-y-5">
              <div>
                <label className="block text-[12px] font-semibold text-ink-soft uppercase tracking-widest mb-2">
                  Verification Code
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(v);
                    setError('');
                  }}
                  className="w-full text-center text-[28px] font-bold tracking-[0.5em] bg-cream-deep/50 border border-hair-soft rounded-2xl px-4 py-4 text-ink focus:outline-none focus:border-forest/40 transition-colors"
                />
                {error && (
                  <p className="mt-2 text-[13px] text-terracotta text-center">{error}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={verifying || otp.length !== 6}
                className="w-full inline-flex items-center justify-center gap-2 bg-forest hover:bg-forest-deep text-cream-soft py-3.5 rounded-full text-[15px] font-semibold transition-all shadow-leaf disabled:opacity-50"
              >
                {verifying ? 'Verifying…' : 'Verify Email'}
                {!verifying && <ArrowRight size={16} strokeWidth={2.2} />}
              </button>
            </form>

            <div className="text-center">
              {cooldown > 0 ? (
                <p className="text-[13px] text-ink-muted">
                  Resend available in <span className="font-semibold text-ink">{cooldown}s</span>
                </p>
              ) : (
                <button
                  onClick={sendCode}
                  className="inline-flex items-center gap-1.5 text-[13px] text-forest-deep font-medium hover:text-forest transition-colors"
                >
                  <RefreshCw size={13} strokeWidth={2.2} />
                  Resend code
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error state */}
        {stage === 'error' && (
          <div className="bg-cream-soft border border-hair-soft rounded-[28px] p-8 shadow-sm text-center space-y-4">
            <p className="text-[14px] text-terracotta">{error}</p>
            <button
              onClick={sendCode}
              className="inline-flex items-center gap-2 text-[14px] font-semibold text-forest-deep hover:text-forest transition-colors"
            >
              <RefreshCw size={14} strokeWidth={2.2} />
              Try again
            </button>
          </div>
        )}

        {/* Skip for now */}
        <div className="text-center">
          <button
            onClick={() => router.replace('/')}
            className="text-[13px] text-ink-faint hover:text-ink-muted transition-colors"
          >
            Skip for now — I'll verify later
          </button>
        </div>

      </div>
    </div>
  );
}
