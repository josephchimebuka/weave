import { NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/assets`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch assets' }, { status: 500 });
  }
}
