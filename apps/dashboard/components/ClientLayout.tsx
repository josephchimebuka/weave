'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export function ClientLayout({ children, merchantName }: { children: React.ReactNode; merchantName: string }) {
  const pathname = usePathname();
  const isAuth = pathname.startsWith('/auth') || pathname.startsWith('/pay');

  if (isAuth) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8">
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cream text-ink">
      <Sidebar merchantName={merchantName} />
      <main className="flex-1 min-h-screen overflow-y-auto">
        <div className="px-6 md:px-10 lg:px-14 py-8 md:py-10 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
