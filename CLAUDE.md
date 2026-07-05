# Weave

Weave is a **universal crypto ↔ fiat checkout** for merchants. An end-user can pay from any supported chain/token, and the merchant receives funds in their chosen corridor — fiat (e.g. NGN) to a bank account, or crypto (e.g. USDC on Base) to a wallet. The product was previously called **RampKit**; the direction has since shifted, so treat the `rampkit_v3` PRD as historical context, not spec.

> Canonical asset identifier used everywhere: `fiat:<CCY>` or `crypto:<CHAIN>:<TOKEN>`.

## Monorepo layout

- **pnpm workspaces + turborepo.** Root scripts: `pnpm dev | build | lint` (turbo fans them out).
- Node ≥20, pnpm 10.32.1, TypeScript 5.

```
apps/
  api/        Express + Prisma + QStash orchestration layer (port 4000)
  dashboard/  Next.js 15 / React 19 merchant portal (port 3001)
  widget/     Vite-built React 18 embeddable checkout (published as @weave-sdk/widget)
packages/
  shared/     Thin shared types (currently stub)
```

## `apps/api` — orchestration layer

Express app at `src/index.ts`, mounted under `/api/v1`. Supports two authentication methods:

1. **API-key auth** (`x-api-key` header) — for external systems / the widget. Each `Client` (merchant) has an `apiKey`.
2. **Session token auth** (`x-session-token` header) — for the merchant dashboard. Created by `/auth/signup` or `/auth/login` and stored in the `weave_session` cookie.

The API does **not** own end-user payment identity. The `Instrument` model allows merchants to configure their own payout destinations (bank accounts or crypto wallets) and supports both merchant-owned and user-owned instruments for a future licensed mode with user accounts.

### Routes (`src/routes/`)

- `POST /quotes` — `from`, `to`, `amount` (+ optional `amountIn=source|dest`). Combines a Paycrest rate (if any side is fiat) with a planned route and stacks per-hop bridge fees from ChainRails.
- `POST /orders` — direction-agnostic order creation. Accepts optional `flow: 'self' | 'external'` (default `'external'`). Resolves source + dest `Instrument`s, plans the route with the flow, persists the `Order`, then executes providers and returns `nextAction` for the widget (incl. `depositMemo` when NEAR Intents requires one).
- `GET /orders/:id` — includes a Paycrest poll fallback AND a NEAR Intents poll fallback (both safety nets for their respective workers). Status map differs for onramp vs offramp (see `PAYCREST_STATUS_ONRAMP/OFFRAMP` in `routes/orders.ts`). Response adds `paycrestStatus` and `nearStatus` fields.
- `GET /orders` — merchant list, capped at 50.
- `POST /webhooks/chainrails` · `POST /webhooks/paycrest` — signature-verified, then body JSON-parsed and enqueued to QStash (calling `/api/v1/jobs/process-webhook`). Signature verification is REQUIRED; no bypasses are allowed.
- **Outgoing Merchant Webhooks** — Managed by `webhook.service.ts` and triggered by `executor.service.ts`. Enqueued via QStash (calling `/api/v1/jobs/dispatch-outgoing`). HMAC-SHA256 signed.
- `POST /jobs/*` — Internal-only QStash target endpoints. Handles webhook processing, nearintents polling, and outgoing notification retries.
- `GET /institutions?currency=NGN` — proxies Paycrest.
- `GET /ramp/countries` — currently NGN-only demo stub.
- **Auth endpoints:**
  - `POST /auth/signup` · `POST /auth/login` — create/authenticate a `User` + issue a `Session` (scrypt password hash, 24 h TTL by default). Return `{ user, session: { token, expiresAt } }`.
  - `GET /auth/session` — validate `x-session-token` header, return current user.
  - `POST /auth/forgot-password` — create an `OtpChallenge` (purpose `password_reset`); returns `resetToken` + `otpCode` in non-production.
  - `POST /auth/reset-password` — consume challenge + OTP, hash new password, delete all sessions, issue fresh session.
  - `POST /auth/logout` — delete session by token.
