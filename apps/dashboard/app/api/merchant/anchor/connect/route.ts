import { readSessionCookie } from '../../../../lib/auth-server';
import { proxyHeaders } from '../../../../lib/proxy-headers';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

// POST — ensure the merchant's Anchor BusinessCustomer + KYB (+ deposit account on approval).
export async function POST() {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const res = await fetch(`${API_BASE}/merchant/anchor/connect`, {
      method: 'POST',
      headers: await proxyHeaders(token, { 'Content-Type': 'application/json' }),
      cache: 'no-store',
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return Response.json({ error: json.error || 'Failed to start naira setup' }, { status: res.status });
    }
    return Response.json(json.data ?? json);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
