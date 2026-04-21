'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { forgotPassword } from '../../lib/auth-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [devToken, setDevToken] = useState('');
  const [devOtp, setDevOtp] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDevToken('');
    setDevOtp('');
    if (!email.trim()) return setError('Enter the email tied to your account.');

    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);
    if (!result.success) return setError(result.error);

    setSuccess(result.data.message);
    if (result.data.resetToken) setDevToken(result.data.resetToken);
    if (result.data.otpCode) setDevOtp(result.data.otpCode);
  }

  return (
    <main className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reset password</h1>
          <p className="text-gray-500 mt-1">Request a reset token and OTP challenge.</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <input
            placeholder="Work email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-gray-700">{success}</p> : null}
          {devToken ? <p className="text-xs text-gray-500">Dev reset token: <span className="font-mono">{devToken}</span></p> : null}
          {devOtp ? <p className="text-xs text-gray-500">Dev OTP code: <span className="font-mono">{devOtp}</span></p> : null}
          <button type="submit" disabled={loading} className="w-full bg-gray-900 disabled:bg-gray-500 text-white rounded-lg py-2.5 text-sm font-medium">
            {loading ? 'Generating…' : 'Send reset instructions'}
          </button>
        </form>
        <Link href="/auth/login" className="text-sm text-gray-900 hover:underline">Back to login</Link>
      </div>
    </main>
  );
}