- **Admin & Support:**
  - `GET /admin/verify?id=&action=approve|reject&token=` — Secure "Magic Link" handler for KYB approval/rejection. Uses JWT verification. Rejections require a reason.
  - `POST /support/contact` — Receives dashboard support inquiries and dispatches them via `email.service.ts`.

### Services (`src/services/`)

- **`router.service.ts`** — BFS planner (depth ≤ 3) over a small `EDGES` table. Edges now carry an optional `flows: Flow[]` allowlist (`'self' | 'external'`) so `planRoute({ flow })` filters candidates before traversing. Edges: Paycrest offramp (EVM USDC → fiat), Paycrest onramp (fiat → EVM USDC), **NEAR Intents (any supported chain → USDC on Base, `flows: ['external']`)**, ChainRails (any EVM USDC → USDC on Base, `flows: ['self']`), direct same-asset. Intermediate is `crypto:BASE:USDC` (Paycrest's settlement chain). Swap BFS for Dijkstra once edge count grows.
- **`executor.service.ts`** — creates provider resources for every step at order-creation time, **walking steps in reverse** so each step's `depositAddress` feeds the previous step's recipient. Dispatch branches: Paycrest offramp/onramp, ChainRails bridge, NEAR Intents swap, direct. Persists `RouteStep` rows (incl. `depositMemo`) in a single transaction after all provider calls succeed. Exposes `markStepDone` / `markStepFailed` for the QStash worker + NEAR poller, which roll up `Order.status` when all steps complete.
- **`paycrest.service.ts`** — thin client for `api.paycrest.io/v2` (`/rates`, `/institutions`, `/sender/orders`). HMAC-SHA256 webhook verification. Fails-closed if `PAYCREST_WEBHOOK_SECRET` is missing.
- **`chainrails.service.ts`** — thin client for `api.chainrails.io/api/v1` (`/quotes/best`, `/intents`). Webhook verification is `HMAC-SHA256(secret, "${timestamp}.${rawBody}")`. Fails-closed if `CHAINRAILS_WEBHOOK_SECRET` is missing.
- **`webhook.service.ts`** — Dispatcher for merchant-bound notifications. Handles HMAC-SHA256 signing using the merchant's `webhookSecret`.
- **`nearintents.service.ts`** — thin client for `1click.chaindefuser.com/v0` (`/tokens`, `/quote`, `/status`, `/deposit/submit`). JWT-bearer auth. Fetches `/tokens` once, caches 10 min, maps our `crypto:CHAIN:TOKEN` → their `assetId` by `(blockchain, symbol)`. Exports `classifyNearStatus` → `'done' | 'failed' | 'progress'`.

### Data model (`prisma/schema.prisma`, Postgres)

- **`Client`** — merchant, holds `apiKey` + `defaultPayoutInstrumentId`.
- **`Instrument`** — unified "thing money moves into/out of". `ownerType ∈ {user, merchant}`, `kind ∈ {bank_account, crypto_wallet}`, `assetKey` uses the canonical format. One row can be a user funding source, user payout target, or merchant payout destination.
- **`Order`** — `sourceInstrumentId` + `destInstrumentId`, denormalized `sourceAssetKey` / `destAssetKey`, `routePlan` JSON snapshot, fee rollups.
- **`RouteStep`** — per-hop state with `provider`, `externalId`, `depositAddress`, `depositMemo` (required for XRP/TON/XLM/NEAR via NEAR Intents), `status ∈ {pending, awaiting_deposit, in_flight, done, failed}`. `@@unique([orderId, sequence])`.
- **`WebhookLog`** — idempotency via `@@unique([source, event, externalId])`.

### Background Jobs (`src/routes/jobs.ts`)

Background work is managed by **Upstash QStash**, which triggers internal API endpoints under `/api/v1/jobs/*`.

- **`/jobs/process-webhook`** — Processes incoming provider events (Paycrest, ChainRails).
- **`/jobs/poll-nearintents`** — Scheduled task that sweeps active NEAR Intents steps and advances their state.
- **`/jobs/dispatch-outgoing`** — Reliable, signed delivery of events to merchant endpoints.


### Startup bootstrap (`src/lib/merchant.ts`)

On every boot, `ensureMerchantDefaultInstruments()` backfills a merchant payout `Instrument` from `MERCHANT_PAYOUT_*` env vars for any `Client` without one — migration path from the old env-driven merchant config to the Instrument model. Fiat config wins over crypto if both are set.

### Key env vars (`apps/api/.env.example`)

`DATABASE_URL`, `UPSTASH_REDIS_REST_URL/TOKEN`, `QSTASH_URL/TOKEN/CURRENT_SIGNING_KEY`, `CHAINRAILS_API_*`, `NEAR_INTENTS_API_URL`, `NEAR_INTENTS_JWT`, `NEAR_POLL_INTERVAL_MS`, `PAYCREST_API_*`, `MERCHANT_PAYOUT_*`, `SENDER_FEE_BPS` (default 75 = 0.75%), `APP_FEE_BPS` (default 10 = 0.10%), `ALLOWED_ORIGINS` (CORS allowlist, comma-separated), `API_BASE` (url of the current deployment for QStash callbacks).

### Scripts

- `pnpm --filter @weave/api dev` — `ts-node-dev --respawn src/index.ts`
- `pnpm --filter @weave/api db:push` — `prisma db push`
- `scripts/backfill_old_orders.ts` — one-off migration utility.

## `apps/widget` — embeddable React checkout

Vite-built library. Publishes `WeaveCheckout` + `MerchantBackdrop` from `src/index.tsx`. Uses `@tanstack/react-query`, `viem`/`wagmi`, `qrcode.react`, Radix primitives, Tailwind v4. Design tokens live inline as the `WEAVE` object in `components/WeaveWidget.tsx` — dark ink + `#0F5D4C` accent.

Transport in `src/api/client.ts` — no cookies, API-key auth. Base URL resolution order: `window.__WEAVE_API_BASE__` → `VITE_API_BASE` → `http://localhost:4000/api/v1`. Exposes `fetchQuote`, `createOrder`, `fetchOrder`, `fetchCountries`, plus `fiatKey`/`cryptoKey` helpers that mirror the API's canonical format.

`src/dev.tsx` is the local playground rendered by `pnpm --filter @weave-sdk/widget dev` — overlays `WeaveCheckout` on a mocked `MerchantBackdrop` merchant page.

`WeaveCheckout` accepts an optional `customer?: { name?: string; email?: string }` prop. When provided, it is forwarded on every `createOrder` call so the merchant can see payer details in their dashboard. **Note:** any change to `apps/widget` requires publishing a new `@weave-sdk/widget` version before consumers pick up the change.

## `apps/dashboard` — merchant portal (Next.js 15)

App Router, React 19, Tailwind v4 with a natural design system (forest/tan/cream/ink). **User identity system** backed by email/password accounts stored in Postgres.

### Authentication Flow

**User registration & login** (`app/auth/signup`, `app/auth/login`) — Client-side forms (`'use client'`) that call:
- `POST /api/v1/auth/signup` — Creates a `User` row (with scrypt-hashed password) and a linked `Client` (merchant account). Issues a `Session` token (valid 24 hours by default).
- `POST /api/v1/auth/login` — Authenticates user + issues session token.

Both endpoints return `{ user: { id, email, ... }, session: { token, expiresAt } }`.

**Session storage** — The session token is stored in a `weave_session` cookie (Path=/, SameSite=Lax, Secure over HTTPS). This cookie is shared between client and server:
- **Client-side** — `app/lib/auth-client.ts` reads/writes the cookie for login/logout/signup flows.
- **Server-side** — `app/lib/auth-server.ts` reads the cookie to authenticate server components and dashboard API calls.

**Protected pages** — All routes outside `/auth/*` call `requireServerSession()` which:
- Reads the `weave_session` cookie.
- Calls `GET /api/v1/auth/session` with the token (safety net).
- Redirects to `/auth/login` if invalid or expired.

**Dashboard API calls** (`app/lib/dashboard-api.ts`) — All `fetchOrders`/`fetchOrder` calls:
- Read the session token from the cookie (server-side).
- Pass `x-session-token` header to `/orders` endpoints.
- Backend middleware `requireSession` validates and links to the user's `Client` (merchant account).

### Key distinction

- **API key** (`x-api-key`) — External systems (widget, third-party integrations) use merchant API keys. NOT used by the dashboard.
- **Session token** (`x-session-token`) — Merchant dashboard users authenticate with email/password, store the token in a cookie, and use it for all dashboard API calls.

### Env vars

`AUTH_SESSION_TTL_HOURS` (default 24), `AUTH_RESET_TTL_MINUTES` (default 15) — session and password-reset OTP lifetimes.
`API_BASE` (default `http://localhost:4000/api/v1`) — backend URL for server-side API calls.

### KYB Tier System

Merchants progress through four tiers:

| `kycLevel`  | Gate                                  | Capabilities                                   |
|-------------|---------------------------------------|------------------------------------------------|
| `none`      | No email verification                 | Read-only dashboard — no orders or links       |
| `basic`     | Email OTP verified                    | Orders + links, capped at 30/30 days           |
| `pending`   | KYB form submitted, awaiting review   | Same as `basic` while under review             |
| `verified`  | Admin approved via secure magic link  | Full access, no transaction caps               |

- Admin approval/rejection handled by `GET /admin/verify?id=&action=approve|reject&token=` with a JWT-signed magic link.
- **Rejection resets to `kycLevel: 'basic'`** (not `none`) — email is still verified.
- The dashboard home page (`app/page.tsx`) shows a 4-state KYB card that adapts copy and CTA for each tier.
- `kycLevel === 'none'` users are shown an email verification prompt and redirected to `/verify-email`.

### Customer PII on Orders

`Order.customer` is a `Json?` field in the Prisma schema. The API whitelists `{ name, email }` on `POST /orders`. Merchants pass it through the `WeaveCheckout` widget prop or via direct API. It is:
- Displayed on the merchant's transaction detail page (`app/transactions/[id]/page.tsx`) when present.
- Echoed in the `order.completed` webhook.
- Optional — absence never blocks payment processing.

The hosted payment link page (`app/pay/[slug]/PayClient.tsx`) collects customer name + email on the left column and passes them to `WeaveCheckout`.

### Sandbox

Sandbox routing is fully wired. Two credentials enter sandbox mode (`req.sandboxMode = true`):
- **Publishable key** (`x-api-key: pk_test_...`) — the browser/widget path (`Merchant.sandboxPublishableKey`).
- **Sandbox keypair** (`x-public-key: pk_test_...` + `x-secret-key: sk_test_...`) — the server-to-server path. `KeyPair.isSandbox = true` drives `req.sandboxMode`, so backend/SDK integrations (incl. **checkout sessions**) can be exercised end-to-end against sandbox. Signup mints both a live and a sandbox pair; existing merchants get one via `POST /merchant/keys/regenerate { mode: 'sandbox' }`.

Execution:
- `executor.service.ts` branches to `sandboxDispatch` in `sandbox-executor.ts`; crypto legs are mocked and auto-completed at creation — no real funds move.
- **Paystack leg is real-in-test when `PAYSTACK_SECRET_KEY_TEST` is set**: the executor provisions a genuine Paystack test transaction (test key, no subaccount), the widget opens the real test popup via the access code, and the order settles synchronously from the test-card payment (verified on poll in `syncOrder`). Without the test key it falls back to the fully-mocked instant-complete path.
- Sandbox orders/sessions are isolated from live and only appear when authenticated with test credentials.

### Layout & Routes

- `app/layout.tsx` — Root HTML shell, mounts `SidebarLayout` (client component).
- `components/SidebarLayout.tsx` — Detects auth routes vs authenticated routes and renders sidebar + content accordingly. Includes a `BusinessStatus` capsule.
- `app/page.tsx` — Main dashboard. Includes `AutoRefresh` (20s polling) and revenue metrics using `netSettlement` (post-fee). Shows a 4-state KYB status card.
- `app/transactions/page.tsx` — Transaction history with filtering and CSV export.
- `app/transactions/[id]/page.tsx` — Transaction detail / receipt. Shows customer name + email when the order has them.
- `app/links/page.tsx` — Payment link management. Includes a regex-validated numeric amount input and asset picker portal.
- `app/pay/[slug]/page.tsx` — Public hosted payment page. Collects payer name + email, renders `WeaveCheckout`.
- `app/onboarding/kyb/page.tsx` — Full KYB submission workflow (Personal -> Business -> Documents).
- `app/support/page.tsx` — Integrated contact form (routes to API) + FAQ + links to legal pages.
- `app/terms/page.tsx` & `app/privacy/page.tsx` — Legal documentation.
- `app/settings/page.tsx` — Merchant profile and payout destination management.
- `app/docs/page.tsx` — In-app developer docs. Sections: Introduction, Widget Playground, API Reference, API Playground, Checkout Sessions, Webhooks, **Agents**, Security, Support.

### Technical Patterns

- **Auto-Refresh**: Dashboard pages use `app/AutoRefresh.tsx` to trigger `router.refresh()` every 20 seconds, ensuring data stays synced without full reloads.
- **Revenue Calculation**: Revenue cards use `netSettlement(order)` to subtract provider/sender fees from gross `destAmount`, showing merchants what actually reaches their bank.
- **Naira-First UI**: Currency symbols default to ₦ and formatting reflects Nigerian banking standards (whole numbers or 2 decimals).

## Conventions

- **Checkout flow gates provider choice.** `flow: 'external'` (default) → NEAR Intents handles the cross-chain leg (send-from-another-wallet). `flow: 'self'` → reserved for ChainRails (connect-wallet). Edges in `router.service.ts` carry a `flows` allowlist; passing a flow filters the graph.
- **Asset keys are load-bearing.** Use `parseAsset` / `fiatKey` / `cryptoKey` rather than string-splitting inline. Chain and token are always uppercase; currency is ISO 4217 uppercase.
- **Fees:** `SENDER_FEE_BPS` + `APP_FEE_BPS` are applied to the USD-equivalent; `bridgeFeeUsd` is the ChainRails component. All three snapshot onto `Order` at creation.
- **Webhook order-of-operations:** verify signature → enqueue to QStash → check `WebhookLog.processed` for idempotency → mutate `RouteStep` → roll up `Order.status` → enqueue outgoing merchant webhook → upserts log row.
- **Security Whitelisting:** NEVER use `update: { ...req.body }` or `create: { ...req.body }`. Always explicitly whitelist fields in the route handler before passing to Prisma/Service layer to prevent mass-assignment.
- **Error shape:** every endpoint returns `{ success: boolean, data? , error? }`. Upstream provider failures map to HTTP `502`.
- **Never commit `.env`** — `.env.example` is the source of truth for required keys.

- The PRD describes normalized webhook fan-out to merchant endpoints, sandbox mode, analytics, batch orders, and chain-auto-detection in the widget. The widget demo screens are currently hard-coded against NGN + a mock balance list.
- **KYB & Verification:** Now fully wired. Admins verify via secure email links. Merchants see real-time status in the sidebar.
- **Settlement SLAs:** Formally updated to 30s – 2mins for bank-led corridors.
- **Support System:** Fully functional and integrated with transactional emails.
