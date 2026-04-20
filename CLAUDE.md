# Weave

Weave is a **universal crypto ↔ fiat checkout** for merchants. An end-user can pay from any supported chain/token, and the merchant receives funds in their chosen corridor — fiat (e.g. NGN) to a bank account, or crypto (e.g. USDC on Base) to a wallet. The product was previously called **RampKit**; the direction has since shifted, so treat the `rampkit_v3` PRD as historical context, not spec.

> Canonical asset identifier used everywhere: `fiat:<CCY>` or `crypto:<CHAIN>:<TOKEN>`.

## Monorepo layout

- **pnpm workspaces + turborepo.** Root scripts: `pnpm dev | build | lint` (turbo fans them out).
- Node ≥20, pnpm 10.32.1, TypeScript 5.

```
apps/
  api/        Express + Prisma + BullMQ orchestration layer (port 4000)
  dashboard/  Next.js 15 / React 19 merchant portal (port 3001)
  widget/     Vite-built React 18 embeddable checkout (published as @weave/widget)
packages/
  shared/     Thin shared types (currently stub)
```

## `apps/api` — orchestration layer

Express app at `src/index.ts`, mounted under `/api/v1`. The API is **pure infrastructure**: it does not own end-user identity. Auth is API-key only (`x-api-key` header → `Client` row), even though `prisma/schema.prisma` carries a dormant `User`/`Session`/`OtpChallenge` identity model for a future licensed mode.

### Routes (`src/routes/`)

- `POST /quotes` — `from`, `to`, `amount` (+ optional `amountIn=source|dest`). Combines a Paycrest rate (if any side is fiat) with a planned route and stacks per-hop bridge fees from ChainRails.
- `POST /orders` — direction-agnostic order creation. Accepts optional `flow: 'self' | 'external'` (default `'external'`). Resolves source + dest `Instrument`s, plans the route with the flow, persists the `Order`, then executes providers and returns `nextAction` for the widget (incl. `depositMemo` when NEAR Intents requires one).
- `GET /orders/:id` — includes a Paycrest poll fallback AND a NEAR Intents poll fallback (both safety nets for their respective workers). Status map differs for onramp vs offramp (see `PAYCREST_STATUS_ONRAMP/OFFRAMP` in `routes/orders.ts`). Response adds `paycrestStatus` and `nearStatus` fields.
- `GET /orders` — merchant list, capped at 50.
- `POST /webhooks/chainrails` · `POST /webhooks/paycrest` — signature-verified, enqueued to BullMQ (`weave-webhooks`).
- `GET /institutions?currency=NGN` — proxies Paycrest.
- `GET /ramp/countries` — currently NGN-only demo stub.

### Services (`src/services/`)

