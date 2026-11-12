import type { RoutePlan } from '../services/router.service';

const SENDER_FEE_BPS = Number(process.env.SENDER_FEE_BPS ?? 75);
const APP_FEE_BPS = Number(process.env.APP_FEE_BPS ?? 10);
const SLIPPAGE_BUFFER_BPS = Number(process.env.SLIPPAGE_BUFFER_BPS ?? 200);
/** Headroom added on top of a LIVE NEAR cost so a small price move doesn't make the quote optimistic. */
const NEAR_QUOTE_MARGIN_BPS = Number(process.env.NEAR_QUOTE_MARGIN_BPS ?? 30);

/** True for a Stellar USDC → Base USDC hop: LI.FI for a named payer, or the treasury bridge. */
export function stellarBridgeHopCount(plan: RoutePlan): number {
  return plan.steps.filter((s, i) =>
    s.provider === 'lifi' || (s.provider === 'stellar' && plan.steps[i + 1]?.provider === 'paycrest'),
  ).length;
}

/** Without a live figure, assume CCTP's flat 0.25% (what LI.FI charges from ~$2 up). */
const DEFAULT_STELLAR_BRIDGE_BPS = 25;

/**
 * Fiat payout estimate for crypto→fiat. `/quotes` and `/orders` BOTH call this so
 * the number a payer is shown is the number an order is created against.
 * `stellarBridgeFeeUsd` is the live LI.FI cost of the Stellar → Base hop (see
 * `LifiService.estimateStellarBridge`). A plan carries at most one such hop.
 */
export function estimateFiatFromUsdOfframp(
  usdEquivalent: number,
  sellRate: number,
  plan: RoutePlan,
  opts: { stellarBridgeFeeUsd?: number; nearCostBps?: number; paycrestFeeUsd?: number } = {},
): {
  estimatedDest: number;
  senderFeeUsd: number;
  appFeeUsd: number;
  bridgeFeeUsd: number;
  /**
   * Paycrest's per-order `transactionFee`. Set by the Paycrest protocol (per token and
   * network, covering network costs), so it is read from Paycrest's own records at quote
   * time and passed in — never configured here. 0 when unknown.
   */
  paycrestFeeUsd: number;
  netUsd: number;
  appFeeBps: number;
} {
  const slippageBuffer = SLIPPAGE_BUFFER_BPS / 10000;
  let bridgeFeeUsd = 0;
  // NEAR hop: a live cost (+ margin) when we have one, else the flat buffer.
  const nearFraction = opts.nearCostBps !== undefined
    ? (opts.nearCostBps + NEAR_QUOTE_MARGIN_BPS) / 10000
    : slippageBuffer;
  for (const step of plan.steps) {
    if (step.provider === 'nearintents') bridgeFeeUsd += usdEquivalent * nearFraction;
  }
  if (stellarBridgeHopCount(plan) > 0) {
    bridgeFeeUsd += opts.stellarBridgeFeeUsd ?? usdEquivalent * (DEFAULT_STELLAR_BRIDGE_BPS / 10000);
  }
  const hasSwap = plan.steps.some(s => s.provider === 'nearintents');
  const senderFeeUsd = usdEquivalent * (SENDER_FEE_BPS / 10000);
  const appFeeUsd = usdEquivalent * (APP_FEE_BPS / 10000);
  const paycrestFeeUsd = Math.max(0, opts.paycrestFeeUsd ?? 0);
  const netUsd = Math.max(0, usdEquivalent - senderFeeUsd - appFeeUsd - bridgeFeeUsd - paycrestFeeUsd);
  return {
    estimatedDest: netUsd * sellRate,
    senderFeeUsd,
    appFeeUsd,
    bridgeFeeUsd,
    paycrestFeeUsd,
    netUsd,
    // Sizes the downstream Paycrest order. Follows the live NEAR cost when priced,
    // so the order matches the quote; the flat buffer otherwise.
    appFeeBps: APP_FEE_BPS + (hasSwap ? Math.round(nearFraction * 10000) : 0),
  };
}

/**
 * USD the payer must send so the merchant receives exactly `targetFiat`
 * (dest-anchored offramp). This is the single formula `/quotes` and `/orders` both
 * use — they previously disagreed (quotes always added the 2% buffer, even with no
 * swap in the route; orders added it only with one).
 *
 *   Paycrest pays out arrival × (1 − sender fee) − its flat fee, so arrival must be
 *   (targetFiat / sellRate + flat fee) / (1 − sender).
 *   deposit × (1 − app fee − NEAR cost) − Stellar-bridge cost = arrival
 *
 * The NEAR term stays the flat buffer here on purpose: for exact-output orders the
 * executor passes that same fee to NEAR as an appFee paid to Weave, so it is
 * partly revenue, not just headroom — changing it is a pricing decision.
 */
export function grossUpDestAnchoredUsd(p: {
  targetFiat: number;
  sellRate: number;
  plan: RoutePlan;
  /** Whole-USD cost of the Stellar → Base bridge hop, if the plan has one. */
  stellarBridgeFeeUsd?: number;
  /** Paycrest's per-order fee in USD, as read from Paycrest (0 if unknown). */
  paycrestFeeUsd?: number;
}): number {
  const hasSwap = p.plan.steps.some(s => s.provider === 'nearintents');
  const arrival = (p.targetFiat / p.sellRate + (p.paycrestFeeUsd ?? 0)) / (1 - SENDER_FEE_BPS / 10000);
  const keep = 1 - APP_FEE_BPS / 10000 - (hasSwap ? SLIPPAGE_BUFFER_BPS / 10000 : 0);
  const bridge = stellarBridgeHopCount(p.plan) > 0
    ? (p.stellarBridgeFeeUsd ?? arrival * (DEFAULT_STELLAR_BRIDGE_BPS / 10000))
    : 0;
  return (arrival + bridge) / keep;
}

export { SENDER_FEE_BPS, APP_FEE_BPS, SLIPPAGE_BUFFER_BPS, NEAR_QUOTE_MARGIN_BPS };
