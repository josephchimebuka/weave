import { cookies } from 'next/headers';
import { ClientLayout } from './ClientLayout';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

async function getMerchantName(): Promise<string> {
  try {
    const store = await cookies();
    const token = store.get('weave_session')?.value;
    if (!token) return '';
    const res = await fetch(`${API_BASE}/merchant/profile`, {
      headers: { 'x-session-token': token },
      cache: 'no-store',
    });
    if (!res.ok) return '';
    const json = await res.json();
    return (json.data?.name as string) || '';
  } catch {
    return '';
  }
}

// SidebarLayout must be a server component (no 'use client') so it can
// await cookies() and pass the real merchant name to Sidebar.
// The Sidebar itself is a client component (uses usePathname).
export async function SidebarLayout({ children }: { children: React.ReactNode }) {
  const merchantName = await getMerchantName();
  return <ClientLayout merchantName={merchantName}>{children}</ClientLayout>;
}
