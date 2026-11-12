// The treasury is shared by every Stellar order, so bridging an order twice spends
// ANOTHER order's USDC. These tests pin the guard: who may bridge, what a failure
// before/after the bridge transaction means, and which orders the sweep picks up.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const m = vi.hoisted(() => ({
  prisma: {
    order: { findUnique: vi.fn(), update: vi.fn() },
    routeStep: { update: vi.fn(), updateMany: vi.fn() },
  },
  lifi: {
    getRoute: vi.fn(), stellarSacBalance: vi.fn(), stellarAllowance: vi.fn(),
    buildStellarApproveXdr: vi.fn(), getStepTransaction: vi.fn(), getStatus: vi.fn(),
  },
  sendTransaction: vi.fn(),
  getTransaction: vi.fn(),
  syncOrder: vi.fn(),
  recordServerEvent: vi.fn(),
  bridgeEnabled: { on: true },
}));

vi.mock('../lib/prisma', () => ({ prisma: m.prisma }));
vi.mock('../services/lifi.service', () => ({
  lifi: m.lifi,
  lifiAsset: () => ({ token: 'CTOKEN', chainId: 1, decimals: 7 }),
  LIFI_STELLAR_CHAIN_ID: 1,
}));
vi.mock('../services/executor.service', () => ({ syncOrder: m.syncOrder }));
vi.mock('../services/order-event.service', () => ({ recordServerEvent: m.recordServerEvent }));
vi.mock('../services/stellar.service', () => ({
  getNetworkPassphrase: () => 'pass',
  getTreasuryPublicKey: () => 'GTREASURY',
  isTreasuryBridgeEnabled: () => m.bridgeEnabled.on,
}));
vi.mock('@stellar/stellar-sdk', () => ({
  Keypair: { fromSecret: () => ({}) },
  TransactionBuilder: { fromXDR: () => ({ sign: () => {}, hash: () => Buffer.from('aa', 'hex') }) },
  rpc: {
    Server: class { sendTransaction = m.sendTransaction; getTransaction = m.getTransaction; },
    Api: { GetTransactionStatus: { SUCCESS: 'SUCCESS', FAILED: 'FAILED' } },
  },
}));

import { bridgeTreasuryUsdcToPaycrest, selectStuckBridgeOrders } from '../services/stellar-treasury-bridge.service';

const OLD = new Date(Date.now() - 10 * 60_000);
const order = (paycrest: Record<string, unknown> = {}) => ({
  id: 'ord-1', status: 'processing', sourceAmount: 0.8,
  steps: [
    { id: 's0', sequence: 0, provider: 'stellar', status: 'done', amountIn: 0.8, updatedAt: OLD, providerData: null },
    { id: 's1', sequence: 1, provider: 'paycrest', status: 'pending', depositAddress: '0x' + 'a'.repeat(40), providerData: null, ...paycrest },
  ],
});
const route = { id: 'route-1', steps: [{ tool: 'cctp', action: { fromAmount: '8000000' }, estimate: { approvalAddress: '', skipApproval: true } }] };

const claimCalls = () => m.prisma.routeStep.updateMany.mock.calls.filter(c => (c[0] as any).data.status === 'in_flight');
const releaseCalls = () => m.prisma.routeStep.updateMany.mock.calls.filter(c => (c[0] as any).data.status === 'pending');
const ambiguousWrites = () => m.prisma.routeStep.update.mock.calls.filter(c => (c[0] as any).data.providerData?.treasuryBridge?.ambiguous);

// The bridge really sleeps between submitting and polling; run it on fake timers.
async function bridge(orderId = 'ord-1', opts?: { force?: boolean }) {
  const p = bridgeTreasuryUsdcToPaycrest(orderId, opts);
  const settled = p.then(() => {}, () => {});
  await vi.advanceTimersByTimeAsync(10_000);
  await settled;
  return p;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  m.bridgeEnabled.on = true;
  process.env.WEAVE_STELLAR_SECRET_KEY = 'SSECRET';
  m.prisma.order.findUnique.mockResolvedValue(order());
  m.prisma.routeStep.updateMany.mockResolvedValue({ count: 1 });
  m.prisma.routeStep.update.mockResolvedValue({});
  m.lifi.getRoute.mockResolvedValue(route);
  m.lifi.stellarSacBalance.mockResolvedValue(10_000_000n);
  m.lifi.getStepTransaction.mockResolvedValue({ data: 'XDR' });
  m.lifi.getStatus.mockResolvedValue({ status: 'DONE' });
  m.sendTransaction.mockResolvedValue({ status: 'PENDING', hash: 'hash-1' });
  m.getTransaction.mockResolvedValue({ status: 'SUCCESS' });
  m.syncOrder.mockResolvedValue(undefined);
});

