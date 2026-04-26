// Resolves (sourceAsset, destAsset, amount) into an ordered list of provider
// hops. v1 knows Paycrest (fiat↔USDC on supported EVM chains) + ChainRails
// (EVM USDC bridge to Base) + direct same-asset transfer. New rails (Stellar
// anchors, direct bank partnerships) drop in as additional edges.

import { parseAsset, type AssetKey, type ParsedAsset } from '../lib/assets';
import { nearIntents } from './nearintents.service';

export type Provider = 'paycrest' | 'chainrails' | 'nearintents' | 'stellar_anchor' | 'direct' | 'paystack';

// Which checkout flow the caller is in. 'self' means the user signs with a
// connected wallet (ChainRails can do this once it's fully wired). 'external'
// means the widget shows a deposit address for a third party to pay — this
// is what NEAR Intents is built for. Default is 'external' because CR is
// not yet integrated.
export type Flow = 'self' | 'external';

export interface RoutePlanStep {
  provider:        Provider;
  fromAsset:       AssetKey;
  toAsset:         AssetKey;
  expectedFeeBps?: number;
  expectedSecs?:   number;
  note?:           string;
}

export interface RouteRequest {
  sourceAsset: AssetKey;
  destAsset:   AssetKey;
  amount:      number; // denominated in sourceAsset
  urgency?:    'cheapest' | 'fastest';
  flow?:       Flow;   // selects which cross-chain provider handles the crypto leg
}

export interface RoutePlan {
  steps:               RoutePlanStep[];
  totalExpectedFeeBps: number;
  totalExpectedSecs:   number;
  summary:             string;
}

// ── Edges ───────────────────────────────────────────────────────────────────

type Edge = {
  provider:       Provider;
  from:           (a: ParsedAsset) => boolean;
  to:             (a: ParsedAsset) => boolean;
  expectedFeeBps: number;
  expectedSecs:   number;
  note?:          string;
  // Which checkout flow this edge is valid for. Omit = both.
  flows?:         Flow[];
};

const EVM_CHAINS = ['BASE', 'ETHEREUM', 'POLYGON', 'ARBITRUM', 'OPTIMISM'];

const EDGES: Edge[] = [
  // Paystack: Direct NGN to NGN.
  {
    provider:       'paystack',
    from:           (a) => a.kind === 'fiat' && a.currency === 'NGN',
    to:             (a) => a.kind === 'fiat' && a.currency === 'NGN',
    expectedFeeBps: 150, // 1.5% baseline
    expectedSecs:   30,
    note:           'paystack (domestic NGN transfer)',
    flows:          ['external'],
  },
  // Paycrest offramp: any supported EVM USDC → fiat. Terminal edge; flow-agnostic.
  {
    provider:       'paycrest',
    from:           (a) => a.kind === 'crypto' && a.token === 'USDC' && EVM_CHAINS.includes(a.chain),
    to:             (a) => a.kind === 'fiat',
    expectedFeeBps: 85,
    expectedSecs:   90,
    note:           'paycrest USDC→fiat',
  },
  // Paycrest onramp: fiat → USDC on any supported EVM chain.
  {
    provider:       'paycrest',
    from:           (a) => a.kind === 'fiat',
    to:             (a) => a.kind === 'crypto' && a.token === 'USDC' && EVM_CHAINS.includes(a.chain),
    expectedFeeBps: 85,
    expectedSecs:   180,
    note:           'paycrest fiat→USDC',
  },
  // NEAR Intents: anything NEAR supports → USDC on Base. External-wallet flow.
  // This is the primary cross-chain edge today. Coverage spans ~30 chains so
  // we gate on nearIntents.chainIsKnown rather than an EVM allowlist.
  {
    provider:       'nearintents',
    from:           (a) => a.kind === 'crypto' && nearIntents.chainIsKnown(a.chain),
    to:             (a) => a.kind === 'crypto' && a.chain === 'BASE' && a.token === 'USDC',
    expectedFeeBps: 25,
    expectedSecs:   90,
    note:           'nearintents → USDC on Base',
    flows:          ['external'],
  },
  // ChainRails: any EVM USDC → USDC on Base. Self-wallet flow (user signs).
  // Kept in the graph so the route planner is ready for when ChainRails is
  // fully wired; it never fires today because no caller passes flow: 'self'.
  {
    provider:       'chainrails',
    from:           (a) => a.kind === 'crypto' && a.token === 'USDC' && EVM_CHAINS.includes(a.chain),
    to:             (a) => a.kind === 'crypto' && a.token === 'USDC' && a.chain === 'BASE',
    expectedFeeBps: 15,
    expectedSecs:   60,
    note:           'chainrails USDC bridge → Base',
    flows:          ['self'],
  },
  // Direct: same asset, no hop.
  {
    provider:       'direct',
    from:           (a) => a.kind === 'crypto',
    to:             (a) => a.kind === 'crypto',
    expectedFeeBps: 0,
    expectedSecs:   30,
    note:           'direct crypto transfer',
  },
];

// ── Planner ─────────────────────────────────────────────────────────────────

export function planRoute(req: RouteRequest): RoutePlan {
  const src = parseAsset(req.sourceAsset);
  const dst = parseAsset(req.destAsset);
  const flow: Flow = req.flow ?? 'external';

  // Direct transfer is only possible for identical crypto assets.
  // Fiat assets ALWAYS require a bridge (Paycrest) in our architecture.
  if (req.sourceAsset === req.destAsset && src.kind === 'crypto') {
    return summarize([{
      provider:       'direct',
      fromAsset:      req.sourceAsset,
      toAsset:        req.destAsset,
      expectedFeeBps: 0,
      expectedSecs:   30,
      note:           'same crypto asset',
    }]);
  }

  // Pre-filter edges by flow so the BFS traversal never considers a bridge
  // that doesn't match the caller's checkout mode.
  const edges = EDGES.filter(e => !e.flows || e.flows.includes(flow));

  // BFS with depth ≤ 3. Small edge set; swap for Dijkstra when
  // expectedFeeBps/expectedSecs start mattering across many providers.
  type Node = { asset: ParsedAsset; key: AssetKey; path: RoutePlanStep[] };
  const queue: Node[] = [{ asset: src, key: req.sourceAsset, path: [] }];
  const seen  = new Set<string>([req.sourceAsset]);

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.path.length >= 3) continue;

    for (const edge of edges) {
      if (!edge.from(cur.asset)) continue;

      // Candidate downstream assets: the destination, or a known intermediate.
      // Today the only productive intermediate is USDC on Base (Paycrest's
      // settlement chain). Add more as routes fan out.
      const candidates: AssetKey[] = [req.destAsset, 'crypto:BASE:USDC'];

      for (const nextKey of candidates) {
        if (seen.has(nextKey) && nextKey !== req.destAsset) continue;
        const nextAsset = parseAsset(nextKey);
        if (!edge.to(nextAsset)) continue;
        if (cur.key === nextKey && edge.provider !== 'paystack') continue;

        const step: RoutePlanStep = {
          provider:       edge.provider,
          fromAsset:      cur.key,
          toAsset:        nextKey,
          expectedFeeBps: edge.expectedFeeBps,
          expectedSecs:   edge.expectedSecs,
          note:           edge.note,
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
    totalExpectedSecs:   steps.reduce((s, x) => s + (x.expectedSecs   ?? 0), 0),
    summary:             steps.map(s => `${s.provider}:${s.fromAsset}→${s.toAsset}`).join(' · '),
  };
  console.log(`[router] planned: ${plan.summary}`);
  return plan;
}
