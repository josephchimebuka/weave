import { NextRequest } from 'next/server';
import { readSessionCookie } from '../../lib/auth-server';
import { type AuditEvent, actionMeta, describeEvent, actorLabel } from '../audit-meta';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

export async function GET(req: NextRequest) {
  const token = await readSessionCookie();
  if (!token) return new Response('Unauthorized', { status: 401 });

  // scope=all is authorized by the backend itself (decoy 404 for non-admins);
  // we fall back to the own-log export if it's refused.
  const scope = req.nextUrl.searchParams.get('scope') === 'all' ? 'all' : 'own';
  const path = scope === 'all'
    ? `${API_BASE}/merchant/audit-events/all?limit=1000`
    : `${API_BASE}/merchant/audit-events?limit=1000`;

  const res = await fetch(path, { headers: { 'x-session-token': token }, cache: 'no-store' });
  if (!res.ok) return new Response('Failed to load audit events', { status: res.status });
  const json = await res.json();
  const events: AuditEvent[] = json.data ?? json ?? [];

  const admin = scope === 'all';
  const header = [
    'timestamp',
    'action',
    'label',
    'detail',
    'category',
    'severity',
    'actor_type',
    'actor',
    ...(admin ? ['merchant', 'merchant_email', 'ip', 'user_agent'] : []),
    'target_type',
    'target_id',
    'event_id',
  ];

  const rows = events.map((e) => {
    const meta = actionMeta(e.action);
    return [
      e.createdAt,
      e.action,
      meta.label,
      describeEvent(e),
      meta.category,
      meta.severity,
      e.actorType,
      actorLabel(e),
      ...(admin ? [e.merchant?.name ?? '', e.merchant?.email ?? '', e.ip ?? '', e.userAgent ?? ''] : []),
      e.targetType ?? '',
      e.targetId ?? '',
      e.id,
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="weave-audit-${scope}-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
