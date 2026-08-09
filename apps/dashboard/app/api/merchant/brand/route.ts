import { readSessionCookie } from '../../../lib/auth-server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

export async function GET() {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const res = await fetch(`${API_BASE}/merchant/brand`, {
      headers: { 'x-session-token': token },
      cache: 'no-store',
    });
    if (!res.ok) return Response.json({ error: 'Failed' }, { status: res.status });
    const json = await res.json();
    return Response.json(json.data ?? {});
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const res = await fetch(`${API_BASE}/merchant/brand`, {
      method: 'PATCH',
      headers: { 'x-session-token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json.success) return Response.json({ error: json.error || 'Failed to save' }, { status: res.status });
    return Response.json(json.data ?? {});
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
