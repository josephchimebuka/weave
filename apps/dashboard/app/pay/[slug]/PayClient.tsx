'use client';

import { useState } from 'react';
import { WeaveCheckout } from '@weave/widget';

type LinkData = {
  id: string;
  title: string;
  description: string | null;
  amount: number | null;
  currency: string;
  merchantName: string;
  publishableKey: string;
};

export default function PayClient({ link }: { link: LinkData }) {
  const [inputAmount, setInputAmount] = useState<string>('');
  
  // Decide the true amount to charge: fixed from link, or typed by user.
  const finalAmount = link.amount !== null ? link.amount : parseFloat(inputAmount || '0');
  const amountIsValid = finalAmount > 0;

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 font-body text-ink">
      <div className="w-full max-w-[420px] fade-up relative z-10 mx-auto">
        
        {/* Only show the custom input UI if we are soliciting an amount. 
            Once valid, purely render the Widget since it handles all the heavy lifting! */}
        {!amountIsValid ? (
          <div className="bg-cream-soft rounded-[32px] p-8 border border-hair shadow-sm text-center">
            <h2 className="text-[18px] font-semibold text-ink">{link.title}</h2>
            {link.description && (
              <p className="text-[14px] text-ink-muted mt-2">{link.description}</p>
            )}

            <div className="mt-8 relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[32px] font-display text-ink-muted pl-2">
                {link.currency === 'NGN' ? '₦' : '$'}
              </div>
              <input 
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                className="w-full bg-transparent border-b-2 border-hair focus:border-forest outline-none text-center text-[42px] font-display font-medium text-ink tabular-nums transition-colors pb-2"
                style={{ paddingLeft: '40px', paddingRight: '40px' }}
                autoFocus
              />
              <div className="text-[13px] text-ink-muted mt-3 font-medium tracking-widest uppercase">{link.currency}</div>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6 text-center px-4">
               <h1 className="text-[20px] font-semibold text-ink tracking-tight">{link.title}</h1>
               {link.description && <p className="text-[14px] text-ink-muted mt-1">{link.description}</p>}
               {link.amount === null && (
                 <button onClick={() => setInputAmount('')} className="mt-3 text-[12px] font-semibold tracking-widest uppercase text-forest hover:text-forest-deep transition-colors">
                   Change Amount
                 </button>
               )}
            </div>

            <WeaveCheckout 
              apiKey={link.publishableKey}
              merchant={{
                name: link.merchantName,
                amount: finalAmount,
                currency: link.currency,
                description: link.title
              }}
              theme="organic"
              accentColor="forest"
              borderRadius={24}
              onSuccess={(data) => console.log("Payment link success:", data)}
              onClose={() => {
                if (link.amount === null) setInputAmount('');
              }}
            />
            <div className="text-center mt-6">
              <p className="text-[12px] text-ink-muted flex items-center justify-center gap-1.5 font-medium">
                Safe & Secure checkout powered by <span className="text-forest tracking-tight font-semibold">Weave.</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
