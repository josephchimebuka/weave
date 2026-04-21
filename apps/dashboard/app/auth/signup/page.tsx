'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signup, storeSessionToken } from '../../lib/auth-client';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('A valid work email is required.');
    if (password.length < 8) return setError('Use a password with at least 8 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    const result = await signup(email, password);
    setLoading(false);
    if (!result.success) return setError(result.error);

    storeSessionToken(result.data.session.token);
    router.push('/');
  }

  return (
    <main className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create merchant account</h1>
          <p className="text-gray-500 mt-1">Set up dashboard access in under a minute.</p>
        </div>

        <form className="grid grid-cols-1 gap-4" onSubmit={onSubmit}>
          <input
            placeholder="Work email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <input
            placeholder="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" disabled={loading} className="bg-gray-900 disabled:bg-gray-500 text-white rounded-lg py-2.5 text-sm font-medium">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-gray-500">
          Already have an account? <Link href="/auth/login" className="text-gray-900 hover:underline">Login</Link>
        </p>
      </div>
    </main>
  );
}
