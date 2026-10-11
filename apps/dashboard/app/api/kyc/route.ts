import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { proxyHeaders } from '../../lib/proxy-headers';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

async function getToken(): Promise<string> {
  const store = await cookies();
  return store.get('weave_session')?.value || '';
}

// POST /api/kyc?action=send|verify
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    if (action !== 'send' && action !== 'verify') {
      return NextResponse.json({ success: false, error: 'action must be send or verify' }, { status: 400 });
    }

    const token = await getToken();
    const body  = await request.json().catch(() => ({}));

    const res = await fetch(`${API_BASE}/kyc/email/${action}`, {
      method:  'POST',
      headers: await proxyHeaders(token, { 'Content-Type': 'application/json' }),
      body:    JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({ success: false, error: 'Unexpected response' }));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
