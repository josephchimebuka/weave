import { readSessionCookie } from '../../lib/auth-server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('id');
    
    const token = await readSessionCookie();
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const endpoint = orderId ? `${API_BASE}/orders/${orderId}` : `${API_BASE}/orders`;
    
    const res = await fetch(endpoint, {
      headers: { 'x-session-token': token },
      next: { revalidate: 10 },
    });

    if (!res.ok) {
      return Response.json({ error: 'Failed to fetch orders' }, { status: res.status });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    console.error('API route error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
