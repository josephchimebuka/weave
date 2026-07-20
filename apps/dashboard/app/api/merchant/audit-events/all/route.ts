import { readSessionCookie } from '../../../../lib/auth-server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

// Platform-wide audit log. The backend gates this on the env-designated
// platform-admin account and returns a decoy 404 for everyone else — we just
// forward its status through unchanged.
export async function GET(req: Request) {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const qs = new URLSearchParams();
    qs.set('limit', searchParams.get('limit') ?? '200');
    for (const key of ['action', 'merchantId', 'before'] as const) {
      const v = searchParams.get(key);
      if (v) qs.set(key, v);
    }

    const res = await fetch(`${API_BASE}/merchant/audit-events/all?${qs.toString()}`, {
      headers: { 'x-session-token': token },
      cache: 'no-store',
    });
    if (!res.ok) return Response.json({ error: 'Failed' }, { status: res.status });

    const json = await res.json();
    return Response.json(json.data ?? json);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
