// Async orchestration around the pure fee maths in lib/offramp-estimate.ts:
// fetches the live hop costs, then prices. `/quotes` and `/orders` both go through
// here for dest-anchored offramps so a payer is charged exactly what they were shown.

import { grossUpDestAnchoredUsd } from '../lib/offramp-estimate';
import { lifi } from './lifi.service';
import { paycrest } from './paycrest.service';
import type { RoutePlan } from './router.service';

/**
 * USD to collect so the merchant receives exactly `targetFiat`. The Stellar bridge
 * cost depends on the amount being bridged, which depends on the gross-up — so
 * price once without it to learn the size, fetch the live cost there, price again.
 * The second pass's error is second-order (a few hundredths of a cent).
 */
export async function resolveDestAnchoredUsd(p: {
  targetFiat: number;
  sellRate: number;
  plan: RoutePlan;
  sandbox?: boolean;
}): Promise<number> {
  // Paycrest's per-order fee is the protocol's, read live (0 if unknown) — not configured.
  const paycrestFeeUsd = (await paycrest.feeForPlan(p.plan, { sandbox: p.sandbox }))?.feeUsd ?? 0;
  const first = grossUpDestAnchoredUsd({ targetFiat: p.targetFiat, sellRate: p.sellRate, plan: p.plan, paycrestFeeUsd });
  const stellarBridgeFeeUsd = await lifi.stellarBridgeFeeForPlan(p.plan, first, { sandbox: p.sandbox });
  if (stellarBridgeFeeUsd === undefined) return first;
  return grossUpDestAnchoredUsd({ targetFiat: p.targetFiat, sellRate: p.sellRate, plan: p.plan, stellarBridgeFeeUsd, paycrestFeeUsd });
}
