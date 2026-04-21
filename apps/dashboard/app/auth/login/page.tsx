import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Merchant login</h1>
          <p className="text-gray-500 mt-1">Access your Weave merchant operations dashboard.</p>
        </div>

        <form className="space-y-4">
          <input placeholder="Work email" type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Password" type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button type="button" className="w-full bg-emerald-700 text-white rounded-lg py-2.5 text-sm font-medium">Login</button>
        </form>

        <div className="text-sm text-gray-500 flex justify-between">
          <Link href="/auth/forgot-password" className="hover:underline">Forgot password?</Link>
          <Link href="/auth/signup" className="text-emerald-700 hover:underline">Create account</Link>
        </div>
      </div>
    </main>
  );
}

