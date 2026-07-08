import { readSessionCookie } from '../../../lib/auth-server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id }  = await params;
    const token   = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const res = await fetch(`${API_BASE}/orders/${id}`, {
      headers: { 'x-session-token': token },
      cache:   'no-store',
    });
    if (!res.ok) return Response.json({ error: 'Not found' }, { status: res.status });

    // Return the full envelope { success, data, paycrestStatus, nearStatus } so
    // fetchOrderClient's `json.data ?? null` resolves to the order (and provider
    // status siblings survive). The orders-list proxy passes the envelope too.
    const json = await res.json();
    return Response.json(json);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
