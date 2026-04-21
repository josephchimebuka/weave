import Link from 'next/link';

export default function SignupPage() {
  return (
    <main className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create merchant account</h1>
          <p className="text-gray-500 mt-1">Start onboarding your business to accept crypto ↔ fiat checkout payments.</p>
        </div>

        <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input placeholder="Business legal name" className="md:col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Work email" type="email" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Phone number" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Password" type="password" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Confirm password" type="password" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button type="button" className="md:col-span-2 bg-emerald-700 text-white rounded-lg py-2.5 text-sm font-medium">Create account</button>
        </form>

        <p className="text-sm text-gray-500">
          Already have an account? <Link href="/auth/login" className="text-emerald-700 hover:underline">Login</Link>
        </p>
      </div>
    </main>
  );
}

