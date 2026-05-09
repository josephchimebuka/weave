'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { forgotPassword } from '../../lib/auth-client';
import { toast } from '../../components/Toaster';

const INPUT = 'w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400';

export default function ForgotPasswordPage() {
  const [email,    setEmail]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [devToken, setDevToken] = useState('');
  const [devOtp,   setDevOtp]   = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setSuccess(''); setDevToken(''); setDevOtp('');
    if (!email.trim()) {
      const msg = 'Enter the email tied to your account.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      toast.error(result.error);
      return;
    }

    setSuccess(result.data.message);
    toast.success('Reset instructions sent.');
    if (result.data.resetToken) setDevToken(result.data.resetToken);
    if (result.data.otpCode)    setDevOtp(result.data.otpCode);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <p className="text-2xl font-bold tracking-tight text-zinc-900">Weave</p>
        <p className="text-xs text-zinc-400 uppercase tracking-widest mt-1">Merchant Portal</p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Reset password</h1>
          <p className="text-sm text-zinc-500 mt-0.5">We'll generate a reset token and OTP code.</p>
        </div>

        <form className="space-y-3" onSubmit={onSubmit}>
          <input
            placeholder="Work email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={INPUT}
          />
          {error && (
            <p className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
              {success}
            </p>
          )}
          {devToken && (
            <div className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 space-y-1">
              <p>Reset token: <span className="font-mono text-zinc-700">{devToken}</span></p>
              {devOtp && <p>OTP code: <span className="font-mono text-zinc-700">{devOtp}</span></p>}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 disabled:bg-zinc-400 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            {loading ? 'Generating…' : 'Send reset instructions'}
          </button>
        </form>

        <div className="flex justify-between text-xs text-zinc-400">
          <Link href="/auth/login"         className="hover:text-zinc-900 transition-colors">← Back to sign in</Link>
          <Link href="/auth/reset-password" className="text-zinc-700 hover:text-zinc-900 transition-colors">Have a token?</Link>
        </div>
      </div>
    </div>
  );
}
