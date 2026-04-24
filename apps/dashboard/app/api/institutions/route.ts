import { readSessionCookie } from '../../lib/auth-server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

export async function GET(req: Request) {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const currency = url.searchParams.get('currency');
    
    if (!currency) return Response.json({ error: 'currency required' }, { status: 400 });

    const res = await fetch(`${API_BASE}/institutions?currency=${currency}`, {
      headers: { 'x-session-token': token },
    });
    if (!res.ok) return Response.json({ error: 'Failed' }, { status: res.status });

    const json = await res.json();
    return Response.json(json.data ?? json);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
