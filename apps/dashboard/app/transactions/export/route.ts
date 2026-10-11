import { NextRequest } from 'next/server';
import { fetchAllOrders } from '../../lib/dashboard-api';
import { directionOf } from '../../types';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  // Exports the ENTIRE matching set (looped, not capped). Filters — including an
  // optional fromDate/toDate range — are applied server-side by the API.
  const orders = await fetchAllOrders({
    status: sp.get('status') || undefined,
    direction: sp.get('direction') || undefined,
    q: sp.get('q') || undefined,
    fromDate: sp.get('fromDate') || undefined,
    toDate: sp.get('toDate') || undefined,
  });

  const header = [
    'Order ID',
    'Date',
    'Status',
    'Direction',
    'Source Asset',
    'Destination Asset',
    'Amount Paid',
    'Settlement Amount',
  ];

  const rows = orders.map((o) => ([
    o.id,
    o.createdAt,
    o.status,
    directionOf(o),
    o.sourceAssetKey,
    o.destAssetKey,
    o.sourceAmount ?? '',
    o.destAmount ?? '',
  ]));

  const csv = [header, ...rows]
    .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="weave-transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
