// Resolves (sourceAsset, destAsset, amount) into an ordered list of provider
// hops. v1 knows Paycrest (fiat↔USDC on supported EVM chains) + ChainRails
// (EVM USDC bridge to Base) + direct same-asset transfer. New rails (Stellar
// anchors, direct bank partnerships) drop in as additional edges.

import { parseAsset, type AssetKey, type ParsedAsset } from '../lib/assets';

export type Provider = 'paycrest' | 'chainrails' | 'stellar_anchor' | 'direct';

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
};

const EVM_CHAINS = ['BASE', 'ETHEREUM', 'POLYGON', 'ARBITRUM', 'OPTIMISM'];

const EDGES: Edge[] = [
  // Paycrest offramp: any supported EVM USDC → fiat.
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
  // ChainRails: any EVM USDC → USDC on Base (Paycrest's settlement chain).
  {
    provider:       'chainrails',
    from:           (a) => a.kind === 'crypto' && a.token === 'USDC' && EVM_CHAINS.includes(a.chain),
    to:             (a) => a.kind === 'crypto' && a.token === 'USDC' && a.chain === 'BASE',
    expectedFeeBps: 15,
    expectedSecs:   60,
    note:           'chainrails USDC bridge → Base',
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

  if (req.sourceAsset === req.destAsset) {
    return summarize([{
      provider:       'direct',
      fromAsset:      req.sourceAsset,
      toAsset:        req.destAsset,
      expectedFeeBps: 0,
      expectedSecs:   30,
      note:           'same asset',
    }]);
  }

  // BFS with depth ≤ 3. Small edge set; swap for Dijkstra when
  // expectedFeeBps/expectedSecs start mattering across many providers.
  type Node = { asset: ParsedAsset; key: AssetKey; path: RoutePlanStep[] };
  const queue: Node[] = [{ asset: src, key: req.sourceAsset, path: [] }];
  const seen  = new Set<string>([req.sourceAsset]);

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.path.length >= 3) continue;

    for (const edge of EDGES) {
      if (!edge.from(cur.asset)) continue;

      // Candidate downstream assets: the destination, or a known intermediate.
      // Today the only productive intermediate is USDC on Base (Paycrest's
      // settlement chain). Add more as routes fan out.
      const candidates: AssetKey[] = [req.destAsset, 'crypto:BASE:USDC'];

      for (const nextKey of candidates) {
        if (seen.has(nextKey) && nextKey !== req.destAsset) continue;
        const nextAsset = parseAsset(nextKey);
        if (!edge.to(nextAsset)) continue;
        if (cur.key === nextKey) continue;

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

  throw new Error(`no route from ${req.sourceAsset} to ${req.destAsset}`);
}

function summarize(steps: RoutePlanStep[]): RoutePlan {
  return {
    steps,
    totalExpectedFeeBps: steps.reduce((s, x) => s + (x.expectedFeeBps ?? 0), 0),
    totalExpectedSecs:   steps.reduce((s, x) => s + (x.expectedSecs   ?? 0), 0),
    summary:             steps.map(s => `${s.provider}:${s.fromAsset}→${s.toAsset}`).join(' · '),
  };
}
