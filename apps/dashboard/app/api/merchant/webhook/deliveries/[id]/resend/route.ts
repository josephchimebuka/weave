import { readSessionCookie } from '../../../../../../lib/auth-server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const res = await fetch(`${API_BASE}/merchant/webhook/deliveries/${encodeURIComponent(id)}/resend`, {
      method: 'POST',
      headers: { 'x-session-token': token },
      cache: 'no-store',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return Response.json({ error: err.error ?? 'Failed' }, { status: res.status });
    }
    const json = await res.json();
    return Response.json(json.data ?? json);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
