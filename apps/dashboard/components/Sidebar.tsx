import Link from 'next/link';
import { LayoutDashboard, List, Settings } from 'lucide-react';

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-2xl font-bold text-blue-600">Weave<span className="text-gray-800">.</span></h2>
        <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold mt-1 block">Checkout v1</span>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <Link href="/" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
          <LayoutDashboard size={20} />
          <span className="font-medium">Overview</span>
        </Link>
        <Link href="/transactions" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
          <List size={20} />
          <span className="font-medium">Transactions</span>
        </Link>
        <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors">
          <Settings size={20} />
          <span className="font-medium">Settings</span>
        </Link>
      </nav>
      <div className="p-4 border-t border-gray-100">
        <div className="text-sm text-gray-500 text-center">API Status: <span className="text-green-500 font-semibold">Online</span></div>
      </div>
    </div>
  );
}
