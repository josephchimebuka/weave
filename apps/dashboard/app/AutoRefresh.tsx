'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AutoRefresh({ interval = 15000 }: { interval?: number }) {
  const router = useRouter();

  useEffect(() => {
    // Standard approach for auto-refreshing Server Component data in Next.js
    const timer = setInterval(() => {
      router.refresh();
    }, interval);

    return () => clearInterval(timer);
  }, [interval, router]);

  return null;
}
