# NEAR Intents in Weave

Weave uses **[NEAR Intents](https://docs.near-intents.org/)** (1Click API) as the **cross-chain execution layer** for checkout when customers pay via the **external deposit** flow (`flow: "external"`). This is separate from the **Stellar USDC wallet** rail (`flow: "stellar"`). See [`stellar-integration.md`](./stellar-integration.md).

## What NEAR Intents does here

1. Merchant or payer creates a Weave order (widget or API).
2. Weave’s router plans a route; a **`nearintents`** `RouteStep` quotes a swap into the next hop (typically `crypto:BASE:USDC` before fiat off-ramp).
3. NEAR Intents returns a **deposit address** (and **memo** on NEAR, Stellar, XRP, TON, etc.).
4. The payer sends crypto from their wallet.
5. The API **polls** NEAR Intents status and advances the step → order → **merchant webhook**.

Implementation: `apps/api/src/services/nearintents.service.ts`, orchestration in `executor.service.ts`.

## When this rail is used

| Flow | Provider | Typical use |
|------|----------|-------------|
| `external` | `nearintents` (+ Paycrest, etc.) | Pay from **30+ chains** via deposit address |
| `stellar` | `stellar` | **Stellar wallet** USDC → Weave treasury |
| `self` | `chainrails` | Connected EVM wallet signing |

Asset keys use `crypto:CHAIN:TOKEN` (e.g. `crypto:ETHEREUM:USDC`). Chain names map to NEAR Intents `blockchain` enums in `chainToNear()`.

## Environment (API)

| Variable | Purpose |
|----------|---------|
| `NEAR_INTENTS_API_URL` | API base (see `.env.example`) |
| `NEAR_INTENTS_API_KEY` | Optional partner JWT ([partners.near-intents.org](https://partners.near-intents.org)) |
| `NEAR_POLL_INTERVAL_MS` | Poll interval for step sync |
| `API_BASE` | Required for background NEAR step polling (QStash) |

Never commit secrets. Use `apps/api/.env` locally and deployment env in production.

## Judge / developer smoke test (sandbox)

Use a **test publishable key** (`pk_test_…`) from the Weave dashboard. Sandbox orders auto-complete without moving real funds.

```bash
export API=https://api.paywithweave.com/api/v1
export KEY=pk_test_YOUR_KEY

# 1) Quote cross-chain → NGN
curl -s "$API/quotes?from=crypto:BASE:USDC&to=fiat:NGN&amount=50" -H "x-api-key: $KEY" | jq .

# 2) Create order (external / NEAR Intents path)
curl -s -X POST "$API/orders" -H "x-api-key: $KEY" -H "Content-Type: application/json" -d '{
  "source": { "inline": { "kind": "crypto_wallet", "assetKey": "crypto:BASE:USDC" } },
  "amount": 50,
  "flow": "external",
  "refundAddress": "0x0000000000000000000000000000000000000001"
}' | jq .

# 3) Poll order — expect sandbox to reach completed quickly
curl -s "$API/orders/ORDER_ID" -H "x-api-key: $KEY" | jq '.data.status, .data.steps'
```

**Expected:** Quote returns a route with a NEAR Intents step; sandbox order reaches `completed` without on-chain deposit.

Live demo: [paywithweave.com/demo](https://paywithweave.com/demo) · API docs: [docs.paywithweave.com](https://docs.paywithweave.com).

## NEAR HACKATHON (Nov 2026)

- **Baseline (pre–Nov 2026):** NEAR Intents client, router, executor, and production API paths were already integrated.
- **Hackathon window:** Documentation, judge reproduction steps, and README updates on branch `feat/near-hackathon-2026-docs` (and follow-up PRs) for [NEAR HACKATHON](https://nearhackathon.com).

Stellar mainnet checkout and treasury flows remain the primary **Stellar Development Foundation** integration track; NEAR Intents is the cross-chain abstraction rail on the same product.
