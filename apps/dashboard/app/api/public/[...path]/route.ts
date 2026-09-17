import { NextRequest } from 'next/server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

/**
 * Public Proxy for the Weave Checkout Widget.
 * Forwards requests using API Keys (x-api-key) to the backend.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(request, path.join('/'));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(request, path.join('/'));
}

async function proxy(request: NextRequest, path: string) {
  try {
    const url = new URL(request.url);
    
    // Ensure API_BASE ends with /api/v1
    let base = API_BASE.replace(/\/$/, '');
    if (!base.endsWith('/api/v1')) {
      if (base.endsWith('/v1')) {
        base = base.replace('/v1', '/api/v1');
      } else {
        base = `${base}/api/v1`;
      }
    }
    
    const targetUrl = new URL(`${base}/${path}${url.search}`);
    
    const headers = new Headers();
    // Forward the public API Key
    const apiKey = request.headers.get('x-api-key');
    if (apiKey) headers.set('x-api-key', apiKey);
    // Stellar-anchor interactive pages (/ramp/*) authenticate with a one-time
    // bearer token from their SEP-24 interactive URL instead of an API key.
    const auth = request.headers.get('authorization');
    if (auth && path.startsWith('sep24/')) headers.set('authorization', auth);
    headers.set('Content-Type', 'application/json');

    const options: RequestInit = {
      method: request.method,
      headers,
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      options.body = await request.text();
    }

    const res = await fetch(targetUrl, options);
    const data = await res.text();

    return new Response(data, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error: any) {
    console.error(`[public-proxy] failure:`, error.message);
    return new Response(JSON.stringify({ success: false, error: 'Proxy failed' }), {
      status: 500,
    });
  }
}
