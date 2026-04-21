import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <main className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reset password</h1>
          <p className="text-gray-500 mt-1">Enter your account email to receive a reset link and OTP challenge.</p>
        </div>
        <form className="space-y-4">
          <input placeholder="Work email" type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button type="button" className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium">Send reset instructions</button>
        </form>
        <Link href="/auth/login" className="text-sm text-emerald-700 hover:underline">Back to login</Link>
      </div>
    </main>
  );
}

