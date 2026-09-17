// Resolves (sourceAsset, destAsset, amount) into an ordered list of provider
// hops. v1 knows Paycrest (fiat↔USDC on supported EVM chains) + ChainRails
// (EVM USDC bridge to Base) + direct same-asset transfer. New rails (Stellar
// anchors, direct bank partnerships) drop in as additional edges.

import { parseAsset, type AssetKey, type ParsedAsset } from '../lib/assets';
import { nearIntents } from './nearintents.service';
import { PAYSTACK_ENABLED, BACHS_ENABLED, NAIRA_ENABLED, NAIRA_DISABLED_MESSAGE } from '../lib/flags';

export type Provider = 'paycrest' | 'chainrails' | 'nearintents' | 'lifi' | 'stellar_simulator' | 'stellar_anchor' | 'direct' | 'paystack' | 'bachs';

// Which checkout flow the caller is in. 'self' means the user signs with a
// connected wallet (ChainRails can do this once it's fully wired). 'external'
// means the widget shows a deposit address for a third party to pay — this
// is what NEAR Intents is built for. Default is 'external' because CR is
// not yet integrated.
export type Flow = 'self' | 'external';

export interface RoutePlanStep {
  provider: Provider;
  fromAsset: AssetKey;
  toAsset: AssetKey;
  expectedFeeBps?: number;
  expectedSecs?: number;
  note?: string;
}

export interface RouteRequest {
  sourceAsset: AssetKey;
  destAsset: AssetKey;
  amount: number; // denominated in sourceAsset
  urgency?: 'cheapest' | 'fastest';
  flow?: Flow;   // selects which cross-chain provider handles the crypto leg
}

export interface RoutePlan {
  steps: RoutePlanStep[];
  totalExpectedFeeBps: number;
  totalExpectedSecs: number;
  summary: string;
}

// ── Edges ───────────────────────────────────────────────────────────────────

type Edge = {
  provider: Provider;
  from: (a: ParsedAsset) => boolean;
  to: (a: ParsedAsset) => boolean;
  expectedFeeBps: number;
  expectedSecs: number;
  note?: string;
  // Which checkout flow this edge is valid for. Omit = both.
  flows?: Flow[];
};

const EVM_CHAINS = ['BASE', 'ETHEREUM', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'BSC', 'AVALANCHE'];

const EDGES: Edge[] = [
  // Bachs Connect: Direct NGN to NGN (licensed split-payment collection). Listed
  // BEFORE the Paystack edge so that if both were ever enabled, Bachs wins the
  // BFS for NGN→NGN. In practice Paystack is disabled and Bachs is its successor.
  {
    provider: 'bachs',
    from: (a) => a.kind === 'fiat' && a.currency === 'NGN',
    to: (a) => a.kind === 'fiat' && a.currency === 'NGN',
    expectedFeeBps: 150, // placeholder until Bachs fees confirmed
    expectedSecs: 60,
    note: 'bachs (domestic NGN collection + split)',
    flows: ['external'],
  },
  // Paystack: Direct NGN to NGN. Disabled (account suspended); kept for the
  // route planner + the PAYSTACK_ENABLED kill switch.
  {
    provider: 'paystack',
    from: (a) => a.kind === 'fiat' && a.currency === 'NGN',
    to: (a) => a.kind === 'fiat' && a.currency === 'NGN',
    expectedFeeBps: 150, // 1.5% baseline
    expectedSecs: 30,
    note: 'paystack (domestic NGN transfer)',
    flows: ['external'],
  },
  // Paycrest offramp: any supported EVM USDC → fiat. Terminal edge; flow-agnostic.
  {
    provider: 'paycrest',
    from: (a) => a.kind === 'crypto' && a.token === 'USDC' && a.chain === 'BASE',
    to: (a) => a.kind === 'fiat',
    expectedFeeBps: 85,
    expectedSecs: 90,
    note: 'paycrest USDC(Base)→fiat',
  },
  // Paycrest onramp: fiat → ONLY USDC on Base.
  {
    provider: 'paycrest',
    from: (a) => a.kind === 'fiat',
    to: (a) => a.kind === 'crypto' && a.token === 'USDC' && a.chain === 'BASE',
    expectedFeeBps: 85,
    expectedSecs: 180,
    note: 'paycrest fiat→USDC(Base)',
  },
  // LI.FI (Circle CCTP): USDC on Stellar → USDC on Base. The user's wallet signs
  // two Soroban txs (approve + bridge) and USDC mints on Base straight into the
  // next hop — non-custodial. Listed BEFORE NEAR so Stellar-sourced payments
  // take this edge while NEAR's Stellar route is paused; NEAR still serves the
  // reverse (Base → Stellar) direction, which CCTP-via-LI.FI does not.
  {
    provider: 'lifi',
    from: (a) => a.kind === 'crypto' && a.chain === 'STELLAR' && a.token === 'USDC',
    to: (a) => a.kind === 'crypto' && a.chain === 'BASE' && a.token === 'USDC',
    expectedFeeBps: 25,
    expectedSecs: 180,
    note: 'lifi/cctp USDC(Stellar)→USDC(Base)',
    flows: ['external'],
  },
  // NEAR Intents: anything NEAR supports → USDC on Base (Paycrest's settlement
  // chain) OR USDC on Stellar (the Pollar / SEP-24 anchor settlement asset).
  // External-wallet flow. This is the primary cross-chain edge today. Coverage
  // spans ~30 chains so we gate on nearIntents.chainIsKnown rather than an EVM
  // allowlist. Same-chain USDC→USDC is rejected below (no swap needed).
  {
    provider: 'nearintents',
    from: (a) => a.kind === 'crypto' && nearIntents.chainIsKnown(a.chain),
    to: (a) => a.kind === 'crypto' && a.token === 'USDC' && (a.chain === 'BASE' || a.chain === 'STELLAR'),
    expectedFeeBps: 25,
    expectedSecs: 90,
    note: 'nearintents → USDC (Base | Stellar)',
    flows: ['external'],
  },
  // ChainRails: any EVM USDC → USDC on Base. Self-wallet flow (user signs).
  // Kept in the graph so the route planner is ready for when ChainRails is
  // fully wired; it never fires today because no caller passes flow: 'self'.
  {
    provider: 'chainrails',
    from: (a) => a.kind === 'crypto' && ['USDC', 'ETH', 'USDT', 'DAI', 'BNB'].includes(a.token) && EVM_CHAINS.includes(a.chain),
    to: (a) => a.kind === 'crypto' && a.token === 'USDC' && a.chain === 'BASE',
    expectedFeeBps: 15,
    expectedSecs: 60,
    note: 'chainrails bridge → Base USDC',
    flows: ['self'],
  },
];

