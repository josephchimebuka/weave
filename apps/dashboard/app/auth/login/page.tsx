'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, storeSessionToken } from '../../lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    storeSessionToken(result.data.session.token);
    router.push('/');
  }

  return (
    <main className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Merchant login</h1>
          <p className="text-gray-500 mt-1">Sign in to continue managing payments, payouts, and integrations.</p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <input
            placeholder="Work email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 disabled:bg-gray-500 text-white rounded-lg py-2.5 text-sm font-medium"
          >
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <div className="text-sm text-gray-500 flex justify-between">
          <Link href="/auth/forgot-password" className="hover:underline">Forgot password?</Link>
          <Link href="/auth/signup" className="text-gray-900 hover:underline">Create account</Link>
        </div>
      </div>
    </main>
  );
}
