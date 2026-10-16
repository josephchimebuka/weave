import type { RoutePlan } from '../services/router.service';

const SENDER_FEE_BPS = Number(process.env.SENDER_FEE_BPS ?? 75);
const APP_FEE_BPS = Number(process.env.APP_FEE_BPS ?? 10);
const SLIPPAGE_BUFFER_BPS = Number(process.env.SLIPPAGE_BUFFER_BPS ?? 200);

/** Fiat payout estimate for crypto→fiat — kept in sync with `routes/quotes.ts`. */
export function estimateFiatFromUsdOfframp(usdEquivalent: number, sellRate: number, plan: RoutePlan): {
  estimatedDest: number;
  senderFeeUsd: number;
  appFeeUsd: number;
  bridgeFeeUsd: number;
  netUsd: number;
  appFeeBps: number;
} {
  const slippageBuffer = SLIPPAGE_BUFFER_BPS / 10000;
  let bridgeFeeUsd = 0;
  for (const step of plan.steps) {
    if (step.provider === 'nearintents') bridgeFeeUsd += usdEquivalent * slippageBuffer;
    else if (step.provider === 'lifi') bridgeFeeUsd += usdEquivalent * 0.0025;
  }
  const hasSwap = plan.steps.some(s => s.provider === 'nearintents');
  const senderFeeUsd = usdEquivalent * (SENDER_FEE_BPS / 10000);
  const appFeeUsd = usdEquivalent * (APP_FEE_BPS / 10000);
  const netUsd = usdEquivalent - senderFeeUsd - appFeeUsd - bridgeFeeUsd;
  return {
    estimatedDest: netUsd * sellRate,
    senderFeeUsd,
    appFeeUsd,
    bridgeFeeUsd,
    netUsd,
    appFeeBps: APP_FEE_BPS + (hasSwap ? SLIPPAGE_BUFFER_BPS : 0),
  };
}

export { SENDER_FEE_BPS, APP_FEE_BPS, SLIPPAGE_BUFFER_BPS };
