import { readSessionCookie } from '../../../lib/auth-server';
import { proxyHeaders } from '../../../lib/proxy-headers';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

export async function GET() {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const res = await fetch(`${API_BASE}/merchant/webhook`, {
      headers: await proxyHeaders(token),
      cache: 'no-store',
    });
    if (!res.ok) return Response.json({ error: 'Failed' }, { status: res.status });

    const json = await res.json();
    return Response.json(json.data ?? json);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const res = await fetch(`${API_BASE}/merchant/webhook`, {
      method: 'PATCH',
      headers: await proxyHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return Response.json({ error: err.error ?? 'Failed' }, { status: res.status });
    }
    const json = await res.json();
    return Response.json(json.data ?? json);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
