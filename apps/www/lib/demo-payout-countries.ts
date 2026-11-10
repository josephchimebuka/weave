import { SUPPORTED_FIAT } from '@weave/shared';

export interface DemoPayoutCountry {
  id: string;
  name: string;
  currency: string;
  symbol: string;
  flag: string;
}

/** Demo payout countries = Weave African fiat catalog only. */
export const DEMO_PAYOUT_COUNTRIES: DemoPayoutCountry[] = SUPPORTED_FIAT.map(f => ({
  id: f.key.replace('fiat:', ''),
  name: f.country,
  currency: f.key.replace('fiat:', ''),
  symbol: f.symbol,
  flag: f.flag,
}));

export function demoCountry(id: string): DemoPayoutCountry {
  return DEMO_PAYOUT_COUNTRIES.find(c => c.id === id) ?? DEMO_PAYOUT_COUNTRIES[0];
}

/** Demo amount guardrails per currency (not production limits). */
export type DemoAmountLimits = { min: number; max: number; defaultAmount: number };

export const DEMO_AMOUNT_LIMITS: Record<string, DemoAmountLimits> = {
  NGN: { min: 700, max: 1_000, defaultAmount: 800 },
  KES: { min: 500, max: 5_000, defaultAmount: 1_000 },
  UGX: { min: 5_000, max: 50_000, defaultAmount: 10_000 },
  TZS: { min: 5_000, max: 50_000, defaultAmount: 10_000 },
};
