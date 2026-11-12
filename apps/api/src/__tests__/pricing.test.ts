// Quote/order pricing: the fee estimator, the dest-anchored gross-up, and the live
// hop costs they're fed (Paycrest's protocol fee, the Stellar bridge, NEAR).
// Services are exercised as real instances with their network calls stubbed.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  estimateFiatFromUsdOfframp, grossUpDestAnchoredUsd, stellarBridgeHopCount,
  SENDER_FEE_BPS, APP_FEE_BPS, SLIPPAGE_BUFFER_BPS,
} from '../lib/offramp-estimate';
import { resolveDestAnchoredUsd } from '../services/offramp-pricing';
import { LifiService, lifi, fallbackStellarBridgeEstimate } from '../services/lifi.service';
import { NearIntentsService } from '../services/nearintents.service';
import { PaycrestService, paycrest } from '../services/paycrest.service';
import type { RoutePlan } from '../services/router.service';

const plan = (steps: Array<[string, string, string]>): RoutePlan => ({
  steps: steps.map(([provider, fromAsset, toAsset]) => ({ provider: provider as any, fromAsset, toAsset })),
  totalExpectedFeeBps: 0, totalExpectedSecs: 0, summary: '',
});
const DIRECT   = plan([['paycrest', 'crypto:BASE:USDC', 'fiat:NGN']]);
const VIA_NEAR = plan([['nearintents', 'crypto:BSC:USDC', 'crypto:BASE:USDC'], ['paycrest', 'crypto:BASE:USDC', 'fiat:NGN']]);
const TREASURY = plan([['stellar', 'crypto:STELLAR:USDC', 'crypto:BASE:USDC'], ['paycrest', 'crypto:BASE:USDC', 'fiat:NGN']]);
const LIFI_P   = plan([['lifi', 'crypto:STELLAR:USDC', 'crypto:BASE:USDC'], ['paycrest', 'crypto:BASE:USDC', 'fiat:NGN']]);

const RATE = 1388.97;
const s = SENDER_FEE_BPS / 1e4, a = APP_FEE_BPS / 1e4, slip = SLIPPAGE_BUFFER_BPS / 1e4;
// An INPUT: Paycrest sets it and the API reads it live. (0.02 is what it charged on 12 Nov.)
const FEE = 0.02;
// Paycrest pays arrival × (1 − sender fee) − its flat fee.
const ordersFormula = (target: number, hasSwap: boolean) =>
  ((target / RATE + FEE) / (1 - s)) / (1 - a - (hasSwap ? slip : 0));

