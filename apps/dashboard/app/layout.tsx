import './globals.css';
import { Fraunces, Figtree } from 'next/font/google';
import { headers } from 'next/headers';
import { SidebarLayout } from '../components/SidebarLayout';
import { Analytics } from '@vercel/analytics/next';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  axes: ['opsz', 'SOFT'],
});

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata = {
  title: 'Weave — Merchant Dashboard',
  description: 'Merchant portal for Weave payments',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${fraunces.variable} ${figtree.variable}`}>
      <body className="h-full antialiased text-ink bg-cream font-body">
        <SidebarLayout>{children}</SidebarLayout>
        <Analytics />
      </body>
    </html>
  );
}
