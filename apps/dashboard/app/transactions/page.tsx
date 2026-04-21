import Link from 'next/link';
import { applyOrderFilter, fetchOrders, toSearchQuery } from '../lib/dashboard-api';
import { assetLabel, directionOf, parseAsset } from '../types';

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

type SearchParams = {
  q?: string;
  status?: string;
  direction?: string;
  provider?: string;
  corridor?: string;
  fromDate?: string;
  toDate?: string;
  amountMin?: string;
  amountMax?: string;
  sort?: 'createdAt_desc' | 'createdAt_asc' | 'amount_desc' | 'amount_asc';
};

export default async function TransactionsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const rawOrders = await fetchOrders(10);
  const orders = applyOrderFilter(rawOrders, params);
  const providerOptions = Array.from(new Set(orders.flatMap((o) => (o.steps ?? []).map((s) => s.provider)))).sort();
  const corridorOptions = Array.from(new Set(rawOrders.map((o) => `${o.sourceAssetKey}→${o.destAssetKey}`))).sort();
  const qs = toSearchQuery(params);

  return (
    <main className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Transactions</h1>
        <p className="text-gray-500 mt-1">
          {orders.length > 0 ? `${orders.length} order${orders.length !== 1 ? 's' : ''}` : 'No transactions yet.'}
        </p>
      </div>

      <form className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 grid grid-cols-1 md:grid-cols-8 gap-3">
        <input
          name="q"
          defaultValue={params.q || ''}
          placeholder="Search order, asset, provider..."
          className="md:col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <select name="status" defaultValue={params.status || 'all'} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          {['all', 'awaiting_deposit', 'processing', 'completed', 'failed', 'refunded'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select name="direction" defaultValue={params.direction || 'all'} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          {['all', 'offramp', 'onramp', 'bridge', 'transfer'].map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select name="provider" defaultValue={params.provider || 'all'} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="all">all providers</option>
          {providerOptions.map((provider) => (
            <option key={provider} value={provider}>{provider}</option>
          ))}
        </select>
        <select name="corridor" defaultValue={params.corridor || 'all'} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="all">all corridors</option>
          {corridorOptions.map((corridor) => (
            <option key={corridor} value={corridor}>{corridor}</option>
          ))}
        </select>
        <input type="date" name="fromDate" defaultValue={params.fromDate || ''} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input type="date" name="toDate" defaultValue={params.toDate || ''} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input type="number" step="any" name="amountMin" defaultValue={params.amountMin || ''} placeholder="Min amount" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input type="number" step="any" name="amountMax" defaultValue={params.amountMax || ''} placeholder="Max amount" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <select name="sort" defaultValue={params.sort || 'createdAt_desc'} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="createdAt_desc">Newest</option>
            <option value="createdAt_asc">Oldest</option>
            <option value="amount_desc">Amount ↓</option>
            <option value="amount_asc">Amount ↑</option>
          </select>
          <button type="submit" className="bg-gray-900 text-white rounded-lg px-4 text-sm font-medium">Apply</button>
        </div>
      </form>

      <div className="flex justify-end">
        <Link
          href={`/transactions/export${qs ? `?${qs}` : ''}`}
          className="text-sm bg-emerald-700 text-white px-3 py-2 rounded-lg hover:bg-emerald-800"
        >
          Download CSV
        </Link>
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
                    <td className="p-4 font-mono text-xs">
                      <Link href={`/transactions/${o.id}`} className="text-blue-600 hover:underline">
                        {o.id.slice(0, 8)}…
                      </Link>
                    </td>
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