// ─────────────────────────────────────────────────────────────────────────────
describe('grossUpDestAnchoredUsd', () => {
  it('matches the /orders formula (plus Paycrest’s fee) for plans with no Stellar hop', () => {
    expect(grossUpDestAnchoredUsd({ targetFiat: 50_000, sellRate: RATE, plan: DIRECT, paycrestFeeUsd: FEE }))
      .toBeCloseTo(ordersFormula(50_000, false), 8);
    expect(grossUpDestAnchoredUsd({ targetFiat: 50_000, sellRate: RATE, plan: VIA_NEAR, paycrestFeeUsd: FEE }))
      .toBeCloseTo(ordersFormula(50_000, true), 8);
    // …and with no fee known, it is exactly the old formula (nothing invented).
    expect(grossUpDestAnchoredUsd({ targetFiat: 50_000, sellRate: RATE, plan: DIRECT }))
      .toBeCloseTo((50_000 / RATE / (1 - s)) / (1 - a), 8);
  });

  it('REGRESSION: no longer adds the 2% swap buffer when there is no swap in the route (/quotes did)', () => {
    const noSwap = grossUpDestAnchoredUsd({ targetFiat: 50_000, sellRate: RATE, plan: DIRECT });
    const withSwap = grossUpDestAnchoredUsd({ targetFiat: 50_000, sellRate: RATE, plan: VIA_NEAR });
    expect(withSwap / noSwap).toBeGreaterThan(1.015);
    const oldQuotes = (50_000 / RATE) / (1 - (s + a + slip));
    expect(noSwap).toBeLessThan(oldQuotes * 0.985); // old /quotes overcharged a direct route by ~2%
  });

  it('adds the Stellar bridge cost so the merchant is not left short', () => {
    const blind = grossUpDestAnchoredUsd({ targetFiat: 50_000, sellRate: RATE, plan: TREASURY, stellarBridgeFeeUsd: 0 });
    const live  = grossUpDestAnchoredUsd({ targetFiat: 50_000, sellRate: RATE, plan: TREASURY, stellarBridgeFeeUsd: 0.5 });
    expect(live - blind).toBeCloseTo(0.5 / (1 - a), 8);
  });

  it('falls back to CCTP-level 0.25% when no live bridge figure is given', () => {
    const arrival = (50_000 / RATE + FEE) / (1 - s);
    const g = grossUpDestAnchoredUsd({ targetFiat: 50_000, sellRate: RATE, plan: TREASURY, paycrestFeeUsd: FEE });
    expect(g).toBeCloseTo((arrival + arrival * 0.0025) / (1 - a), 8);
  });

  it('round trip: what the estimator says the merchant gets ≈ the target (within a few hundredths of a percent)', () => {
    for (const p of [DIRECT, VIA_NEAR]) {
      const usd = grossUpDestAnchoredUsd({ targetFiat: 50_000, sellRate: RATE, plan: p, paycrestFeeUsd: FEE });
      const est = estimateFiatFromUsdOfframp(usd, RATE, p, { paycrestFeeUsd: FEE });
      expect(Math.abs(est.estimatedDest - 50_000) / 50_000).toBeLessThan(0.0005);
    }
    const usd = grossUpDestAnchoredUsd({ targetFiat: 50_000, sellRate: RATE, plan: TREASURY, stellarBridgeFeeUsd: 0.5, paycrestFeeUsd: FEE });
    const est = estimateFiatFromUsdOfframp(usd, RATE, TREASURY, { stellarBridgeFeeUsd: 0.5, paycrestFeeUsd: FEE });
    expect(Math.abs(est.estimatedDest - 50_000) / 50_000).toBeLessThan(0.0005);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('estimateFiatFromUsdOfframp', () => {
  it('hop counting: treasury + lifi count, others do not', () => {
    expect(stellarBridgeHopCount(TREASURY)).toBe(1);
    expect(stellarBridgeHopCount(LIFI_P)).toBe(1);
    expect(stellarBridgeHopCount(DIRECT)).toBe(0);
    expect(stellarBridgeHopCount(VIA_NEAR)).toBe(0);
  });

  it('REGRESSION: a $0.80 treasury order was quoted ~₦1,101 and settled ₦988 — live bridge + Paycrest fee close it', () => {
    const blind = estimateFiatFromUsdOfframp(0.8, RATE, TREASURY);
    const live  = estimateFiatFromUsdOfframp(0.8, RATE, TREASURY, { stellarBridgeFeeUsd: 0.063135, paycrestFeeUsd: 0.02 });
    expect(live.bridgeFeeUsd).toBeCloseTo(0.063135, 6);
    expect(live.estimatedDest).toBeLessThan(blind.estimatedDest);
    // Both real mainnet runs settled ₦988.34 (bridge delivered 0.736865; Paycrest took
    // 0.0053 sender fee + 0.02 transaction fee). The estimate must land within 0.5%.
    expect(Math.abs(live.estimatedDest - 988.34) / 988.34).toBeLessThan(0.005);
    expect(live.paycrestFeeUsd).toBe(0.02);
    expect(live.estimatedDest).toBeCloseTo((0.8 - 0.006 - 0.0008 - 0.063135 - 0.02) * RATE, 2);
  });

  it('without a live figure it still charges CCTP-level 0.25%, never zero', () => {
    expect(estimateFiatFromUsdOfframp(100, RATE, TREASURY).bridgeFeeUsd).toBeCloseTo(0.25, 6);
  });

  it('a plan with no Stellar hop is priced exactly as before', () => {
    expect(estimateFiatFromUsdOfframp(100, RATE, DIRECT, { stellarBridgeFeeUsd: 5 }).bridgeFeeUsd).toBe(0);
    expect(estimateFiatFromUsdOfframp(100, RATE, VIA_NEAR).bridgeFeeUsd).toBeCloseTo(100 * slip, 6);
  });

  it('Paycrest fee unknown means 0 in the estimate, not a guessed figure', () => {
    const e = estimateFiatFromUsdOfframp(100, RATE, DIRECT);
    expect(e.paycrestFeeUsd).toBe(0);
    expect(e.netUsd).toBeCloseTo(100 - 100 * s - 100 * a, 8);
  });

  it('Paycrest fee is its own line and comes off the payout; ~2.5% of $0.80, ~0.04% of $50', () => {
    const e = estimateFiatFromUsdOfframp(100, RATE, DIRECT, { paycrestFeeUsd: FEE });
    expect(e.paycrestFeeUsd).toBe(FEE);
    expect(e.netUsd).toBeCloseTo(100 - 100 * s - 100 * a - FEE, 8);
    expect(FEE / 0.8).toBeGreaterThan(0.02);
    expect(FEE / 50).toBeLessThan(0.0005);
  });

  it('the dest-anchored gross-up pays for the fee, so the merchant still nets the target', () => {
    const withFee = grossUpDestAnchoredUsd({ targetFiat: 10_000, sellRate: RATE, plan: DIRECT, paycrestFeeUsd: FEE });
    const est = estimateFiatFromUsdOfframp(withFee, RATE, DIRECT, { paycrestFeeUsd: FEE });
    expect(Math.abs(est.estimatedDest - 10_000) / 10_000).toBeLessThan(0.0005);
    expect(withFee).toBeGreaterThan((10_000 / RATE) / (1 - s) / (1 - a)); // dearer than ignoring it
  });

  it('uses a live NEAR cost + margin instead of the flat 2%, and sizes the Paycrest order to match', () => {
    const flat = estimateFiatFromUsdOfframp(100, RATE, VIA_NEAR);
    const live = estimateFiatFromUsdOfframp(100, RATE, VIA_NEAR, { nearCostBps: 20 });
    expect(flat.bridgeFeeUsd).toBeCloseTo(100 * slip, 8);
    expect(live.bridgeFeeUsd).toBeCloseTo(100 * (20 + 30) / 1e4, 8); // 20 live + 30 margin default
    expect(live.estimatedDest).toBeGreaterThan(flat.estimatedDest);
    expect(live.appFeeBps).toBe(APP_FEE_BPS + 50);
    expect(flat.appFeeBps).toBe(APP_FEE_BPS + SLIPPAGE_BUFFER_BPS);
  });

  it('a live NEAR cost changes nothing for plans without a NEAR hop', () => {
    expect(estimateFiatFromUsdOfframp(100, RATE, DIRECT, { nearCostBps: 999 })).toEqual(estimateFiatFromUsdOfframp(100, RATE, DIRECT));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('resolveDestAnchoredUsd', () => {
  let bridgeFee: ReturnType<typeof vi.spyOn>;
  let pcFee: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    bridgeFee = vi.spyOn(lifi, 'stellarBridgeFeeForPlan');
    pcFee = vi.spyOn(paycrest, 'feeForPlan').mockResolvedValue({ feeUsd: FEE, known: true });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('fetches the bridge cost at the first-pass size, then prices again with it', async () => {
    bridgeFee.mockResolvedValue(0.125);
    const first = grossUpDestAnchoredUsd({ targetFiat: 70_000, sellRate: RATE, plan: TREASURY, paycrestFeeUsd: FEE });
    const usd = await resolveDestAnchoredUsd({ targetFiat: 70_000, sellRate: RATE, plan: TREASURY });
    expect(bridgeFee).toHaveBeenCalledTimes(1);
    expect(bridgeFee.mock.calls[0][1]).toBeCloseTo(first, 8);
    expect(usd).toBeCloseTo(grossUpDestAnchoredUsd({ targetFiat: 70_000, sellRate: RATE, plan: TREASURY, stellarBridgeFeeUsd: 0.125, paycrestFeeUsd: FEE }), 8);
  });

  it('returns the first-pass figure when there is nothing to look up (no hop, or sandbox)', async () => {
    bridgeFee.mockResolvedValue(undefined);
    expect(await resolveDestAnchoredUsd({ targetFiat: 70_000, sellRate: RATE, plan: DIRECT })).toBeCloseTo(ordersFormula(70_000, false), 8);
  });

  it('prices an unknown Paycrest fee as 0 rather than inventing one', async () => {
    pcFee.mockResolvedValue({ feeUsd: 0, known: false });
    bridgeFee.mockResolvedValue(undefined);
    expect(await resolveDestAnchoredUsd({ targetFiat: 70_000, sellRate: RATE, plan: DIRECT })).toBeCloseTo((70_000 / RATE / (1 - s)) / (1 - a), 8);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Paycrest protocol fee (PaycrestService.transactionFee)', () => {
  let P: PaycrestService;
  let listOrders: ReturnType<typeof vi.spyOn>;
  // Shaped like Paycrest's /sender/orders items (verified against our account's live records).
  const order = (o: Record<string, any>) => ({
    direction: 'offramp', createdAt: '2026-11-12T01:31:19Z', transactionFee: '0.02',
    source: { type: 'crypto', currency: 'USDC', network: 'base' }, ...o,
  });
  beforeEach(() => { P = new PaycrestService(); listOrders = vi.spyOn(P, 'listOrders'); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('reads the fee Paycrest actually charged on the latest USDC-on-Base offramp', async () => {
    listOrders.mockResolvedValue({ total: 2, orders: [
      order({ createdAt: '2026-11-12T00:58:00Z', transactionFee: '0.02' }),
      order({ createdAt: '2026-11-12T01:31:19Z', transactionFee: '0.03' }), // newest wins
    ] } as any);
    expect(await P.transactionFee()).toEqual({ feeUsd: 0.03, known: true, observedAt: '2026-11-12T01:31:19Z' });
  });

  it('is per token and network — a cNGN/BNB fee (₦55) or another network never leaks in', async () => {
    listOrders.mockResolvedValue({ total: 3, orders: [
      order({ source: { type: 'crypto', currency: 'CNGN', network: 'bnb-smart-chain' }, transactionFee: '55' }),
      order({ source: { type: 'crypto', currency: 'USDC', network: 'solana' }, transactionFee: '0.1' }),
      order({ source: { type: 'crypto', currency: 'USDC', network: 'base' }, transactionFee: '0.02' }),
    ] } as any);
    expect((await P.transactionFee({ network: 'base', token: 'USDC' })).feeUsd).toBe(0.02);
    // A different network is a separate lookup (and a separate cache entry) on the same instance.
    expect((await P.transactionFee({ network: 'solana', token: 'USDC' })).feeUsd).toBe(0.1);
  });

  it('only USD stablecoins convert to USD; anything else is unknown, not guessed', async () => {
    expect(await P.transactionFee({ network: 'base', token: 'CNGN' })).toEqual({ feeUsd: 0, known: false });
    expect(listOrders).not.toHaveBeenCalled();
  });

  it('is unknown (known:false) when no matching order has been seen, or the direction differs', async () => {
    listOrders.mockResolvedValue({ total: 1, orders: [order({ direction: 'onramp' })] } as any);
    expect(await P.transactionFee()).toEqual({ feeUsd: 0, known: false });
  });

  it('caches for a few minutes and dedupes concurrent reads', async () => {
    listOrders.mockResolvedValue({ total: 1, orders: [order({})] } as any);
    await Promise.all([1, 2, 3].map(() => P.transactionFee()));
    await P.transactionFee();
    expect(listOrders).toHaveBeenCalledTimes(1);
  });

  it('serves the last known value if Paycrest cannot be reached later, and never throws', async () => {
    vi.useFakeTimers();
    try {
      listOrders.mockResolvedValueOnce({ total: 1, orders: [order({ transactionFee: '0.02' })] } as any);
      await P.transactionFee();
      vi.setSystemTime(Date.now() + 10 * 60_000); // past the 5-minute freshness window
      listOrders.mockRejectedValue(new Error('Paycrest 503'));
      expect(await P.transactionFee()).toMatchObject({ feeUsd: 0.02, known: true });
    } finally { vi.useRealTimers(); }
  });

  it('never throws and reports unknown when it has never read the fee', async () => {
    listOrders.mockRejectedValue(new Error('Paycrest 503'));
    expect(await P.transactionFee()).toEqual({ feeUsd: 0, known: false });
  });

  it('ignores malformed fees', async () => {
    listOrders.mockResolvedValue({ total: 2, orders: [order({ transactionFee: 'abc' }), order({ transactionFee: '-1' })] } as any);
    expect((await P.transactionFee()).known).toBe(false);
  });

  it('feeForPlan: looks up the plan’s crypto→fiat Paycrest hop; undefined in sandbox or without one', async () => {
    listOrders.mockResolvedValue({ total: 1, orders: [order({})] } as any);
    expect(await P.feeForPlan(DIRECT)).toMatchObject({ feeUsd: 0.02, known: true });
    listOrders.mockClear();
    expect(await P.feeForPlan(DIRECT, { sandbox: true })).toBeUndefined();
    expect(await P.feeForPlan(plan([['paycrest', 'fiat:NGN', 'crypto:BASE:USDC']]))).toBeUndefined();
    expect(await P.feeForPlan(plan([['nearintents', 'crypto:BSC:USDC', 'crypto:BASE:USDC']]))).toBeUndefined();
    expect(listOrders).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Stellar bridge estimate (LifiService.estimateStellarBridge)', () => {
  const env = ['WEAVE_STELLAR_PUBLIC_KEY', 'WEAVE_STELLAR_SECRET_KEY', 'STELLAR_TREASURY_BRIDGE_ENABLED'] as const;
  const saved: Record<string, string | undefined> = {};
  let L: LifiService;
  let getRoute: ReturnType<typeof vi.spyOn>;
  // What LI.FI returned for real: $0.80 over Layerswap delivered 0.736865.
  const route = (toAmount: string, toAmountMin = toAmount) => ({ steps: [{ estimate: { toAmount, toAmountMin } }] }) as any;

  beforeEach(() => {
    for (const k of env) saved[k] = process.env[k];
    process.env.WEAVE_STELLAR_PUBLIC_KEY = 'GTREASURY';
    process.env.WEAVE_STELLAR_SECRET_KEY = 'SSECRET';
    delete process.env.STELLAR_TREASURY_BRIDGE_ENABLED;
    L = new LifiService();
    getRoute = vi.spyOn(L, 'getRoute');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    for (const k of env) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  });

  it('reads the live route: sub-$2 over Layerswap costs ~7.9%', async () => {
    getRoute.mockResolvedValue(route('736865', '733181'));
    const e = await L.estimateStellarBridge(0.8);
    expect(e.source).toBe('live');
    expect(e.arrivalUsd).toBeCloseTo(0.736865, 6);
    expect(e.feeUsd).toBeCloseTo(0.063135, 6);
    expect(e.arrivalMinUsd).toBeCloseTo(0.733181, 6);
  });

  it('from $2 up CCTP is a flat 0.25%', async () => {
    getRoute.mockResolvedValue(route('49875000'));
    expect((await L.estimateStellarBridge(50)).feeUsd).toBeCloseTo(0.125, 6);
  });

  it('caches per amount for a minute and dedupes concurrent calls', async () => {
    getRoute.mockResolvedValue(route('49875000'));
    await Promise.all([L.estimateStellarBridge(50), L.estimateStellarBridge(50), L.estimateStellarBridge(50)]);
    await L.estimateStellarBridge(50);
    expect(getRoute).toHaveBeenCalledTimes(1);
    await L.estimateStellarBridge(60);
    expect(getRoute).toHaveBeenCalledTimes(2);
  });

  it('falls back (never throws, never caches the fallback) when LI.FI fails', async () => {
    getRoute.mockRejectedValue(new Error('li.fi down'));
    const e = await L.estimateStellarBridge(0.8);
    expect(e.source).toBe('fallback');
    expect(e.feeUsd).toBeCloseTo(0.8 * 0.0025 + 0.07, 6); // tiny sizes assume the fixed cost
    getRoute.mockResolvedValue(route('49875000'));
    expect((await L.estimateStellarBridge(0.8)).source).toBe('live'); // retried, not stuck on fallback
  });

  it('fallback is a flat 0.25% from $2 up', () => {
    expect(fallbackStellarBridgeEstimate(100).feeUsd).toBeCloseTo(0.25, 6);
  });

  it('stellarBridgeFeeForPlan prices the treasury hop and the named-wallet lifi hop', async () => {
    getRoute.mockResolvedValue(route('49875000'));
    expect(await L.stellarBridgeFeeForPlan(TREASURY, 50)).toBeCloseTo(0.125, 6);
    expect(await L.stellarBridgeFeeForPlan(LIFI_P, 50)).toBeCloseTo(0.125, 6);
  });

  it('is undefined with no Stellar bridge hop, in sandbox, or for the treasury hop when the bridge is off', async () => {
    expect(await L.stellarBridgeFeeForPlan(DIRECT, 50)).toBeUndefined();
    expect(await L.stellarBridgeFeeForPlan(VIA_NEAR, 50)).toBeUndefined();
    expect(await L.stellarBridgeFeeForPlan(TREASURY, 50, { sandbox: true })).toBeUndefined();
    process.env.STELLAR_TREASURY_BRIDGE_ENABLED = 'false';
    expect(await L.stellarBridgeFeeForPlan(TREASURY, 50)).toBeUndefined();
    expect(getRoute).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('NEAR live hop cost (NearIntentsService.estimateHopCostBps)', () => {
  let N: NearIntentsService;
  let resolveToken: ReturnType<typeof vi.spyOn>;
  let createQuote: ReturnType<typeof vi.spyOn>;
  const quote = (inUsd: string, outUsd: string) => ({ quote: { amountInUsd: inUsd, amountOutUsd: outUsd } }) as any;

  beforeEach(() => {
    N = new NearIntentsService();
    resolveToken = vi.spyOn(N, 'resolveToken');
    createQuote = vi.spyOn(N, 'createQuote');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('derives bps from the dry quote’s USD in/out (a July $0.76 BSC order lost 3.4%)', async () => {
    resolveToken.mockResolvedValue({ price: 1 } as any);
    createQuote.mockResolvedValue(quote('0.7627', '0.7367'));
    expect(await N.estimateHopCostBps('crypto:BSC:USDC', 0.7627)).toBeCloseTo(340.9, 0);
    expect(createQuote.mock.calls[0][0]).toMatchObject({ dry: true, swapType: 'EXACT_INPUT', destAssetKey: 'crypto:BASE:USDC' });
  });

  it('converts USD to source-token units using the token price', async () => {
    resolveToken.mockResolvedValue({ price: 2000 } as any);
    createQuote.mockResolvedValue(quote('100', '99.7'));
    await N.estimateHopCostBps('crypto:ETHEREUM:ETH', 100);
    expect((createQuote.mock.calls[0][0] as any).amount).toBeCloseTo(0.05, 8);
  });

  it('is undefined (caller keeps the flat buffer) for chains without a sample address, on errors, and for fiat', async () => {
    expect(await N.estimateHopCostBps('crypto:BITCOIN:BTC', 50)).toBeUndefined();
    expect(await N.estimateHopCostBps('fiat:NGN', 50)).toBeUndefined();
    resolveToken.mockResolvedValue({ price: 1 } as any);
    createQuote.mockRejectedValue(new Error('NEAR Intents 400: amount too low'));
    expect(await N.estimateHopCostBps('crypto:BSC:USDC', 0.5)).toBeUndefined();
  });

  it('caches per asset and amount, and dedupes concurrent lookups', async () => {
    resolveToken.mockResolvedValue({ price: 1 } as any);
    createQuote.mockResolvedValue(quote('50', '49.9'));
    await Promise.all([1, 2, 3].map(() => N.estimateHopCostBps('crypto:SOLANA:USDC', 50)));
    await N.estimateHopCostBps('crypto:SOLANA:USDC', 50);
    expect(createQuote).toHaveBeenCalledTimes(1);
  });

  it('costBpsForPlan only prices a crypto→Base-USDC NEAR step, never in sandbox', async () => {
    resolveToken.mockResolvedValue({ price: 1 } as any);
    createQuote.mockResolvedValue(quote('50', '49.9'));
    expect(await N.costBpsForPlan(DIRECT, 50)).toBeUndefined();
    expect(await N.costBpsForPlan(TREASURY, 50)).toBeUndefined();
    expect(await N.costBpsForPlan(VIA_NEAR, 50, { sandbox: true })).toBeUndefined();
    expect(await N.costBpsForPlan(VIA_NEAR, 50)).toBeCloseTo(20, 4);
  });
});