// ── Planner ─────────────────────────────────────────────────────────────────

export function planRoute(req: RouteRequest): RoutePlan {
  const src = parseAsset(req.sourceAsset);
  const dst = parseAsset(req.destAsset);
  const flow: Flow = req.flow ?? 'external';

  // Naira kill switch. A pure NGN→NGN collection is the "pay with naira" path
  // (Bachs today, Paystack historically). If EVERY naira corridor is disabled we
  // must refuse it explicitly here — otherwise the BFS below would silently
  // reroute NGN→NGN through Paycrest (onramp→offramp via USDC on Base), moving
  // money on a corridor the caller never asked for. Crypto→fiat (Paycrest
  // offramp) settlement is unaffected.
  if (!NAIRA_ENABLED && src.kind === 'fiat' && dst.kind === 'fiat') {
    throw new Error(NAIRA_DISABLED_MESSAGE);
  }

  // Direct transfer is only possible for identical crypto assets.
  // Fiat assets ALWAYS require a bridge (Paycrest) in our architecture.
  if (req.sourceAsset === req.destAsset && src.kind === 'crypto') {
    return summarize([{
      provider: 'direct',
      fromAsset: req.sourceAsset,
      toAsset: req.destAsset,
      expectedFeeBps: 0,
      expectedSecs: 30,
      note: 'same crypto asset',
    }]);
  }

  // Pre-filter edges by flow, and drop disabled naira providers so the BFS
  // traversal never considers a rail that doesn't match the caller's checkout
  // mode or a provider that's been killed for an incident / not yet enabled.
  const edges = EDGES.filter(e =>
    (e.provider !== 'paystack' || PAYSTACK_ENABLED) &&
    (e.provider !== 'bachs'    || BACHS_ENABLED) &&
    (!e.flows || e.flows.includes(flow)),
  );

  // BFS with depth ≤ 3. Small edge set; swap for Dijkstra when
  // expectedFeeBps/expectedSecs start mattering across many providers.
  type Node = { asset: ParsedAsset; key: AssetKey; path: RoutePlanStep[] };
  const queue: Node[] = [{ asset: src, key: req.sourceAsset, path: [] }];
  const seen = new Set<string>([req.sourceAsset]);

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.path.length >= 3) continue;

    for (const edge of edges) {
      if (!edge.from(cur.asset)) continue;

      // Candidate downstream assets: the destination, or a known intermediate.
      // Today the only productive intermediate is USDC on Base (Paycrest's
      // settlement chain). Stellar USDC is reachable only as a *destination*
      // (Pollar wallets / SEP-24), never used as an intermediate, so it isn't
      // listed here. Add more as routes fan out.
      const candidates: AssetKey[] = [req.destAsset, 'crypto:BASE:USDC'];

      for (const nextKey of candidates) {
        if (seen.has(nextKey) && nextKey !== req.destAsset) continue;
        const nextAsset = parseAsset(nextKey);
        if (!edge.to(nextAsset)) continue;
        // Same-asset hops are normally rejected, but the domestic NGN→NGN
        // collectors (Bachs, Paystack) legitimately have identical from/to.
        if (cur.key === nextKey && edge.provider !== 'paystack' && edge.provider !== 'bachs') continue;

        const step: RoutePlanStep = {
          provider: edge.provider,
          fromAsset: cur.key,
          toAsset: nextKey,
          expectedFeeBps: edge.expectedFeeBps,
          expectedSecs: edge.expectedSecs,
          note: edge.note,
        };
        const nextPath = [...cur.path, step];

        if (nextKey === req.destAsset) return summarize(nextPath);
        seen.add(nextKey);
        queue.push({ asset: nextAsset, key: nextKey, path: nextPath });
      }
    }
  }

  console.log(`[router] NO ROUTE FOUND for ${req.sourceAsset} -> ${req.destAsset}`);
  throw new Error(`no route from ${req.sourceAsset} to ${req.destAsset}`);
}

function summarize(steps: RoutePlanStep[]): RoutePlan {
  const plan = {
    steps,
    totalExpectedFeeBps: steps.reduce((s, x) => s + (x.expectedFeeBps ?? 0), 0),
    totalExpectedSecs: steps.reduce((s, x) => s + (x.expectedSecs ?? 0), 0),
    summary: steps.map(s => `${s.provider}:${s.fromAsset}→${s.toAsset}`).join(' · '),
  };
  console.log(`[router] planned: ${plan.summary}`);
  return plan;
}
