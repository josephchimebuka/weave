const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

export async function POST(req: Request) {
  try {
    const { method, path, query, body, apiKey } = await req.json();

    if (!apiKey || typeof apiKey !== 'string') {
      return Response.json({ error: 'apiKey is required' }, { status: 400 });
    }
    if (!path || typeof path !== 'string' || !path.startsWith('/')) {
      return Response.json({ error: 'invalid path' }, { status: 400 });
    }

    const url = new URL(API_BASE + path);
    if (query && typeof query === 'object') {
      for (const [k, v] of Object.entries(query)) {
        if (v != null && v !== '') url.searchParams.set(k, String(v));
      }
    }

    const fetchOptions: RequestInit = {
      method: method ?? 'GET',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    };
    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const upstream = await fetch(url.toString(), fetchOptions);
    const text = await upstream.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = text; }

    return Response.json({ status: upstream.status, ok: upstream.ok, data }, { status: 200 });
  } catch (err: any) {
    return Response.json({ error: err.message ?? 'Proxy error' }, { status: 500 });
  }
}
