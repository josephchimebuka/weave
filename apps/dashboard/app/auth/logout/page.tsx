'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clearSessionToken, logout, readSessionToken } from '../../lib/auth-client';

export default function LogoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    if (!result.success) {
      setError(result.error);
      return;
    }
    clearSessionToken();
    router.push('/auth/login');
  }

  return (
    <main className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sign out</h1>
          <p className="text-gray-500 mt-1">End your active merchant dashboard session on this device.</p>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex gap-3">
          <button type="button" onClick={onLogout} disabled={loading} className="bg-gray-900 disabled:bg-gray-500 text-white rounded-lg px-4 py-2.5 text-sm font-medium">
            {loading ? 'Signing out…' : 'Confirm logout'}
          </button>
          <Link href="/" className="px-4 py-2.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</Link>
        </div>
      </div>
    </main>
  );
}
