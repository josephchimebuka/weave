import './global.css';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';

export const metadata = {
  title: {
    template: '%s · Weave Docs',
    default: 'Weave Docs',
  },
  description: 'Universal crypto ↔ fiat checkout. Integrate Weave in minutes.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
