import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// A scripted Horizon: `state.pages` are the treasury's transaction pages (newest
// first), `state.ops` the payment operations per tx hash.
const state = vi.hoisted(() => ({
  pages: [] as any[][],
  ops: {} as Record<string, any[]>,
  pageReads: 0,
}));

vi.mock('@stellar/stellar-sdk', async (orig) => {
  const actual: any = await orig();
  class FakeServer {
    transactions() {
      const b: any = {
        forAccount: () => b, order: () => b, limit: () => b,
        call: async () => makePage(0),
      };
      return b;
    }
    operations() {
      const b: any = {
        forTransaction: (hash: string) => ({ limit: () => ({ call: async () => ({ records: state.ops[hash] ?? [] }) }) }),
      };
      return b;
    }
  }
  function makePage(i: number): any {
    state.pageReads++;
    return { records: state.pages[i] ?? [], next: async () => makePage(i + 1) };
  }
  return { ...actual, Horizon: { ...actual.Horizon, Server: FakeServer } };
});

import {
  inspectMemoPayments, findMatchingPayment, stellarDepositTtlMinutes,
  stellarPollDelaySeconds, stellarPollMaxAttempts, stellarPollChainMinutes,
} from '../services/stellar.service';
import { classifyDepositShape } from '../services/order-event.service';

const TREASURY = 'GTREASURYXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
const ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'; // mainnet USDC

const NOW = Date.parse('2026-11-12T12:00:00Z');
const iso = (minAgo: number) => new Date(NOW - minAgo * 60_000).toISOString();

function tx(hash: string, memo: string | null, minAgo: number) {
  return { hash, memo, memo_type: memo ? 'text' : 'none', created_at: iso(minAgo) };
}
function pay(id: string, amount: string, over: Record<string, any> = {}) {
  return {
    id, type: 'payment', asset_type: 'credit_alphanum4', asset_code: 'USDC',
    asset_issuer: ISSUER, to: TREASURY, from: 'GPAYER', amount, ...over,
  };
}

