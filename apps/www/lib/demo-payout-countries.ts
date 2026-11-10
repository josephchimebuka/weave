import { SUPPORTED_FIAT } from '@weave/shared';

export type PayoutRail = 'weave' | 'pollar' | 'soon';

export interface DemoPayoutCountry {
  id: string;
  name: string;
  currency: string;
  symbol: string;
  flag: string;
  rail: PayoutRail;
  /** ISO country code for display */
  region: 'africa' | 'latam';
}

const AFRICA: DemoPayoutCountry[] = SUPPORTED_FIAT.map(f => ({
  id: f.key.replace('fiat:', ''),
  name: f.country,
  currency: f.key.replace('fiat:', ''),
  symbol: f.symbol,
  flag: f.flag,
  rail: 'weave' as const,
  region: 'africa' as const,
}));

/** LatAm: only Bolivia is wired today (Pollar). Others are listed for roadmap clarity. */
const LATAM: DemoPayoutCountry[] = [
  { id: 'BO', name: 'Bolivia', currency: 'BOB', symbol: 'Bs ', flag: '🇧🇴', rail: 'pollar', region: 'latam' },
  { id: 'MX', name: 'Mexico', currency: 'MXN', symbol: '$', flag: '🇲🇽', rail: 'soon', region: 'latam' },
  { id: 'BR', name: 'Brazil', currency: 'BRL', symbol: 'R$', flag: '🇧🇷', rail: 'soon', region: 'latam' },
  { id: 'CO', name: 'Colombia', currency: 'COP', symbol: '$', flag: '🇨🇴', rail: 'soon', region: 'latam' },
  { id: 'AR', name: 'Argentina', currency: 'ARS', symbol: '$', flag: '🇦🇷', rail: 'soon', region: 'latam' },
];

export const DEMO_PAYOUT_COUNTRIES: DemoPayoutCountry[] = [...AFRICA, ...LATAM];

export function demoCountry(id: string): DemoPayoutCountry {
  return DEMO_PAYOUT_COUNTRIES.find(c => c.id === id) ?? AFRICA[0];
}

/** Demo amount guardrails per currency (not production limits). */
export type DemoAmountLimits = { min: number; max: number; defaultAmount: number };

export const DEMO_AMOUNT_LIMITS: Record<string, DemoAmountLimits> = {
  NGN: { min: 700, max: 1_000, defaultAmount: 800 },
  KES: { min: 500, max: 5_000, defaultAmount: 1_000 },
  UGX: { min: 5_000, max: 50_000, defaultAmount: 10_000 },
  TZS: { min: 5_000, max: 50_000, defaultAmount: 10_000 },
  BOB: { min: 50, max: 500, defaultAmount: 120 },
};
