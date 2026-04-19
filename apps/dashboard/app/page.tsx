import { Order, parseAsset, directionOf } from './types';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';
const API_KEY  = process.env.WEAVE_API_KEY || '';

async function getOrders(): Promise<Order[]> {
  try {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: { 'x-api-key': API_KEY },
      next:    { revalidate: 30 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function Page() {
  const orders    = await getOrders();
  const completed = orders.filter((o) => o.status === 'completed');

  // Merchant-received volume: group completed orders by the currency/token they
  // were actually paid out in (destAssetKey), summing destAmount. Skipping
  // USD-conversion keeps the numbers truthful per corridor — the dashboard
  // shows one row per currency rather than a lossy blended total.
  const payoutVolume: Record<string, number> = {};
  for (const o of completed) {
    if (o.destAmount == null) continue;
    payoutVolume[o.destAssetKey] = (payoutVolume[o.destAssetKey] ?? 0) + o.destAmount;
  }

  const corridors = Object.keys(payoutVolume);

  // Inbound source breakdown — for completed orders, show where the money
  // came from. If the source was crypto, group by chain; if fiat, by currency.
  const sourceMap: Record<string, number> = {};
  for (const o of completed) {
    const src = parseAsset(o.sourceAssetKey);
    const label = src.kind === 'crypto' ? src.chain : src.currency;
    sourceMap[label] = (sourceMap[label] ?? 0) + (o.sourceAmount ?? 0);
  }
  const totalSourceVol = Object.values(sourceMap).reduce((a, b) => a + b, 0) || 1;
  const sourceRows = Object.entries(sourceMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, vol]) => ({
      name,
      volume:     vol.toLocaleString(undefined, { maximumFractionDigits: 0 }),
      percentage: `${Math.round((vol / totalSourceVol) * 100)}%`,
    }));

  // Direction breakdown — onramp vs offramp vs bridge lets the merchant see
  // whether their widget is primarily for fiat-in or crypto-in flows.
  const directionCounts: Record<string, number> = { offramp: 0, onramp: 0, bridge: 0, transfer: 0 };
  for (const o of completed) directionCounts[directionOf(o)]++;

  const fmtPayout = (key: string, amount: number) => {
    const a  = parseAsset(key);
    const dp = a.kind === 'fiat' ? 0 : 2;
    const amt = amount.toLocaleString(undefined, { maximumFractionDigits: dp });
    const label = a.kind === 'fiat' ? a.currency : `${a.token} (${a.chain})`;
    return { amt, label };
  };

  return (
    <main className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Analytics Overview</h1>
        <p className="text-gray-500 mt-1">Real-time performance across all Weave corridors.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-2">Total Transactions</p>
          <h3 className="text-3xl font-bold text-gray-900">{orders.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-2">Completed</p>
          <h3 className="text-3xl font-bold text-gray-900">{completed.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-2">Active Corridors</p>
          <h3 className="text-3xl font-bold text-gray-900">{corridors.length || '—'}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Offramps',   count: directionCounts.offramp,                                         color: 'text-purple-600' },
          { label: 'Onramps',    count: directionCounts.onramp,                                          color: 'text-orange-600' },
          { label: 'Processing', count: orders.filter((o) => o.status === 'processing').length,         color: 'text-blue-600'   },
          { label: 'Pending',    count: orders.filter((o) => o.status === 'awaiting_deposit').length,   color: 'text-yellow-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
            <span className="text-sm text-gray-500">{s.label}</span>
            <span className={`text-xl font-bold ${s.color}`}>{s.count}</span>
          </div>
        ))}
      </div>

      {corridors.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold mb-4">Merchant Payouts by Currency</h3>
          <div className="space-y-3">
            {Object.entries(payoutVolume)
              .sort(([, a], [, b]) => b - a)
              .map(([key, vol]) => {
                const { amt, label } = fmtPayout(key, vol);
                return (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{label}</span>
                    <span className="text-gray-900 font-mono">{amt}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {sourceRows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold mb-4">Volume by Inbound Source</h3>
          <div className="space-y-4">
            {sourceRows.map((c, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{c.name}</span>
                  <span className="text-gray-500">{c.volume} ({c.percentage})</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: c.percentage }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">No transactions yet. Integrate the widget to start collecting.</p>
        </div>
      )}
    </main>
  );
}
