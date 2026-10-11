import { readSessionCookie } from '../../../lib/auth-server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

// The merchant's own audit log. Token read server-side and forwarded so it
// never touches the browser (same pattern as the webhook-deliveries proxy).
export async function GET(req: Request) {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ?? '100';

    const res = await fetch(`${API_BASE}/merchant/audit-events?limit=${encodeURIComponent(limit)}`, {
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
