import { readSessionCookie } from '../../../../../lib/auth-server';
import { proxyHeaders } from '../../../../../lib/proxy-headers';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

// POST — relay one KYB document to Anchor. Body passes through unchanged (may carry a
// base64 file payload), so we forward the raw text rather than re-serialising.
export async function POST(req: Request) {
  try {
    const token = await readSessionCookie();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.text();
    const res = await fetch(`${API_BASE}/merchant/anchor/documents/upload`, {
      method: 'POST',
      headers: await proxyHeaders(token, { 'Content-Type': 'application/json' }),
      body,
      cache: 'no-store',
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return Response.json({ error: json.error || 'Upload failed' }, { status: res.status });
    }
    return Response.json(json.data ?? json);
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
