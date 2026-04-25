'use client';

import { WeaveCheckout } from '@weave/widget';

// Point the widget to our internal safe public proxy
if (typeof window !== 'undefined') {
  (window as any).__WEAVE_API_BASE__ = '/api/public';
}

type LinkData = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  asset: string;
  merchantName: string;
  publishableKey: string;
};

export default function PayClient({ link }: { link: LinkData }) {
  const isP2P = link.asset.startsWith('crypto:');
  const assetParts = link.asset.split(':');
  const token = assetParts.pop() || '';
  const network = assetParts.length > 1 ? assetParts[1] : '';

  // For fiat, get the currency code and symbol
  const currencyCode = !isP2P ? token : '';
  const currencySymbol = currencyCode === 'NGN' ? '₦' : currencyCode === 'GHS' ? 'GH₵' : currencyCode === 'KES' ? 'KSh' : '$';

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 font-body text-ink">
      <div className="w-full max-w-[420px] fade-up relative z-10 mx-auto py-12">
        
        <div className="mb-8 text-center px-4">
          <h1 className="text-[24px] font-display font-semibold text-ink tracking-tight">{link.title}</h1>
          {link.description && <p className="text-[15px] text-ink-muted mt-2 leading-relaxed">{link.description}</p>}
        </div>

        {isP2P ? (
          /* P2P / Source-Anchored Fixed Invoice UI */
          <div className="bg-cream-soft rounded-[32px] p-8 border border-hair-soft shadow-leaf mb-8 text-center">
            <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-[0.15em] mb-3">You are sending</p>
            <div className="flex flex-col items-center">
              <span className="text-[48px] font-display font-bold text-ink leading-none tabular-nums">
                {link.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </span>
              <span className="text-[16px] font-semibold text-forest-deep mt-2 bg-forest/5 px-3 py-1 rounded-full border border-forest/10">
                {token} on {network}
              </span>
            </div>
          </div>
        ) : (
          /* Standard / Fiat-Anchored Invoice UI */
          <div className="bg-cream-soft rounded-[32px] p-8 border border-hair-soft shadow-leaf mb-8 text-center">
            <p className="text-[12px] font-semibold text-ink-muted uppercase tracking-[0.15em] mb-4">Total Amount</p>
            <div className="flex items-start justify-center gap-1">
              <span className="text-[24px] font-display font-medium text-ink-muted mt-1">{currencySymbol}</span>
              <span className="text-[52px] font-display font-bold text-ink leading-tight tabular-nums">
                {link.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-[13px] text-ink-muted mt-2 font-medium tracking-widest uppercase">{currencyCode}</div>
          </div>
        )}

        <WeaveCheckout 
          apiKey={link.publishableKey}
          merchant={{
            name: link.merchantName,
            amount: link.amount,
            currency: token, // This is used for display in the widget
            description: link.title,
            // P2P / Source-anchored specifics:
            amountIn: isP2P ? 'source' : 'dest',
            sourceAssetKey: isP2P ? link.asset : undefined,
          }}
          theme="organic"
          accentColor="forest"
          borderRadius={28}
          onSuccess={(data) => console.log("Payment success:", data)}
          onClose={() => {}}
        />

        <div className="text-center mt-8">
          <p className="text-[12px] text-ink-muted flex items-center justify-center gap-1.5 font-medium">
            Safe & Secure checkout powered by <span className="text-forest tracking-tight font-semibold">Weave.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
