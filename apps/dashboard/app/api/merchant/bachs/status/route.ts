import { readSessionCookie } from '../../../../lib/auth-server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

// GET — Bachs connected-account status (cached + best-effort live refresh).
export async function GET() {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const res = await fetch(`${API_BASE}/merchant/bachs/status`, {
      headers: { 'x-session-token': token },
      cache: 'no-store',
    });
    if (!res.ok) return Response.json({ error: 'Failed' }, { status: res.status });

    const json = await res.json();
    return Response.json(json.data ?? null);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
