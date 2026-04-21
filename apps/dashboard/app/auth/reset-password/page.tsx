'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { resetPassword, storeSessionToken } from '../../lib/auth-client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [resetToken, setResetToken] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!resetToken.trim() || !otp.trim()) return setError('Reset token and OTP are required.');
    if (password.length < 8) return setError('Use at least 8 characters for your new password.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    const result = await resetPassword(resetToken, otp, password);
    setLoading(false);
    if (!result.success) return setError(result.error);

    storeSessionToken(result.data.session.token);
    router.push('/');
  }

  return (
    <main className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Set new password</h1>
          <p className="text-gray-500 mt-1">Verify your reset token and OTP, then choose a new password.</p>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <input
            placeholder="Reset token"
            value={resetToken}
            onChange={(e) => setResetToken(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <input
            placeholder="OTP code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" disabled={loading} className="w-full bg-gray-900 disabled:bg-gray-500 text-white rounded-lg py-2.5 text-sm font-medium">
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>
        <Link href="/auth/login" className="text-sm text-gray-900 hover:underline">Back to login</Link>
      </div>
    </main>
  );
}
