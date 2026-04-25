'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AutoRefresh({ interval = 15000, onRefresh }: { interval?: number, onRefresh?: () => void }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      if (onRefresh) {
        onRefresh();
      } else {
        router.refresh();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [interval, router, onRefresh]);

  return null;
}
