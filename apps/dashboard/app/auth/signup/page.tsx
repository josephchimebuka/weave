'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { signup, storeSessionToken } from '../../lib/auth-client';
import { toast } from '../../components/Toaster';

const INPUT = 'w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400';

export default function SignupPage() {
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const fail = (msg: string) => { setError(msg); toast.error(msg); };
    if (!email.trim())                 return fail('A valid work email is required.');
    if (password.length < 8)           return fail('Use at least 8 characters for your password.');
    if (password !== confirmPassword)  return fail('Passwords do not match.');

    setLoading(true);
    const result = await signup(email, password);
    setLoading(false);
    if (!result.success) return fail(result.error);

    storeSessionToken(result.data.session.token);
    toast.success('Account created.');
    // Hard navigation so the server-rendered root layout picks up the new
    // session cookie instead of reusing the pre-auth (empty) RSC payload.
    window.location.assign('/verify-email');
  }

  return (
    <div className="w-full max-w-sm">
      {/* Brand */}
      <div className="text-center mb-8">
        <p className="text-2xl font-bold tracking-tight text-zinc-900">Weave</p>
        <p className="text-xs text-zinc-400 uppercase tracking-widest mt-1">Merchant Portal</p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Create account</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Set up your merchant access in under a minute.</p>
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
          <input
            placeholder="Password (8+ characters)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className={INPUT}
          />
          <input
            placeholder="Confirm password"
            type="password"
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
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-xs text-center text-zinc-400">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-zinc-700 font-medium hover:text-zinc-900 transition-colors">
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