- **`router.service.ts`** — BFS planner (depth ≤ 3) over a small `EDGES` table. Edges now carry an optional `flows: Flow[]` allowlist (`'self' | 'external'`) so `planRoute({ flow })` filters candidates before traversing. Edges: Paycrest offramp (EVM USDC → fiat), Paycrest onramp (fiat → EVM USDC), **NEAR Intents (any supported chain → USDC on Base, `flows: ['external']`)**, ChainRails (any EVM USDC → USDC on Base, `flows: ['self']`), direct same-asset. Intermediate is `crypto:BASE:USDC` (Paycrest's settlement chain). Swap BFS for Dijkstra once edge count grows.
- **`executor.service.ts`** — creates provider resources for every step at order-creation time, **walking steps in reverse** so each step's `depositAddress` feeds the previous step's recipient. Dispatch branches: Paycrest offramp/onramp, ChainRails bridge, NEAR Intents swap, direct. Persists `RouteStep` rows (incl. `depositMemo`) in a single transaction after all provider calls succeed. Exposes `markStepDone` / `markStepFailed` for the webhook worker + NEAR poller, which roll up `Order.status` when all steps complete.
- **`paycrest.service.ts`** — thin client for `api.paycrest.io/v2` (`/rates`, `/institutions`, `/sender/orders`). HMAC-SHA256 webhook verification (`sha256=` prefix accepted). Missing webhook secret = dev mode (accept unsigned).
- **`chainrails.service.ts`** — thin client for `api.chainrails.io/api/v1` (`/quotes/best`, `/intents`). Carries its own chain/token registry + `toSmallestUnit` scaler. Webhook verification is `HMAC-SHA256(secret, "${timestamp}.${rawBody}")` with a 5-minute timestamp window. **Currently not firing** — reserved for the connect-wallet flow (`flow: 'self'`) when that path is fully wired.
- **`nearintents.service.ts`** — thin client for `1click.chaindefuser.com/v0` (`/tokens`, `/quote`, `/status`, `/deposit/submit`). JWT-bearer auth. Fetches `/tokens` once, caches 10 min, maps our `crypto:CHAIN:TOKEN` → their `assetId` by `(blockchain, symbol)`. Exports `classifyNearStatus` → `'done' | 'failed' | 'progress'`.

### Data model (`prisma/schema.prisma`, Postgres)

- **`Client`** — merchant, holds `apiKey` + `defaultPayoutInstrumentId`.
- **`Instrument`** — unified "thing money moves into/out of". `ownerType ∈ {user, merchant}`, `kind ∈ {bank_account, crypto_wallet}`, `assetKey` uses the canonical format. One row can be a user funding source, user payout target, or merchant payout destination.
- **`Order`** — `sourceInstrumentId` + `destInstrumentId`, denormalized `sourceAssetKey` / `destAssetKey`, `routePlan` JSON snapshot, fee rollups.
- **`RouteStep`** — per-hop state with `provider`, `externalId`, `depositAddress`, `depositMemo` (required for XRP/TON/XLM/NEAR via NEAR Intents), `status ∈ {pending, awaiting_deposit, in_flight, done, failed}`. `@@unique([orderId, sequence])`.
- **`WebhookLog`** — idempotency via `@@unique([source, event, externalId])`.

### Queue workers (`src/queues/`)

Two long-running workers, both Redis-backed. Booted by side-effect imports in `src/index.ts`.

- **`webhooks.ts`** — BullMQ `weave-webhooks` queue. Event → outcome map (`PAYCREST_OUTCOME`, `CHAINRAILS_OUTCOME`) classifies events as `done | failed | progress`. Worker resolves the owning `RouteStep` by `(provider, externalId)` then calls `markStepDone` / `markStepFailed`. Idempotency is enforced by a `WebhookLog.processed` check before work runs and an upsert after.
- **`nearintents_poller.ts`** — NEAR Intents has no webhooks, so we poll. BullMQ repeatable tick (jobId `weave-nearintents-tick`, default `NEAR_POLL_INTERVAL_MS=15000`) scans open `RouteStep`s with `provider='nearintents'` (oldest first, capped at 10/tick), calls `GET /v0/status` with a `PER_STEP_DELAY_MS=2000` stagger to respect the 1-req/5-s rate limit, and routes terminal outcomes through the same `markStepDone` / `markStepFailed` helpers. Uses `depositAddress` as the `externalId` for step lookups.

### Startup bootstrap (`src/lib/merchant.ts`)

On every boot, `ensureMerchantDefaultInstruments()` backfills a merchant payout `Instrument` from `MERCHANT_PAYOUT_*` env vars for any `Client` without one — migration path from the old env-driven merchant config to the Instrument model. Fiat config wins over crypto if both are set.

### Key env vars (`apps/api/.env.example`)

`DATABASE_URL`, `REDIS_HOST/PORT`, `CHAINRAILS_API_*`, `NEAR_INTENTS_API_URL`, `NEAR_INTENTS_JWT`, `NEAR_POLL_INTERVAL_MS`, `PAYCREST_API_*`, `MERCHANT_PAYOUT_*`, `SENDER_FEE_BPS` (default 75 = 0.75%), `APP_FEE_BPS` (default 10 = 0.10%), `ALLOWED_ORIGINS` (CORS allowlist, comma-separated).

### Scripts

- `pnpm --filter @weave/api dev` — `ts-node-dev --respawn src/index.ts`
- `pnpm --filter @weave/api db:push` — `prisma db push`
- `scripts/backfill_old_orders.ts` — one-off migration utility.

## `apps/widget` — embeddable React checkout

Vite-built library. Publishes `WeaveCheckout` + `MerchantBackdrop` from `src/index.tsx`. Uses `@tanstack/react-query`, `viem`/`wagmi`, `qrcode.react`, Radix primitives, Tailwind v4. Design tokens live inline as the `WEAVE` object in `components/WeaveWidget.tsx` — dark ink + `#0F5D4C` accent.

Transport in `src/api/client.ts` — no cookies, API-key auth. Base URL resolution order: `window.__WEAVE_API_BASE__` → `VITE_API_BASE` → `http://localhost:4000/api/v1`. Exposes `fetchQuote`, `createOrder`, `fetchOrder`, `fetchCountries`, plus `fiatKey`/`cryptoKey` helpers that mirror the API's canonical format.

`src/dev.tsx` is the local playground rendered by `pnpm --filter @weave/widget dev` — overlays `WeaveCheckout` on a mocked `MerchantBackdrop` merchant page.

## `apps/dashboard` — merchant portal (Next.js 15)

App Router, React 19, Tailwind v4. Server components only — `app/page.tsx`, `app/transactions/page.tsx`, `app/settings/page.tsx` each fetch the API server-side using `WEAVE_API_KEY` + `API_BASE` env vars with `next: { revalidate: 10 | 30 }`. Shared types/helpers (`parseAsset`, `assetLabel`, `directionOf` → `offramp | onramp | bridge | transfer`) live in `app/types.ts`. Sidebar navigation only — no client-side routing logic.

## Conventions

- **Checkout flow gates provider choice.** `flow: 'external'` (default) → NEAR Intents handles the cross-chain leg (send-from-another-wallet). `flow: 'self'` → reserved for ChainRails (connect-wallet). Edges in `router.service.ts` carry a `flows` allowlist; passing a flow filters the graph.
- **Asset keys are load-bearing.** Use `parseAsset` / `fiatKey` / `cryptoKey` rather than string-splitting inline. Chain and token are always uppercase; currency is ISO 4217 uppercase.
- **Fees:** `SENDER_FEE_BPS` + `APP_FEE_BPS` are applied to the USD-equivalent; `bridgeFeeUsd` is the ChainRails component. All three snapshot onto `Order` at creation.
- **Webhook order-of-operations:** verify signature → enqueue → worker checks `WebhookLog.processed` for idempotency → mutates `RouteStep` → rolls up `Order.status` → upserts log row.
- **Error shape:** every endpoint returns `{ success: boolean, data? , error? }`. Upstream provider failures map to HTTP `502`.
- **Never commit `.env`** — `.env.example` is the source of truth for required keys.

## What's not here yet

- The PRD describes `/quotes/offramp`, `/quotes/onramp`, `/orders/offramp`, `/orders/onramp`, normalized webhook fan-out to merchant endpoints, sandbox mode, analytics, batch orders, and chain-auto-detection in the widget. The current API collapses both directions into a single `POST /orders` and a single `GET /quotes`; the widget demo screens are hard-coded against NGN + a mock balance list. Don't assume PRD endpoints exist — grep first.
- `packages/shared` is a stub. Anything genuinely shared between apps is currently duplicated (e.g. `parseAsset` lives in `apps/api/src/lib/assets.ts` and `apps/dashboard/app/types.ts`).
