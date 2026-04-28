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

        <main className="flex-1 overflow-y-auto">
          <div className="px-6 md:px-10 lg:px-14 py-8 md:py-10 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
