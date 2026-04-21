import Link from 'next/link';

export default function LogoutPage() {
  return (
    <main className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sign out</h1>
          <p className="text-gray-500 mt-1">End your active merchant dashboard session on this device.</p>
        </div>
        <div className="flex gap-3">
          <button type="button" className="bg-gray-900 text-white rounded-lg px-4 py-2.5 text-sm font-medium">Confirm logout</button>
          <Link href="/" className="px-4 py-2.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</Link>
        </div>
      </div>
    </main>
  );
}

