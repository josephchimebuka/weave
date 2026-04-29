'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import {
  LayoutGrid,
  ShieldCheck,
  Settings2,
  Receipt,
  LifeBuoy,
  LogOut,
  Link as LinkIcon,
  Landmark,
  X,
} from 'lucide-react';

type NavItem = {
  href:   string;
  label:  string;
  icon:   ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  match?: string[];
};

const PRIMARY: NavItem[] = [
  { href: '/',               label: 'Dashboard',    icon: LayoutGrid },
  { href: '/transactions',   label: 'Transactions', icon: Receipt },
  { href: '/payouts',        label: 'Payouts',      icon: Landmark },
  { href: '/links',          label: 'Payment Links', icon: LinkIcon },
  { href: '/onboarding/kyb', label: 'KYB',          icon: ShieldCheck, match: ['/onboarding', '/compliance'] },
  { href: '/settings',       label: 'Settings',     icon: Settings2 },
];

function isActive(item: NavItem, pathname: string): boolean {
  if (item.href === '/') return pathname === '/';
  if (pathname === item.href || pathname.startsWith(item.href + '/')) return true;
  if (pathname.startsWith(item.href)) return true;
  for (const m of item.match ?? []) {
    if (pathname === m || pathname.startsWith(m + '/')) return true;
  }
  return false;
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(item, pathname);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] transition-all ${
        active
          ? 'bg-forest-surface text-forest-deep font-semibold'
          : 'text-ink-soft hover:bg-cream-deep/60 hover:text-forest-deep'
      }`}
    >
      <Icon
        size={19}
        strokeWidth={active ? 2.2 : 1.75}
        className={active ? 'text-forest' : 'text-ink-muted'}
      />
      <span>{item.label}</span>
    </Link>
  );
}

export default function Sidebar({
  merchantName = '',
  isOpen = false,
  onClose = () => {},
}: {
  merchantName?: string;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  // Derive initials and first name from the provided name
  const parts    = merchantName.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0]?.slice(0, 2).toUpperCase() ?? '?';
  const displayName = merchantName || 'My Business';

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 bg-ink/20 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-cream border-r border-hair px-5 pt-7 pb-6 transition-transform duration-300 ease-in-out shadow-leaf-lg md:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:flex md:flex-col md:h-screen md:w-[264px] md:sticky md:top-0
      `}
      >
        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-4 p-2 text-ink-muted hover:text-ink md:hidden transition-colors"
          aria-label="Close menu"
        >
          <X size={20} strokeWidth={2} />
        </button>
      {/* Brand — clicking name/avatar goes to profile */}
      <Link href="/settings?tab=profile" className="mb-10 flex items-center gap-3 px-1 group">
        <div className="relative w-11 h-11 rounded-full bg-forest text-cream-soft flex items-center justify-center font-display font-semibold text-sm shadow-leaf shrink-0">
          {initials}
          <span className="absolute -inset-0.5 rounded-full border border-forest/20 group-hover:border-forest/40 transition-colors" />
        </div>
        <div className="leading-tight overflow-hidden">
          <p className="font-display text-[17px] font-semibold text-forest-deep tracking-tight truncate">
            {displayName}
          </p>
          <p className="text-[11px] text-ink-muted tracking-wide">
            Verified Partner
          </p>
        </div>
      </Link>

      {/* Primary nav */}
      <nav className="flex-1 flex flex-col gap-1.5">
        {PRIMARY.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* Footer — Support + Logout */}
      <div className="pt-5 mt-5 border-t border-hair-soft flex flex-col gap-1.5">
        <Link
          href="/support"
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] transition-all ${
            pathname.startsWith('/support')
              ? 'bg-forest-surface text-forest-deep font-semibold'
              : 'text-ink-soft hover:bg-cream-deep/60 hover:text-forest-deep'
          }`}
        >
          <LifeBuoy
            size={19}
            strokeWidth={pathname.startsWith('/support') ? 2.2 : 1.75}
            className={pathname.startsWith('/support') ? 'text-forest' : 'text-ink-muted'}
          />
          <span>Support</span>
        </Link>
        <Link
          href="/auth/logout"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] text-ink-soft hover:bg-cream-deep/60 hover:text-terracotta transition-all"
        >
          <LogOut size={19} strokeWidth={1.75} className="text-ink-muted" />
          <span>Logout</span>
        </Link>

        {/* Legal Attribution */}
        <div className="mt-8 px-4 opacity-50 hover:opacity-100 transition-opacity">
          <p className="text-[10px] text-ink-muted leading-relaxed uppercase tracking-wider">
            A product of<br />
            <span className="font-bold">Dewdrop Labs</span>
          </p>
        </div>
      </div>
    </aside>
    </>
  );
}
