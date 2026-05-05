import { readSessionCookie } from '../../../../lib/auth-server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

export async function POST() {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const res = await fetch(`${API_BASE}/merchant/webhook/test`, {
      method: 'POST',
      headers: { 'x-session-token': token },
    });
    const json = await res.json();
    if (!res.ok) return Response.json({ error: json.error ?? 'Failed' }, { status: res.status });
    return Response.json(json.data ?? json);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
