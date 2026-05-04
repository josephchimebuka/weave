'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function truncateAddress(address: string, head = 4, tail = 4): string {
  if (address.length <= head + tail + 3) return address;
  return `${address.slice(0, head)}...${address.slice(-tail)}`;
}

export function WalletAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const Icon = copied ? Check : Copy;

  return (
    <span className="inline-flex items-center gap-1.5 font-mono">
      {truncateAddress(address)}
      <button
        onClick={copy}
        title={copied ? 'Copied!' : 'Copy address'}
        className="text-ink-muted hover:text-forest-deep transition-colors"
      >
        <Icon size={13} strokeWidth={2} />
      </button>
    </span>
  );
}
