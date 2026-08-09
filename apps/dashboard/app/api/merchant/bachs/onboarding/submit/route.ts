import { readSessionCookie } from '../../../../../lib/auth-server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

// POST — submit the remaining onboarding fields (the delta our KYB didn't cover).
export async function POST(req: Request) {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const res = await fetch(`${API_BASE}/merchant/bachs/onboarding/submit`, {
      method: 'POST',
      headers: { 'x-session-token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return Response.json({ error: json.error || 'Failed to submit' }, { status: res.status });
    }
    return Response.json(json.data ?? json);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
