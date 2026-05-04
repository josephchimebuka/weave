import { readSessionCookie } from '../../../../../lib/auth-server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

export async function POST(req: Request) {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const res = await fetch(`${API_BASE}/merchant/payouts/resolve-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': token },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) return Response.json({ error: json.error || 'Resolution failed' }, { status: res.status });
    return Response.json(json);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
