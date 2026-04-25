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
    <div className="min-h-screen bg-cream flex flex-col lg:flex-row font-body text-ink selection:bg-forest/10">
      {/* Left Column: Product Summary */}
      <div className="flex-1 flex flex-col items-center lg:items-end justify-center py-12 lg:py-24 px-6 lg:px-12 border-b lg:border-b-0 lg:border-r border-hair/10">
        <div className="w-full max-w-[440px] fade-up lg:mr-8 xl:mr-16">
          
          {/* Merchant Identity */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-full bg-forest text-cream flex items-center justify-center font-bold text-lg shadow-leaf">
              {link.merchantName.charAt(0)}
            </div>
            <span className="text-[17px] font-semibold tracking-tight text-ink">{link.merchantName}</span>
          </div>

          <div className="space-y-2 mb-10">
            <h2 className="text-[16px] font-medium text-ink-muted tracking-tight uppercase tracking-[0.1em]">{link.title}</h2>
            
            {/* Liquid Glass Amount Display */}
            <div className="relative group pt-4">
              <div className="absolute -inset-x-6 -inset-y-4 bg-forest/5 rounded-[40px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative flex items-baseline gap-2">
                <span className="text-[36px] font-display font-medium text-ink-muted/60 mt-2">{currencySymbol}</span>
                <span className="text-[82px] md:text-[96px] font-display font-bold text-ink leading-none tabular-nums tracking-tighter">
                  {link.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                {isP2P && (
                  <span className="text-[18px] font-semibold text-forest-deep bg-forest/10 px-4 py-1.5 rounded-full border border-forest/10 self-center ml-4">
                    {token}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-6">
                <div className="h-[1px] w-10 bg-hair" />
                <span className="text-[13px] text-ink-muted font-bold tracking-[0.25em] uppercase">{currencyCode || token}</span>
              </div>
            </div>
          </div>

          {link.description && (
            <div className="mt-12 pt-8 border-t border-hair/10">
              <p className="text-[17px] text-ink-muted leading-relaxed max-w-[380px] font-medium italic opacity-80">
                "{link.description}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Checkout Widget */}
      <div className="flex-1 flex flex-col items-center lg:items-start justify-center py-12 lg:py-24 px-6 lg:px-12 bg-cream-soft">
        <div className="w-full max-w-[420px] fade-up lg:ml-8 xl:ml-16">
          <div className="bg-white rounded-[32px] p-1 shadow-leaf border border-hair-soft overflow-hidden">
            <WeaveCheckout 
              apiKey={link.publishableKey}
              merchant={{
                name: link.merchantName,
                amount: link.amount,
                currency: token,
                description: link.title,
                amountIn: isP2P ? 'source' : 'dest',
                sourceAssetKey: isP2P ? link.asset : undefined,
              }}
              theme="organic"
              accentColor="forest"
              borderRadius={28}
              onSuccess={(data) => console.log("Payment success:", data)}
              onClose={() => {}}
            />
          </div>

          {/* Checkout Footer */}
          <div className="mt-10 px-4">
            <div className="flex items-center justify-between text-[13px] text-ink-muted font-medium">
              <div className="flex items-center gap-2">
                <span>Secured by</span>
                <span className="text-forest font-bold tracking-tight text-[15px]">Weave.</span>
              </div>
              <div className="flex gap-5 opacity-60">
                <span className="hover:text-ink cursor-pointer transition-colors">Terms</span>
                <span className="hover:text-ink cursor-pointer transition-colors">Privacy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
