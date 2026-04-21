import Link from 'next/link';

export default function AuthIndexPage() {
  return (
    <main className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Authentication</h1>
        <p className="text-gray-500 mt-1">Manage merchant login and account access journeys.</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <Link href="/auth/login" className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50">Login</Link>
        <Link href="/auth/signup" className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50">Sign up</Link>
        <Link href="/auth/forgot-password" className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50">Forgot password</Link>
        <Link href="/auth/reset-password" className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50">Reset password</Link>
        <Link href="/auth/logout" className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50">Logout</Link>
      </div>
    </main>
  );
}
