'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import {
  LayoutDashboard,
  List,
  Settings,
  ShieldCheck,
  Wallet,
  PlugZap,
  FileBadge2,
  LockKeyhole,
  UserRoundPlus,
  Receipt,
} from 'lucide-react';

type NavItem = { href: string; label: string; icon: ComponentType<{ size?: number }> };
type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: 'Core',
    items: [
      { href: '/', label: 'Overview', icon: LayoutDashboard },
      { href: '/transactions', label: 'Transactions', icon: List },
      { href: '/receipts', label: 'Receipts', icon: Receipt },
      { href: '/payouts', label: 'Payouts', icon: Wallet },
      { href: '/integration', label: 'Integration', icon: PlugZap },
    ],
  },
  {
    label: 'Onboarding & Security',
    items: [
      { href: '/onboarding/kyb', label: 'KYB Onboarding', icon: FileBadge2 },
      { href: '/security/otp', label: 'OTP Security', icon: LockKeyhole },
      { href: '/auth/login', label: 'Auth', icon: UserRoundPlus },
    ],
  },
  {
    label: 'Governance',
    items: [
      { href: '/compliance', label: 'Compliance', icon: ShieldCheck },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900">Weave<span className="text-gray-500">.</span></h2>
        <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold mt-1 block">Merchant Portal</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-5">
        {NAV.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 px-3">{group.label}</p>
            {group.items.map((item) => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                    active
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100 text-xs text-gray-500">
        API Status: <span className="text-gray-900 font-semibold">Online</span>
      </div>
    </aside>
  );
}
