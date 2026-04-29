import { readSessionCookie } from '../../../../lib/auth-server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

export async function GET() {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const res = await fetch(`${API_BASE}/merchant/payouts/settlements`, {
      headers: { 'x-session-token': token },
      cache: 'no-store',
    });
    const json = await res.json();
    
    if (!res.ok) {
      return Response.json({ error: json.error || 'Failed to fetch settlements' }, { status: res.status });
    }

    return Response.json(json);
  } catch (err: any) {
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
