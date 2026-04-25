import { NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

/**
 * Universal Proxy for Auth requests. 
 * Allows the browser to call /api/auth/* without needing NEXT_PUBLIC_API_BASE.
 */
export async function POST(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = (await params).path.join('/');
    const body = await request.json();

    const res = await fetch(`${API_BASE}/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error('[auth-proxy] failure:', error.message);
    return NextResponse.json(
      { success: false, error: 'Authentication service is momentarily unavailable.' },
      { status: 503 }
    );
  }
}
