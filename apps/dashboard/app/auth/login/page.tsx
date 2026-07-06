'use client';

import Link from 'next/link';
import { FormEvent, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, storeSessionToken, readSessionToken } from '../../lib/auth-client';
import { toast } from '../../components/Toaster';

const INPUT = 'w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    const token = readSessionToken();
    if (token) {
      router.push('/');
    }
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      const msg = 'Enter your email and password to continue.';
      setError(msg);
      toast.error(msg);
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    storeSessionToken(result.data.session.token);
    toast.success('Welcome back.');
    // Hard navigation (not router.push) so the server-rendered root layout
    // re-reads the freshly-set session cookie. A soft nav would reuse the
    // stale RSC payload rendered before login, briefly showing the default
    // "My Business" / "Verify email" sidebar to an already-verified merchant.
    window.location.assign('/');
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
          <h1 className="text-lg font-semibold text-zinc-900">Sign in</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Welcome back — enter your credentials below.</p>
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
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
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
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="flex justify-between text-xs text-zinc-400">
          <Link href="/auth/forgot-password" className="hover:text-zinc-900 transition-colors">
            Forgot password?
          </Link>
          <Link href="/auth/signup" className="text-zinc-700 hover:text-zinc-900 transition-colors font-medium">
            Create account →
          </Link>
        </div>
      </div>
    </div>
  );
}
