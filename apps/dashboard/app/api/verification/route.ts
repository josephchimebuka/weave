import { readSessionCookie } from '../../lib/auth-server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

export async function GET() {
  const token = await readSessionCookie();
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(`${API_BASE}/verification`, {
    headers: { 'x-session-token': token },
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}

export async function PATCH(request: Request) {
  const token = await readSessionCookie();
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const res = await fetch(`${API_BASE}/verification`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'x-session-token': token 
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}

export async function POST(request: Request) {
  const token = await readSessionCookie();
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const isSubmit = url.pathname.endsWith('/submit');
  const endpoint = isSubmit ? `${API_BASE}/verification/submit` : `${API_BASE}/verification`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'x-session-token': token },
  });

  const data = await res.json();
  return Response.json(data, { status: res.status });
}
