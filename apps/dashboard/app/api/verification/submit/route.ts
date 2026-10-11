import { readSessionCookie } from '../../../lib/auth-server';
import { proxyHeaders } from '../../../lib/proxy-headers';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

export async function POST() {
  const token = await readSessionCookie();
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(`${API_BASE}/verification/submit`, {
    method: 'POST',
    headers: await proxyHeaders(token),
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
