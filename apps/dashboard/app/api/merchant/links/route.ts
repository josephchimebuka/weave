import { readSessionCookie } from '../../../lib/auth-server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

export async function GET() {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const res = await fetch(`${API_BASE}/links`, {
      headers: { 'x-session-token': token },
      cache: 'no-store',
    });
    if (!res.ok) return Response.json({ error: 'Failed to fetch links' }, { status: res.status });

    const json = await res.json();
    return Response.json(json.data ?? []);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const res = await fetch(`${API_BASE}/links`, {
      method: 'POST',
      headers: { 'x-session-token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const json = await res.json();
    if (!res.ok || !json.success) {
       return Response.json({ error: json.error || 'Failed to create link' }, { status: res.status });
    }

    return Response.json(json.data ?? json);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return Response.json({ error: 'Missing link ID' }, { status: 400 });

    const body = await req.json();

    const res = await fetch(`${API_BASE}/links/${id}`, {
      method: 'PATCH',
      headers: { 'x-session-token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const json = await res.json();
    return Response.json(json);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return Response.json({ error: 'Missing link ID' }, { status: 400 });

    const res = await fetch(`${API_BASE}/links/${id}`, {
      method: 'DELETE',
      headers: { 'x-session-token': token },
    });
    
    const json = await res.json();
    return Response.json(json);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
