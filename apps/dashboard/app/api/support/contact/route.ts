import { NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${API_BASE}/support/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
  }
}
