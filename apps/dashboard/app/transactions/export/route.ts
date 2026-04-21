import { NextRequest } from 'next/server';
import { applyOrderFilter, fetchOrders } from '../../lib/dashboard-api';
import { directionOf } from '../../types';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const orders = applyOrderFilter(await fetchOrders(0), {
    q: sp.get('q') || undefined,
    status: sp.get('status') || undefined,
    direction: sp.get('direction') || undefined,
    provider: sp.get('provider') || undefined,
    sort: (sp.get('sort') as 'createdAt_desc' | 'createdAt_asc' | 'amount_desc' | 'amount_asc' | null) || undefined,
  });

  const header = [
    'order_id',
    'created_at',
    'status',
    'direction',
    'source_asset',
    'dest_asset',
    'source_amount',
    'dest_amount',
    'sender_fee_usd',
    'app_fee_usd',
    'bridge_fee_usd',
    'providers',
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
    o.senderFeeUsd ?? '',
    o.appFeeUsd ?? '',
    o.bridgeFeeUsd ?? '',
    (o.steps || []).map((s) => s.provider).join(' → '),
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
