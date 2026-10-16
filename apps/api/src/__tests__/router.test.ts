import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/nearintents.service', () => ({
  nearIntents: {
    chainIsKnown: (chain: string) =>
      ['BASE', 'ETHEREUM', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'BSC', 'AVALANCHE', 'SOLANA', 'STELLAR'].includes(
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

  // ── Stellar corridor (Pollar / SEP-24 anchor) ──────────────────────────────

  it('NGN → USDC(Stellar): paycrest onramp to Base, then nearintents to Stellar', () => {
    const plan = planRoute({ sourceAsset: 'fiat:NGN', destAsset: 'crypto:STELLAR:USDC', amount: 50000 });
    expect(plan.steps.map(s => s.provider)).toEqual(['paycrest', 'nearintents']);
    expect(plan.steps[0].toAsset).toBe('crypto:BASE:USDC');
    expect(plan.steps[1].toAsset).toBe('crypto:STELLAR:USDC');
  });

  it('USDC(Stellar) → NGN with a named payer: lifi (CCTP) to Base, then paycrest offramp', () => {
    const plan = planRoute({
      sourceAsset: 'crypto:STELLAR:USDC', destAsset: 'fiat:NGN', amount: 50,
      sourceWallet: 'GBJDOLDVIETPWPCNTIXYI425UISNNC2OKBH3L2EX5RB5232FHZRMDEDR',
    });
    expect(plan.steps.map(s => s.provider)).toEqual(['lifi', 'paycrest']);
    expect(plan.steps[0].toAsset).toBe('crypto:BASE:USDC');
  });

  // Payment links / cash-out links: the payer sends from an exchange or a phone
  // wallet we cannot ask for a signature, so LI.FI (which has no deposit
  // address, only an XDR to sign) must not be planned. NEAR Intents issues a
  // Stellar address + memo, which is what those screens render.
  it('USDC(Stellar) → NGN with an anonymous payer: nearintents, not lifi', () => {
    const plan = planRoute({ sourceAsset: 'crypto:STELLAR:USDC', destAsset: 'fiat:NGN', amount: 50 });
    expect(plan.steps.map(s => s.provider)).toEqual(['nearintents', 'paycrest']);
    expect(plan.steps[0].toAsset).toBe('crypto:BASE:USDC');
  });

  it('USDC(Stellar) → NGN with flow stellar: treasury collect then paycrest offramp', () => {
    const plan = planRoute({
      sourceAsset: 'crypto:STELLAR:USDC',
      destAsset: 'fiat:NGN',
      amount: 50,
      flow: 'stellar',
    });
    expect(plan.steps.map(s => s.provider)).toEqual(['stellar', 'paycrest']);
    expect(plan.steps[0].toAsset).toBe('crypto:BASE:USDC');
    expect(plan.steps[1].toAsset).toBe('fiat:NGN');
  });

  it('XLM(Stellar) → NGN: still nearintents (lifi edge is USDC-only)', () => {
    const plan = planRoute({ sourceAsset: 'crypto:STELLAR:XLM', destAsset: 'fiat:NGN', amount: 500 });
    expect(plan.steps.map(s => s.provider)).toEqual(['nearintents', 'paycrest']);
  });

  it('USDC(Base) → USDC(Stellar): single nearintents hop', () => {
    const plan = planRoute({ sourceAsset: 'crypto:BASE:USDC', destAsset: 'crypto:STELLAR:USDC', amount: 50 });
    expect(plan.steps.map(s => s.provider)).toEqual(['nearintents']);
  });

  it('USDC(Stellar) → USDC(Stellar): direct, no NEAR self-hop', () => {
    const plan = planRoute({ sourceAsset: 'crypto:STELLAR:USDC', destAsset: 'crypto:STELLAR:USDC', amount: 50 });
    expect(plan.steps.map(s => s.provider)).toEqual(['direct']);
  });

  it('USDC(Base) → NGN still prefers the single paycrest hop (Stellar never used as intermediate)', () => {
    const plan = planRoute({ sourceAsset: 'crypto:BASE:USDC', destAsset: 'fiat:NGN', amount: 50 });
    expect(plan.steps.map(s => s.provider)).toEqual(['paycrest']);
  });

  it('ETH(Ethereum) → NGN: nearintents bridge then paycrest offramp', () => {
    const plan = planRoute({ sourceAsset: 'crypto:ETHEREUM:ETH', destAsset: 'fiat:NGN', amount: 0.05 });
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].provider).toBe('nearintents');
    expect(plan.steps[1].provider).toBe('paycrest');
  });

  it('NGN → NGN: rejected while the Paystack kill switch is off (default)', () => {
    // PAYSTACK_ENABLED is unset in the test env, so naira collection is disabled.
    // The router must refuse the pure-fiat route rather than silently rerouting
    // it through Paycrest (onramp→offramp).
    expect(() =>
      planRoute({ sourceAsset: 'fiat:NGN', destAsset: 'fiat:NGN', amount: 5000, flow: 'external' }),
    ).toThrow(/temporarily unavailable/i);
  });

  it('NGN → NGN: single paystack step when PAYSTACK_ENABLED=true', async () => {
    const prev = process.env.PAYSTACK_ENABLED;
    process.env.PAYSTACK_ENABLED = 'true';
    vi.resetModules();
    try {
      const { planRoute: planEnabled } = await import('../services/router.service');
      const plan = planEnabled({ sourceAsset: 'fiat:NGN', destAsset: 'fiat:NGN', amount: 5000, flow: 'external' });
      expect(plan.steps).toHaveLength(1);
      expect(plan.steps[0].provider).toBe('paystack');
    } finally {
      process.env.PAYSTACK_ENABLED = prev;
      vi.resetModules();
    }
  });

  it('NGN → NGN: single bachs step when BACHS_ENABLED=true', async () => {
    const prev = process.env.BACHS_ENABLED;
    process.env.BACHS_ENABLED = 'true';
    vi.resetModules();
    try {
      const { planRoute: planEnabled } = await import('../services/router.service');
      const plan = planEnabled({ sourceAsset: 'fiat:NGN', destAsset: 'fiat:NGN', amount: 5000, flow: 'external' });
      expect(plan.steps).toHaveLength(1);
      expect(plan.steps[0].provider).toBe('bachs');
    } finally {
      process.env.BACHS_ENABLED = prev;
      vi.resetModules();
    }
  });

  it('NGN → NGN: bachs wins over paystack when both enabled', async () => {
    const prevB = process.env.BACHS_ENABLED;
    const prevP = process.env.PAYSTACK_ENABLED;
    process.env.BACHS_ENABLED = 'true';
    process.env.PAYSTACK_ENABLED = 'true';
    vi.resetModules();
    try {
      const { planRoute: planEnabled } = await import('../services/router.service');
      const plan = planEnabled({ sourceAsset: 'fiat:NGN', destAsset: 'fiat:NGN', amount: 5000, flow: 'external' });
      expect(plan.steps).toHaveLength(1);
      expect(plan.steps[0].provider).toBe('bachs');
    } finally {
      process.env.BACHS_ENABLED = prevB;
      process.env.PAYSTACK_ENABLED = prevP;
      vi.resetModules();
    }
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
