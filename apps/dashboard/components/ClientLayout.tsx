'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

export function ClientLayout({ children, merchantName }: { children: React.ReactNode; merchantName: string }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const isAuth   = pathname.startsWith('/auth') || pathname === '/pay' || pathname.startsWith('/pay/') || pathname.startsWith('/checkout/');
  const isPublic = pathname.startsWith('/docs') || pathname.startsWith('/terms') || pathname.startsWith('/privacy');

  if (isAuth) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-8">
        {children}
      </div>
    );
  }

  if (isPublic) {
    return (
      <div className="min-h-screen bg-cream text-ink">
        <header className="sticky top-0 z-30 border-b border-hair-soft bg-cream/90 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-forest text-cream flex items-center justify-center font-display font-bold text-xs shadow-leaf">W</div>
              <span className="font-display font-bold text-forest-deep tracking-tight text-[18px]">Weave.</span>
            </Link>
            <Link href="/auth/login" className="text-[13px] text-ink-muted hover:text-forest transition-colors">Sign in →</Link>
          </div>
        </header>
        <main className="max-w-screen mx-auto px-6 md:px-6 py-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cream text-ink">
      <Sidebar
        merchantName={merchantName}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-cream/80 backdrop-blur-md border-b border-hair md:hidden">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-forest text-cream flex items-center justify-center font-display font-bold text-xs shadow-leaf">
              W
            </div>
            <span className="font-display font-bold text-forest-deep tracking-tight text-[18px]">Weave.</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -mr-2 text-ink-muted hover:text-forest transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} strokeWidth={2} />
          </button>
        </header>

        <main className="flex-1">
          <div className="px-6 md:px-10 lg:px-14 py-8 md:py-10 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
