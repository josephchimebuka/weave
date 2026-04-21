"use strict";
// Resolves (sourceAsset, destAsset, amount) into an ordered list of provider
// hops. v1 knows Paycrest (fiat↔USDC on supported EVM chains) + ChainRails
// (EVM USDC bridge to Base) + direct same-asset transfer. New rails (Stellar
// anchors, direct bank partnerships) drop in as additional edges.
Object.defineProperty(exports, "__esModule", { value: true });
exports.planRoute = planRoute;
const assets_1 = require("../lib/assets");
const nearintents_service_1 = require("./nearintents.service");
const EVM_CHAINS = ['BASE', 'ETHEREUM', 'POLYGON', 'ARBITRUM', 'OPTIMISM'];
const EDGES = [
    // Paycrest offramp: any supported EVM USDC → fiat. Terminal edge; flow-agnostic.
    {
        provider: 'paycrest',
        from: (a) => a.kind === 'crypto' && a.token === 'USDC' && EVM_CHAINS.includes(a.chain),
        to: (a) => a.kind === 'fiat',
        expectedFeeBps: 85,
        expectedSecs: 90,
        note: 'paycrest USDC→fiat',
    },
    // Paycrest onramp: fiat → USDC on any supported EVM chain.
    {
        provider: 'paycrest',
        from: (a) => a.kind === 'fiat',
        to: (a) => a.kind === 'crypto' && a.token === 'USDC' && EVM_CHAINS.includes(a.chain),
        expectedFeeBps: 85,
        expectedSecs: 180,
        note: 'paycrest fiat→USDC',
    },
    // NEAR Intents: anything NEAR supports → USDC on Base. External-wallet flow.
    // This is the primary cross-chain edge today. Coverage spans ~30 chains so
    // we gate on nearIntents.chainIsKnown rather than an EVM allowlist.
    {
        provider: 'nearintents',
        from: (a) => a.kind === 'crypto' && nearintents_service_1.nearIntents.chainIsKnown(a.chain),
        to: (a) => a.kind === 'crypto' && a.chain === 'BASE' && a.token === 'USDC',
        expectedFeeBps: 25,
        expectedSecs: 90,
        note: 'nearintents → USDC on Base',
        flows: ['external'],
    },
    // ChainRails: any EVM USDC → USDC on Base. Self-wallet flow (user signs).
    // Kept in the graph so the route planner is ready for when ChainRails is
    // fully wired; it never fires today because no caller passes flow: 'self'.
    {
        provider: 'chainrails',
        from: (a) => a.kind === 'crypto' && a.token === 'USDC' && EVM_CHAINS.includes(a.chain),
        to: (a) => a.kind === 'crypto' && a.token === 'USDC' && a.chain === 'BASE',
        expectedFeeBps: 15,
        expectedSecs: 60,
        note: 'chainrails USDC bridge → Base',
        flows: ['self'],
    },
    // Direct: same asset, no hop.
    {
        provider: 'direct',
        from: (a) => a.kind === 'crypto',
        to: (a) => a.kind === 'crypto',
        expectedFeeBps: 0,
        expectedSecs: 30,
        note: 'direct crypto transfer',
    },
];
// ── Planner ─────────────────────────────────────────────────────────────────
function planRoute(req) {
    const src = (0, assets_1.parseAsset)(req.sourceAsset);
    const dst = (0, assets_1.parseAsset)(req.destAsset);
    const flow = req.flow ?? 'external';
    if (req.sourceAsset === req.destAsset) {
        return summarize([{
                provider: 'direct',
                fromAsset: req.sourceAsset,
                toAsset: req.destAsset,
                expectedFeeBps: 0,
                expectedSecs: 30,
                note: 'same asset',
            }]);
    }
    // Pre-filter edges by flow so the BFS traversal never considers a bridge
    // that doesn't match the caller's checkout mode.
    const edges = EDGES.filter(e => !e.flows || e.flows.includes(flow));
    const queue = [{ asset: src, key: req.sourceAsset, path: [] }];
    const seen = new Set([req.sourceAsset]);
    while (queue.length) {
        const cur = queue.shift();
        if (cur.path.length >= 3)
            continue;
        for (const edge of edges) {
            if (!edge.from(cur.asset))
                continue;
            // Candidate downstream assets: the destination, or a known intermediate.
            // Today the only productive intermediate is USDC on Base (Paycrest's
            // settlement chain). Add more as routes fan out.
            const candidates = [req.destAsset, 'crypto:BASE:USDC'];
            for (const nextKey of candidates) {
                if (seen.has(nextKey) && nextKey !== req.destAsset)
                    continue;
                const nextAsset = (0, assets_1.parseAsset)(nextKey);
                if (!edge.to(nextAsset))
                    continue;
                if (cur.key === nextKey)
                    continue;
                const step = {
                    provider: edge.provider,
                    fromAsset: cur.key,
                    toAsset: nextKey,
                    expectedFeeBps: edge.expectedFeeBps,
                    expectedSecs: edge.expectedSecs,
                    note: edge.note,
                };
                const nextPath = [...cur.path, step];
                if (nextKey === req.destAsset)
                    return summarize(nextPath);
                seen.add(nextKey);
                queue.push({ asset: nextAsset, key: nextKey, path: nextPath });
            }
        }
    }
    throw new Error(`no route from ${req.sourceAsset} to ${req.destAsset}`);
}
function summarize(steps) {
    return {
        steps,
        totalExpectedFeeBps: steps.reduce((s, x) => s + (x.expectedFeeBps ?? 0), 0),
        totalExpectedSecs: steps.reduce((s, x) => s + (x.expectedSecs ?? 0), 0),
        summary: steps.map(s => `${s.provider}:${s.fromAsset}→${s.toAsset}`).join(' · '),
    };
}
