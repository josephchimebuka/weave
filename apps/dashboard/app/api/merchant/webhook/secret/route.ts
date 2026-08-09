import { readSessionCookie } from '../../../../lib/auth-server';
import { proxyHeaders } from '../../../../lib/proxy-headers';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

export async function POST() {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const res = await fetch(`${API_BASE}/merchant/webhook/secret`, {
      method: 'POST',
      headers: await proxyHeaders(token),
    });
    if (!res.ok) return Response.json({ error: 'Failed' }, { status: res.status });

    const json = await res.json();
    return Response.json(json);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
