import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/nearintents.service', () => ({
  nearIntents: {
    chainIsKnown: (chain: string) =>
      ['BASE', 'ETHEREUM', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'BSC', 'AVALANCHE', 'SOLANA'].includes(
        chain.toUpperCase(),
      ),
  },
}));

import { planRoute } from '../services/router.service';

describe('planRoute', () => {
  it('USDC(Base) → NGN: single paycrest offramp step', () => {
    const plan = planRoute({ sourceAsset: 'crypto:BASE:USDC', destAsset: 'fiat:NGN', amount: 50 });
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].provider).toBe('paycrest');
  });

  it('ETH(Ethereum) → NGN: nearintents bridge then paycrest offramp', () => {
    const plan = planRoute({ sourceAsset: 'crypto:ETHEREUM:ETH', destAsset: 'fiat:NGN', amount: 0.05 });
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].provider).toBe('nearintents');
    expect(plan.steps[1].provider).toBe('paycrest');
  });

  it('NGN → NGN (external flow): single paystack step', () => {
    const plan = planRoute({ sourceAsset: 'fiat:NGN', destAsset: 'fiat:NGN', amount: 5000, flow: 'external' });
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].provider).toBe('paystack');
  });

  it('NGN → USDC(Base): single paycrest onramp step', () => {
    const plan = planRoute({ sourceAsset: 'fiat:NGN', destAsset: 'crypto:BASE:USDC', amount: 5000 });
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].provider).toBe('paycrest');
  });

  it('USDC(Base) → USDC(Base): direct same-asset transfer', () => {
    const plan = planRoute({ sourceAsset: 'crypto:BASE:USDC', destAsset: 'crypto:BASE:USDC', amount: 100 });
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].provider).toBe('direct');
  });

  it('USDC(Base) → NGN with flow:self: still uses paycrest (offramp is flow-agnostic)', () => {
    const plan = planRoute({ sourceAsset: 'crypto:BASE:USDC', destAsset: 'fiat:NGN', amount: 50, flow: 'self' });
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].provider).toBe('paycrest');
  });

  it('unknown corridor throws no-route error', () => {
    // BTC is not an EVM token and not in the nearIntents mock, so no provider can bridge it.
    expect(() =>
      planRoute({ sourceAsset: 'crypto:BITCOIN:BTC', destAsset: 'fiat:NGN', amount: 0.01 }),
    ).toThrow(/no route/i);
  });

  it('totalExpectedFeeBps is the sum of all step fees', () => {
    const plan = planRoute({ sourceAsset: 'crypto:ETHEREUM:ETH', destAsset: 'fiat:NGN', amount: 0.05 });
    const expected = plan.steps.reduce((s, x) => s + (x.expectedFeeBps ?? 0), 0);
    expect(plan.totalExpectedFeeBps).toBe(expected);
  });

  it('totalExpectedSecs is the sum of all step times', () => {
    const plan = planRoute({ sourceAsset: 'crypto:ETHEREUM:ETH', destAsset: 'fiat:NGN', amount: 0.05 });
    const expected = plan.steps.reduce((s, x) => s + (x.expectedSecs ?? 0), 0);
    expect(plan.totalExpectedSecs).toBe(expected);
  });
});
