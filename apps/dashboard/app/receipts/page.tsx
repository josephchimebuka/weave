import Link from 'next/link';
import { fetchOrders } from '../lib/dashboard-api';

export default async function ReceiptsPage() {
  const orders = (await fetchOrders(10)).filter((o) => o.status === 'completed');

  return (
    <main className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Receipts</h1>
        <p className="text-gray-500 mt-1">Completed transactions with downloadable receipt detail.</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-sm text-gray-500">No completed transactions yet.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {orders.map((o) => (
            <Link key={o.id} href={`/transactions/${o.id}`} className="block p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-blue-600">{o.id}</p>
                <p className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleString('en-GB')}</p>
              </div>
              <p className="text-sm text-gray-700 mt-1">{o.sourceAssetKey} → {o.destAssetKey}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

