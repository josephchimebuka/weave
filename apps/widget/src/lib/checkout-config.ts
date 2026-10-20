// Checkout feature flags and payment-first copy (Phase 2).

export type PaymentCopyMode = 'infra' | 'dev';

export function getPaymentCopyMode(): PaymentCopyMode {
  const m = String((import.meta as any).env?.VITE_PAYMENT_COPY_MODE ?? 'infra').toLowerCase();
  return m === 'dev' ? 'dev' : 'infra';
}

/** Client-side default; can be overridden after GET /stellar/config. */
export function isStellarCheckoutEnabledFromEnv(): boolean {
  const env = (import.meta as any).env?.VITE_STELLAR_CHECKOUT_ENABLED;
  if (env === 'false' || env === '0') return false;
  return true;
}

export function stellarPayMethodLabel(mode: PaymentCopyMode): { title: string; sub: string } {
  if (mode === 'dev') {
    return {
      title: 'Pay with Stellar wallet',
      sub: 'USDC on Stellar · Freighter, xBull & more · ~5s',
    };
  }
  return {
    title: 'Pay with Stellar wallet',
    sub: 'USDC from Freighter, xBull & more',
  };
}

export function stellarPayScreenTitle(mode: PaymentCopyMode): string {
  return mode === 'dev' ? 'Pay with Stellar USDC' : 'Confirm stablecoin payment';
}
