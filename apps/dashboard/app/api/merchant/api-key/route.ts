import { readSessionCookie } from '../../../lib/auth-server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

// GET /api/merchant/api-key — returns publishable key + merchant metadata.
// Never returns the secret key.
export async function GET() {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const res = await fetch(`${API_BASE}/merchant/keys`, {
      headers: { 'x-session-token': token },
    });
    if (!res.ok) return Response.json({ error: 'Failed to fetch keys' }, { status: res.status });

    const json = await res.json();
    return Response.json(json.data ?? json);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/merchant/api-key — rotates keys.
// The secretKey in the response is shown exactly once.
export async function POST() {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const res = await fetch(`${API_BASE}/merchant/keys/regenerate`, {
      method: 'POST',
      headers: { 'x-session-token': token },
    });
    if (!res.ok) return Response.json({ error: 'Failed to regenerate keys' }, { status: res.status });

    const json = await res.json();
    return Response.json(json.data ?? json);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
