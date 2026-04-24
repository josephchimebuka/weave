'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clearSessionToken, logout, readSessionToken } from '../../lib/auth-client';

export default function LogoutPage() {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function onLogout() {
    setError('');
    setLoading(true);
    const token = readSessionToken();
    if (!token) {
      clearSessionToken();
      router.push('/auth/login');
      return;
    }
    const result = await logout(token);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    clearSessionToken();
    router.push('/auth/login');
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <p className="text-2xl font-bold tracking-tight text-zinc-900">Weave</p>
        <p className="text-xs text-zinc-400 uppercase tracking-widest mt-1">Merchant Portal</p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Sign out</h1>
          <p className="text-sm text-zinc-500 mt-0.5">This will end your active session on this device.</p>
        </div>

        {error && (
          <p className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onLogout}
            disabled={loading}
            className="flex-1 bg-zinc-900 disabled:bg-zinc-400 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            {loading ? 'Signing out…' : 'Confirm sign out'}
          </button>
          <Link
            href="/"
            className="px-4 py-2.5 text-sm rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
