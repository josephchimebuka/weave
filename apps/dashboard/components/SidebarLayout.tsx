import { cookies } from 'next/headers';
import { ClientLayout } from './ClientLayout';

const API_BASE = process.env.API_BASE || 'http://localhost:4000/api/v1';

type MerchantInfo = { name: string; kycLevel: string; emailVerifiedAt: string | null };

async function getMerchantInfo(): Promise<MerchantInfo> {
  try {
    const store = await cookies();
    const token = store.get('weave_session')?.value;
    if (!token) return { name: '', kycLevel: 'none', emailVerifiedAt: null };
    const res = await fetch(`${API_BASE}/merchant/profile`, {
      headers: { 'x-session-token': token },
      cache: 'no-store',
    });
    if (!res.ok) return { name: '', kycLevel: 'none', emailVerifiedAt: null };
    const json = await res.json();
    return {
      name:            (json.data?.name as string) || '',
      kycLevel:        (json.data?.kycLevel as string) || 'none',
      emailVerifiedAt: (json.data?.emailVerifiedAt as string | null) ?? null,
    };
  } catch {
    return { name: '', kycLevel: 'none', emailVerifiedAt: null };
  }
}

// SidebarLayout must be a server component (no 'use client') so it can
// await cookies() and pass the real merchant name to Sidebar.
// The Sidebar itself is a client component (uses usePathname).
export async function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { name, kycLevel, emailVerifiedAt } = await getMerchantInfo();
  return (
    <ClientLayout merchantName={name} kycLevel={kycLevel} emailVerifiedAt={emailVerifiedAt}>
      {children}
    </ClientLayout>
  );
}
