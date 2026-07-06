'use client';

import Link from 'next/link';
import { FormEvent, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { resetPassword, storeSessionToken } from '../../lib/auth-client';
import { toast } from '../../components/Toaster';

const INPUT = 'w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  
  const [resetToken,      setResetToken]      = useState('');
  const [otp,             setOtp]             = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');

  // Auto-fill from URL params
  useEffect(() => {
    const tokenFromUrl = searchParams.get('resetToken');
    const otpFromUrl   = searchParams.get('otp');
    if (tokenFromUrl) setResetToken(tokenFromUrl);
    if (otpFromUrl)   setOtp(otpFromUrl);
  }, [searchParams]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const fail = (msg: string) => { setError(msg); toast.error(msg); };
    if (!resetToken.trim() || !otp.trim()) return fail('Reset token and OTP code are required.');
    if (password.length < 8)               return fail('Use at least 8 characters for your new password.');
    if (password !== confirmPassword)      return fail('Passwords do not match.');

    setLoading(true);
    const result = await resetPassword(resetToken, otp, password);
    setLoading(false);
    if (!result.success) return fail(result.error);

    storeSessionToken(result.data.session.token);
    toast.success('Password reset. Welcome back.');
    // Hard navigation so the server-rendered root layout picks up the new
    // session cookie instead of reusing the pre-auth (empty) RSC payload.
    window.location.assign('/');
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <p className="text-2xl font-bold tracking-tight text-zinc-900">Weave</p>
        <p className="text-xs text-zinc-400 uppercase tracking-widest mt-1">Merchant Portal</p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Set new password</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Paste your reset token and OTP, then choose a new password.</p>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <input
            placeholder="Reset token"
            value={resetToken}
            onChange={(e) => setResetToken(e.target.value)}
            className={INPUT}
          />
          <input
            placeholder="6-digit OTP code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            className={INPUT}
          />
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className={INPUT}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className={INPUT}
          />
          {error && (
            <p className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 disabled:bg-zinc-400 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <Link href="/auth/login" className="block text-xs text-center text-zinc-400 hover:text-zinc-900 transition-colors">
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
