import Link from 'next/link';

export default function ResetPasswordPage() {
  return (
    <main className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Set new password</h1>
          <p className="text-gray-500 mt-1">Complete OTP verification and set a new password for your merchant account.</p>
        </div>
        <form className="space-y-4">
          <input placeholder="Reset token" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="OTP code" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input type="password" placeholder="New password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input type="password" placeholder="Confirm new password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button type="button" className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium">Reset password</button>
        </form>
        <Link href="/auth/login" className="text-sm text-emerald-700 hover:underline">Back to login</Link>
      </div>
    </main>
  );
}

