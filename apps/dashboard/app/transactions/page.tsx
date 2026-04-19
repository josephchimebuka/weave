import { Order, assetLabel, directionOf, parseAsset } from '../types';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';
const API_KEY  = process.env.WEAVE_API_KEY || '';

async function getOrders(): Promise<Order[]> {
  try {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: { 'x-api-key': API_KEY },
      next:    { revalidate: 10 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

const STATUS_STYLES: Record<string, string> = {
  completed:        'text-green-600',
  processing:       'text-blue-600',
  bridging:         'text-blue-600',
  awaiting_deposit: 'text-yellow-600',
  refunded:         'text-gray-500',
  failed:           'text-red-600',
};

const STATUS_DOT: Record<string, string> = {
  completed:        'bg-green-500',
  processing:       'bg-blue-500',
  bridging:         'bg-blue-400',
  awaiting_deposit: 'bg-yellow-400',
  refunded:         'bg-gray-400',
  failed:           'bg-red-500',
};

const DIRECTION_STYLES: Record<string, string> = {
  offramp:  'bg-purple-50 text-purple-700',
  onramp:   'bg-orange-50 text-orange-700',
  bridge:   'bg-sky-50 text-sky-700',
  transfer: 'bg-gray-50 text-gray-700',
};

function fmtAmount(amount: number | null, assetKey: string): string {
  if (amount == null) return '—';
  const a = parseAsset(assetKey);
  const dp = a.kind === 'fiat' ? 0 : 4;
  const formatted = amount.toLocaleString(undefined, { maximumFractionDigits: dp });
  const suffix    = a.kind === 'fiat' ? a.currency : a.token;
  return `${formatted} ${suffix}`;
}

export default async function TransactionsPage() {
  const orders = await getOrders();

  return (
    <main className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Transactions</h1>
        <p className="text-gray-500 mt-1">
          {orders.length > 0 ? `${orders.length} order${orders.length !== 1 ? 's' : ''}` : 'No transactions yet.'}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">Transactions will appear here once the widget is live.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                <th className="p-4 font-medium">Order ID</th>
                <th className="p-4 font-medium">Date (UTC)</th>
                <th className="p-4 font-medium">Direction</th>
                <th className="p-4 font-medium">From</th>
                <th className="p-4 font-medium">To</th>
                <th className="p-4 font-medium">Pay in</th>
                <th className="p-4 font-medium">Merchant gets</th>
                <th className="p-4 font-medium">Route</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {orders.map((o) => {
                const dir   = directionOf(o);
                const route = (o.steps ?? []).map((s) => s.provider).join(' → ') || '—';
                return (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-mono text-blue-600 text-xs">{o.id.slice(0, 8)}…</td>
                    <td className="p-4 text-gray-600 whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${DIRECTION_STYLES[dir]}`}>
                        {dir}
                      </span>
                    </td>
                    <td className="p-4 text-gray-800 whitespace-nowrap">{assetLabel(o.sourceAssetKey)}</td>
                    <td className="p-4 text-gray-800 whitespace-nowrap">{assetLabel(o.destAssetKey)}</td>
                    <td className="p-4 text-gray-800 font-medium whitespace-nowrap">
                      {fmtAmount(o.sourceAmount, o.sourceAssetKey)}
                    </td>
                    <td className="p-4 text-gray-800 whitespace-nowrap">
                      {fmtAmount(o.destAmount, o.destAssetKey)}
                    </td>
                    <td className="p-4 text-gray-500 text-xs whitespace-nowrap">{route}</td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1.5 font-medium ${STATUS_STYLES[o.status] ?? 'text-gray-500'}`}>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[o.status] ?? 'bg-gray-400'}`} />
                        {o.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