afterEach(() => { vi.useRealTimers(); });

describe('bridgeTreasuryUsdcToPaycrest — runs at most once', () => {
  it('claims the Paycrest step, bridges, and records the hash', async () => {
    const r = await bridge();
    expect(r).toEqual({ bridgeTxHash: 'hash-1' });
    expect(claimCalls()).toHaveLength(1);
    expect((claimCalls()[0][0] as any).where).toMatchObject({ id: 's1', status: { in: ['pending', 'awaiting_deposit'] } });
    const saved = m.prisma.routeStep.update.mock.calls.at(-1)![0] as any;
    expect(saved.data.providerData.treasuryBridge.bridgeTxHash).toBe('hash-1');
    expect(m.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it('a second run that finds the bridge recorded does nothing (QStash retry, sweep, double click)', async () => {
    m.prisma.order.findUnique.mockResolvedValue(order({ status: 'in_flight', providerData: { treasuryBridge: { bridgeTxHash: 'hash-1' } } }));
    expect(await bridge()).toEqual({ bridgeTxHash: 'hash-1', skipped: 'already_bridged' });
    expect(m.prisma.routeStep.updateMany).not.toHaveBeenCalled();
    expect(m.lifi.getRoute).not.toHaveBeenCalled();
    expect(m.sendTransaction).not.toHaveBeenCalled();
  });

  it('a retry that arrives after the order completed is a clean skip, not an error (so QStash stops retrying)', async () => {
    m.prisma.order.findUnique.mockResolvedValue(order({ status: 'done', providerData: { treasuryBridge: { bridgeTxHash: 'hash-1' } } }));
    expect(await bridge()).toEqual({ bridgeTxHash: 'hash-1', skipped: 'already_bridged' });
    // …even if the bridge was never recorded on a step that finished by another route:
    m.prisma.order.findUnique.mockResolvedValue(order({ status: 'done', providerData: null }));
    expect(await bridge()).toEqual({ bridgeTxHash: null, skipped: 'already_bridged' });
    expect(m.prisma.routeStep.updateMany).not.toHaveBeenCalled();
    expect(m.sendTransaction).not.toHaveBeenCalled();
  });

  it('loses the claim → backs off without touching LI.FI or the treasury (concurrent run in progress)', async () => {
    m.prisma.routeStep.updateMany.mockResolvedValue({ count: 0 });
    expect(await bridge()).toEqual({ bridgeTxHash: null, skipped: 'in_progress' });
    expect(m.lifi.getRoute).not.toHaveBeenCalled();
    expect(m.sendTransaction).not.toHaveBeenCalled();
  });

  it('an order flagged needs_review is never retried automatically', async () => {
    m.prisma.order.findUnique.mockResolvedValue(order({ providerData: { treasuryBridge: { ambiguous: true, error: 'rpc down' } } }));
    expect(await bridge()).toMatchObject({ skipped: 'needs_review', bridgeTxHash: null });
    expect(m.sendTransaction).not.toHaveBeenCalled();
  });

  it('only claims from pending / awaiting_deposit — a failed or in-flight step is not auto-bridged', async () => {
    // The claim is a compare-and-set on status: the DB (not this test) refuses other states.
    await bridge();
    expect(((claimCalls()[0][0] as any).where.status.in as string[]).sort()).toEqual(['awaiting_deposit', 'pending']);
  });

  it('refuses when the bridge is switched off', async () => {
    m.bridgeEnabled.on = false;
    await expect(bridge()).rejects.toThrow(/disabled/);
    expect(m.prisma.routeStep.updateMany).not.toHaveBeenCalled();
  });
});

describe('failure handling', () => {
  it('BEFORE the bridge tx is submitted: nothing left the treasury, so the claim is released and a retry can run', async () => {
    m.lifi.getRoute.mockRejectedValue(new Error('LI.FI: no route'));
    await expect(bridge()).rejects.toThrow(/no route/);
    expect(releaseCalls()).toHaveLength(1);
    expect((releaseCalls()[0][0] as any).where).toMatchObject({ id: 's1', status: 'in_flight' });
    expect(ambiguousWrites()).toHaveLength(0);
    expect(m.sendTransaction).not.toHaveBeenCalled();
  });

  it('a failed APPROVAL is still pre-bridge (it moves no USDC), so it releases the claim too', async () => {
    m.lifi.getRoute.mockResolvedValue({ ...route, steps: [{ ...route.steps[0], estimate: { approvalAddress: '0xspender', skipApproval: false } }] });
    m.lifi.stellarAllowance.mockResolvedValue(0n);
    m.lifi.buildStellarApproveXdr.mockResolvedValue({ xdr: 'APPROVE' });
    m.sendTransaction.mockRejectedValueOnce(new Error('approve failed'));
    await expect(bridge()).rejects.toThrow(/approve failed/);
    expect(releaseCalls()).toHaveLength(1);
    expect(ambiguousWrites()).toHaveLength(0);
  });

  it('AFTER the bridge tx may have been submitted: block automatic retries and flag for review', async () => {
    m.sendTransaction.mockRejectedValue(new Error('rpc connection reset'));
    await expect(bridge()).rejects.toThrow(/connection reset/);
    expect(releaseCalls()).toHaveLength(0); // must NOT free the claim
    const marks = ambiguousWrites();
    expect(marks).toHaveLength(1);
    expect((marks[0][0] as any).data.providerData.treasuryBridge).toMatchObject({ ambiguous: true, error: 'rpc connection reset' });
    expect(m.recordServerEvent).toHaveBeenCalledWith('ord-1', 'treasury.bridge.needs_review', expect.any(String), expect.any(Object));
  });

  it('after the hash is saved, a late failure (status check, sync) neither flags nor releases — a re-run is a no-op', async () => {
    m.lifi.getStatus.mockRejectedValue(new Error('li.fi status 502'));
    await expect(bridge()).rejects.toThrow(/502/);
    expect(releaseCalls()).toHaveLength(0);
    expect(ambiguousWrites()).toHaveLength(0);
    const saved = m.prisma.routeStep.update.mock.calls.find(c => (c[0] as any).data.providerData?.treasuryBridge?.bridgeTxHash);
    expect(saved).toBeTruthy();
  });

  it('`force` (operator, after verifying no tx landed) skips the guard entirely', async () => {
    m.prisma.order.findUnique.mockResolvedValue(order({ providerData: { treasuryBridge: { ambiguous: true } } }));
    const r = await bridge('ord-1', { force: true });
    expect(r.bridgeTxHash).toBe('hash-1');
    expect(claimCalls()).toHaveLength(0);
  });
});

describe('selectStuckBridgeOrders (the sweep)', () => {
  const now = Date.now();
  const o = (id: string, stellar: Record<string, unknown> = {}, paycrest: Record<string, unknown> = {}) => ({
    id,
    steps: [
      { sequence: 0, provider: 'stellar', status: 'done', updatedAt: new Date(now - 10 * 60_000), providerData: null, ...stellar },
      { sequence: 1, provider: 'paycrest', status: 'pending', updatedAt: new Date(now - 10 * 60_000), providerData: null, ...paycrest },
    ],
  });

  it('picks a confirmed deposit whose Paycrest step is untouched, once the normal job has had a few minutes', () => {
    expect(selectStuckBridgeOrders([o('a')], now)).toEqual(['a']);
    expect(selectStuckBridgeOrders([o('b', {}, { status: 'awaiting_deposit' })], now)).toEqual(['b']);
  });
  it('leaves a fresh deposit alone — the scheduled job is probably about to run', () => {
    expect(selectStuckBridgeOrders([o('a', { updatedAt: new Date(now - 60_000) })], now)).toEqual([]);
  });
  it('skips anything already claimed, in flight, finished, failed, recorded or flagged', () => {
    for (const p of [
      { status: 'in_flight' }, { status: 'done' }, { status: 'failed' },
      { providerData: { treasuryBridge: { bridgeTxHash: 'h' } } },
      { providerData: { treasuryBridge: { ambiguous: true } } },
    ]) expect(selectStuckBridgeOrders([o('x', {}, p)], now)).toEqual([]);
  });
  it('skips orders whose Stellar step is not done, or with no Paycrest step next', () => {
    expect(selectStuckBridgeOrders([o('x', { status: 'awaiting_deposit' })], now)).toEqual([]);
    expect(selectStuckBridgeOrders([{ id: 'y', steps: [o('y').steps[0]] }], now)).toEqual([]);
    expect(selectStuckBridgeOrders([o('z', {}, { sequence: 2 })], now)).toEqual([]);
  });
  it('returns the stuck ones among many', () => {
    expect(selectStuckBridgeOrders([o('a'), o('b', {}, { status: 'in_flight' }), o('c')], now)).toEqual(['a', 'c']);
  });
});
