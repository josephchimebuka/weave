import { readSessionCookie } from '../../../lib/auth-server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

export async function POST(req: Request) {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const res = await fetch(`${API_BASE}/merchant/request-deletion`, {
      method: 'POST',
      headers: { 'x-session-token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return Response.json({ error: 'Failed' }, { status: res.status });

    const json = await res.json();
    return Response.json(json);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