const envKeys = ['WEAVE_STELLAR_PUBLIC_KEY', 'STELLAR_NETWORK', 'STELLAR_DEPOSIT_TTL_MINUTES'] as const;
const saved: Record<string, string | undefined> = {};
beforeEach(() => {
  for (const k of envKeys) saved[k] = process.env[k];
  process.env.WEAVE_STELLAR_PUBLIC_KEY = TREASURY;
  process.env.STELLAR_NETWORK = 'mainnet';
  state.pages = []; state.ops = {}; state.pageReads = 0;
});
afterEach(() => {
  for (const k of envKeys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
});

describe('inspectMemoPayments', () => {
  it('matches a single full payment', async () => {
    state.pages = [[tx('h1', 'ORDER1', 2)]];
    state.ops.h1 = [pay('1', '50.0000000')];
    const r = await inspectMemoPayments({ memo: 'ORDER1', expectedAmount: 50 });
    expect(r.status).toBe('matched');
    expect(r.total).toBe(50);
  });

  it('accepts a payment within the 0.5% tolerance and rejects below it', async () => {
    state.pages = [[tx('h1', 'ORDER1', 2)]];
    state.ops.h1 = [pay('1', '49.80')];
    expect((await inspectMemoPayments({ memo: 'ORDER1', expectedAmount: 50 })).status).toBe('matched');
    state.ops.h1 = [pay('1', '49.00')];
    expect((await inspectMemoPayments({ memo: 'ORDER1', expectedAmount: 50 })).status).toBe('underpaid');
  });

  it('sums a short payment and a later top-up with the same memo', async () => {
    state.pages = [[tx('h2', 'ORDER1', 1), tx('h1', 'ORDER1', 5)]];
    state.ops.h1 = [pay('1', '30')];
    state.ops.h2 = [pay('2', '20')];
    const r = await inspectMemoPayments({ memo: 'ORDER1', expectedAmount: 50 });
    expect(r.status).toBe('matched');
    expect(r.total).toBe(50);
    expect(r.payments.map(p => p.txHash)).toEqual(['h2', 'h1']); // newest first
  });

  it('reports underpaid (not none) for a short payment', async () => {
    state.pages = [[tx('h1', 'ORDER1', 2)]];
    state.ops.h1 = [pay('1', '30')];
    const r = await inspectMemoPayments({ memo: 'ORDER1', expectedAmount: 50 });
    expect(r.status).toBe('underpaid');
    expect(r.total).toBe(30);
    await expect(findMatchingPayment({ memo: 'ORDER1', expectedAmount: 50 })).resolves.toBeNull();
  });

  it('ignores other memos, no-memo transactions, and non-USDC / wrong-issuer / outgoing payments', async () => {
    state.pages = [[
      tx('a', 'OTHER', 1), tx('b', null, 1), tx('c', 'ORDER1', 1), tx('d', 'ORDER1', 1), tx('e', 'ORDER1', 1),
    ]];
    state.ops.a = [pay('1', '50')];
    state.ops.b = [pay('2', '50')];
    state.ops.c = [pay('3', '50', { asset_issuer: 'GFAKEISSUER' })];
    state.ops.d = [pay('4', '50', { asset_code: 'EURC' })];
    state.ops.e = [pay('5', '50', { to: 'GSOMEONEELSE' })];
    const r = await inspectMemoPayments({ memo: 'ORDER1', expectedAmount: 50 });
    expect(r.status).toBe('none');
    expect(r.payments).toEqual([]);
  });

  it('finds a payment buried past the first page (the old 30-tx lookback would have missed it)', async () => {
    const busy = Array.from({ length: 200 }, (_, i) => tx(`x${i}`, 'NOISE', 1));
    state.pages = [busy, [tx('late', 'ORDER1', 8)]];
    state.ops.late = [pay('1', '50')];
    const r = await inspectMemoPayments({ memo: 'ORDER1', expectedAmount: 50 });
    expect(r.status).toBe('matched');
    expect(state.pageReads).toBe(2);
  });

  it('stops at `since` instead of walking the whole history', async () => {
    const recent = Array.from({ length: 200 }, (_, i) => tx(`r${i}`, 'NOISE', 1));
    state.pages = [recent, [tx('old', 'ORDER1', 600)], [tx('older', 'ORDER1', 700)]];
    state.ops.old = [pay('1', '50')];
    // `since` 60 min ago: the 600-min-old payment is outside the window.
    const r = await inspectMemoPayments({ memo: 'ORDER1', expectedAmount: 50, since: new Date(NOW - 60 * 60_000) });
    expect(r.status).toBe('none');
    expect(r.truncated).toBe(false);
  });

  it('flags truncated when the page cap is hit before reaching `since`', async () => {
    const full = () => Array.from({ length: 200 }, (_, i) => tx(`p${i}`, 'NOISE', 1));
    state.pages = [full(), full(), full()];
    const r = await inspectMemoPayments({ memo: 'ORDER1', expectedAmount: 50, maxPages: 2 });
    expect(r.truncated).toBe(true);
    expect(state.pageReads).toBe(2);
  });

  it('does not double count the same operation', async () => {
    state.pages = [[tx('h1', 'ORDER1', 1)]];
    state.ops.h1 = [pay('1', '25'), pay('1', '25')];
    const r = await inspectMemoPayments({ memo: 'ORDER1', expectedAmount: 50 });
    expect(r.total).toBe(25);
  });
});

describe('findMatchingPayment', () => {
  it('returns the total and the newest tx hash', async () => {
    state.pages = [[tx('h2', 'ORDER1', 1), tx('h1', 'ORDER1', 5)]];
    state.ops.h1 = [pay('1', '30')];
    state.ops.h2 = [pay('2', '20')];
    const m = await findMatchingPayment({ memo: 'ORDER1', expectedAmount: 50 });
    expect(m).toMatchObject({ txHash: 'h2', amount: 50, memo: 'ORDER1' });
  });
});

describe('classifyDepositShape', () => {
  const base = { expected: 50, minAmount: 49.75, payments: [], truncated: false };
  it('flags underpaid', () => {
    expect(classifyDepositShape({ ...base, status: 'underpaid', total: 30 })).toBe('stellar.underpaid');
  });
  it('flags a >1% overpay but not a rounding-level one', () => {
    expect(classifyDepositShape({ ...base, status: 'matched', total: 52 })).toBe('stellar.overpaid');
    expect(classifyDepositShape({ ...base, status: 'matched', total: 50.2 })).toBeNull();
  });
  it('stays quiet when nothing arrived', () => {
    expect(classifyDepositShape({ ...base, status: 'none', total: 0 })).toBeNull();
  });
});

describe('stellarDepositTtlMinutes', () => {
  it('defaults to 30 and honours a sane override', () => {
    delete process.env.STELLAR_DEPOSIT_TTL_MINUTES;
    expect(stellarDepositTtlMinutes()).toBe(30);
    process.env.STELLAR_DEPOSIT_TTL_MINUTES = '120';
    expect(stellarDepositTtlMinutes()).toBe(120);
  });
  it('falls back to 30 for junk or out-of-range values', () => {
    for (const v of ['abc', '1', '99999', '-5']) {
      process.env.STELLAR_DEPOSIT_TTL_MINUTES = v;
      expect(stellarDepositTtlMinutes()).toBe(30);
    }
  });
});

describe('stellar poll backoff', () => {
  const total = (ttlMin: number) => {
    const max = stellarPollMaxAttempts(ttlMin, 10) - 6;
    let t = 0;
    for (let n = 1; n <= max; n++) t += stellarPollDelaySeconds(n, 10);
    return t;
  };

  it('polls at the base interval first, then 30 s, then 60 s', () => {
    expect(stellarPollDelaySeconds(1, 10)).toBe(10);
    expect(stellarPollDelaySeconds(12, 10)).toBe(10);   // still inside the first 2 min
    expect(stellarPollDelaySeconds(14, 10)).toBe(30);   // past 2 min
    expect(stellarPollDelaySeconds(40, 10)).toBe(60);   // past 10 min
  });

  it('never goes faster than a base interval slower than the stage', () => {
    expect(stellarPollDelaySeconds(1, 90)).toBe(90);
    expect(stellarPollDelaySeconds(30, 90)).toBe(90);
  });

  it('uses far fewer messages than the flat 10 s poll for a 30 min window', () => {
    const attempts = stellarPollMaxAttempts(30, 10);
    expect(attempts).toBeLessThan(70);                  // was 186
    expect(attempts).toBeGreaterThan(40);
  });

  it('still covers the whole deposit window', () => {
    for (const ttl of [5, 30, 120, 1440]) expect(total(ttl)).toBeGreaterThanOrEqual(ttl * 60);
  });
});

describe('stellarPollChainMinutes', () => {
  afterEach(() => { delete process.env.STELLAR_POLL_CHAIN_MINUTES; delete process.env.STELLAR_DEPOSIT_TTL_MINUTES; });

  it('defaults to 5 minutes', () => {
    expect(stellarPollChainMinutes()).toBe(5);
  });
  it('honours an override inside the deposit window', () => {
    process.env.STELLAR_POLL_CHAIN_MINUTES = '10';
    expect(stellarPollChainMinutes()).toBe(10);
  });
  it('ignores junk or a value longer than the deposit window', () => {
    for (const v of ['abc', '0', '-1', '999']) {
      process.env.STELLAR_POLL_CHAIN_MINUTES = v;
      expect(stellarPollChainMinutes()).toBe(5);
    }
  });
  it('an unpaid order costs few messages once the chain is short', () => {
    expect(stellarPollMaxAttempts(5, 10)).toBeLessThan(30);   // was 186 for a 30 min window
  });
});
