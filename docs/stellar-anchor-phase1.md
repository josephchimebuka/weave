# Weave × Stellar — Phase 1 Technical Design: NGN Off-Ramp Anchor

**Status:** Draft for review
**Author:** Engineering
**Scope:** Make Weave a SEP-24 anchor that lets any Stellar wallet cash USDC-on-Stellar out to a Nigerian bank account (NGN), reusing Weave's existing route engine for settlement. Weave must never hold user funds.

---

## 1. Context & Goal

Phase 0 is done: `crypto:STELLAR:*` already routes as a payment **source** because the
NEAR Intents edge in `router.service.ts` gates on `nearIntents.chainIsKnown(chain)`
(dynamic), not a hardcoded allowlist. Stellar source assets bridge to `crypto:BASE:USDC`
and settle through the existing Paycrest leg.

Phase 1 makes Weave a **producer of Stellar network utility** rather than just a consumer:
a discoverable, SEP-compliant **NGN off-ramp anchor**. Strategically this maps directly onto
SDF's 2026 "Assets & Liquidity → on/off-ramp infrastructure" mandate and is the
grant-completing deliverable for an SCF Build Award.

**Non-goals (Phase 1):**
- Deposit / on-ramp (NGN → USDC on Stellar). Fast-follow, not MVP.
- Soroban contracts. Anchors run on Stellar Classic; Soroban escrow is a later phase.
- SEP-31 anchor-to-anchor corridors. Later.
- SDF Anchor Platform (JVM service). Unnecessary — see §3.

---

## 2. Core Insight: Weave Never Holds Funds

NEAR Intents already supports Stellar USDC as a source asset and returns a **Stellar-native
deposit address + memo** (same as XRP, TON). When Weave calls:

```ts
nearIntents.createQuote({ sourceAssetKey: 'crypto:STELLAR:USDC', ... })
// → { depositAddress: 'G...NEAR...', depositMemo: '123456789', ... }
```

That `depositAddress` is a Stellar account controlled by NEAR Intents — not Weave. The
user sends USDC directly to NEAR's Stellar account. Weave is a router; it never touches
the funds.

For SEP-24, the `withdraw_anchor_account` field in the transaction response is set to
NEAR's Stellar deposit address. The wallet (Lobstr, Vibrant) sends USDC straight to NEAR.

**The anchor keypair (Stellar signing key) is used only for SEP-10 JWT authentication.**
It never receives funds. There is no custodial hop.

---

## 3. Architecture

```
Stellar wallet (Lobstr / Vibrant / any SEP-24 client)
   │  SEP-10 auth  →  SEP-24 /withdraw/interactive  →  interactive KYC + bank entry
   ▼
┌─────────────────────────────────────────────────────────────┐
│ Weave API (existing Express, port 4000)                      │
│  • GET /.well-known/stellar.toml                             │
│  • POST /sep10/auth  (challenge + verify, keypair signs)     │
│  • POST /sep24/transactions/withdraw/interactive             │
│       → creates NEAR Intents quote                           │
│       → creates Weave Order                                  │
│       → sets withdraw_anchor_account = NEAR deposit address  │
│  • GET  /sep24/transaction?id=  (maps to Order.status)       │
│  • GET  /sep24/transactions                                  │
└─────────────────────────────────────────────────────────────┘
   │
   │  withdraw_anchor_account = G...NEAR_DEPOSIT_ADDRESS...
   │  withdraw_memo            = NEAR memo
   ▼
User's Stellar wallet sends USDC directly to NEAR Intents
   ▼
┌─────────────────────────────────────────────────────────────┐
│ Weave executor  ── REUSED ──                                  │
│  NEAR Intents:  crypto:STELLAR:USDC → crypto:BASE:USDC       │
│  Paycrest:      crypto:BASE:USDC   → fiat:NGN bank           │
│  (existing pipeline, zero changes)                           │
└─────────────────────────────────────────────────────────────┘
   ▼
NGN bank account
```

**Why skip the SDF Anchor Platform?**

The AP is a JVM service that owns Stellar custody (its own signing keys + Postgres). Since
Weave has no custody to manage, AP adds a second runtime, a second database, a
JVM ops burden, and AP↔business-server JWT complexity — with no corresponding benefit.
SEP-24 is a small, well-specified REST API that fits naturally into the existing Express app.

---

## 4. Fund Flow (Non-Custodial)

```
1. User initiates SEP-24 withdrawal from their Stellar wallet.
2. Weave's /sep24/transactions/withdraw/interactive:
     a. Calls nearIntents.createQuote(STELLAR:USDC → BASE:USDC, recipient=Paycrest address).
     b. Gets { depositAddress: 'G...NEAR...', depositMemo: '...' }.
     c. Calls runPaycrestOfframp(BASE:USDC → NGN, bank details) to get Paycrest address.
     d. Creates a Weave Order + RouteSteps (NEAR step + Paycrest step).
     e. Returns interactive webview URL.
3. User completes webview (enters bank details, sees rate/fee).
4. Weave's SEP-24 transaction record sets:
     withdraw_anchor_account = NEAR's G... address
     withdraw_memo            = NEAR memo from step 2b
5. Wallet sends USDC to NEAR's Stellar account. ← Weave never holds funds.
6. NEAR processes the swap → delivers USDC on Base to Paycrest's receive address.
7. Paycrest settles NGN to the bank.
8. Weave's NEAR poller (existing) marks NEAR step done → Paycrest webhook marks done.
9. Order status → completed; Weave's /sep24/transaction?id= returns status=completed.
```

The existing reverse-order executor (§6 of the old design) still applies: step 2c runs
before 2b so Paycrest's receive address is available as the NEAR recipient. No new
executor logic is needed.

---

## 5. New Routes (Express)

New router `src/routes/sep24.ts`, mounted at `/` (to serve SEP-standard paths):

| Path | Method | Description |
|---|---|---|
| `/.well-known/stellar.toml` | GET | SEP-1. Static file advertising anchor metadata. |
| `/sep10/auth` | GET | SEP-10 challenge. Returns unsigned Stellar tx. |
| `/sep10/auth` | POST | SEP-10 verify. Validates signed tx, returns JWT. |
| `/sep24/info` | GET | Returns supported assets (USDC), limits, fee schedule. |
| `/sep24/fee` | GET | Returns fee for a given amount. Wraps existing fee logic. |
| `/sep24/transactions/withdraw/interactive` | POST | Creates quote + Order, returns interactive URL. |
| `/sep24/transaction` | GET | Returns single SEP-24 transaction mapped from Order. |
| `/sep24/transactions` | GET | Returns list of SEP-24 transactions for the authenticated account. |

Authentication for SEP-24 endpoints: `Authorization: Bearer <SEP-10 JWT>`.

---

## 6. Data Model Changes

Minimal, additive (`prisma/schema.prisma`):

```prisma
model Order {
  // ...existing...
  origin       String  @default("widget") // "widget" | "api" | "anchor"
  anchorTxId   String?  @unique           // SEP-24 transaction id (UUID Weave issues)
  anchorStellarAccount String?            // user's Stellar account (from SEP-10 JWT)
}

// Idempotency for SEP-10 nonces and replay protection
model AnchorChallenge {
  id         String   @id @default(uuid())
  nonce      String   @unique
  stellarAccount String
  usedAt     DateTime?
  expiresAt  DateTime
  createdAt  DateTime @default(now())
}
```

- `Order.anchorTxId` — the SEP-24 transaction ID returned to wallets. Stable handle.
- `Order.anchorStellarAccount` — the user's Stellar G address (from SEP-10 auth).
- `AnchorChallenge` — prevents SEP-10 nonce replay.

No `AnchorEventLog` needed (no AP callbacks to deduplicate).

---

## 7. SEP-10 Authentication

SEP-10 is a challenge-response protocol:

1. Wallet calls `GET /sep10/auth?account=G...` — Weave builds a Stellar transaction
   containing a nonce, signed by the anchor's signing key, returned unsigned to the wallet.
2. Wallet signs the transaction with its own key.
3. Wallet calls `POST /sep10/auth` with the signed tx — Weave verifies both signatures
   (anchor's and wallet's), issues a short-lived JWT.

Implementation uses `@stellar/stellar-sdk` (Stellar's official JS SDK):
- `TransactionBuilder` to build the challenge tx
- `Transaction.verify` to check wallet signature
- `jwt.sign` to issue the SEP-10 JWT (standard `jsonwebtoken` package)

New env vars: `STELLAR_ANCHOR_SECRET` (the anchor keypair secret, `S...`), 
`STELLAR_ANCHOR_ACCOUNT` (derived `G...`), `STELLAR_NETWORK_PASSPHRASE` (mainnet or testnet),
`STELLAR_SEP10_JWT_SECRET` (signs Weave's SEP-10 JWTs).

---

## 8. `stellar.toml` (SEP-1)

Served at `/.well-known/stellar.toml` as `text/plain`:

```toml
NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
SIGNING_KEY="G...ANCHOR_ACCOUNT..."
TRANSFER_SERVER_SEP0024="https://api.weave.finance"
WEB_AUTH_ENDPOINT="https://api.weave.finance/sep10/auth"

[[CURRENCIES]]
code="USDC"
issuer="GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
status="live"
is_asset_anchored=true
anchor_asset_type="fiat"
anchor_asset="NGN"
redemption_instructions="Withdraw USDC for NGN via SEP-24 interactive flow."
```

Can be a static file committed to the repo and served by a new Express middleware.

---

## 9. Status Mapping

| Weave Order status | SEP-24 transaction status | Trigger |
|---|---|---|
| `awaiting_deposit` | `pending_user_transfer_start` | NEAR quote created, waiting for user to send |
| `processing` | `pending_anchor` | NEAR swap in progress |
| `processing` | `pending_external` | Paycrest settling NGN |
| `completed` | `completed` | Paycrest settled |
| `failed` | `error` | Any step failed |
| `refunded` | `refunded` | NEAR refunded |

`GET /sep24/transaction?id=:anchorTxId` maps `Order.status` to the SEP-24 status enum.
No additional state machine needed.

---

## 10. SEP Stack

- **SEP-1** — `stellar.toml`, static file in Express.
- **SEP-10** — Implemented in `src/routes/sep24.ts` using `@stellar/stellar-sdk`.
- **SEP-24** — Interactive withdrawal routes. Interactive webview can be a minimal React page
  served by the Express app (or Next.js dashboard) that collects the bank account and shows
  the quote. Rate/fee callbacks reuse existing quote logic.
- **SEP-38** (optional) — Firm quotes. Add later if locked rates are requested.
- **SEP-12** (KYC) — End-user KYC is lighter than merchant KYB. For Phase 1: reuse the
  existing `OtpChallenge` system for phone verification. Define a `basic` KYC tier for
  anchor cash-out users (not merchants; no KYB required).

---

## 11. Deploy Topology

```
┌── Weave API (existing Express, port 4000) ──────────────────┐
│  Existing routes unchanged                                   │
│  + /.well-known/stellar.toml                                 │
│  + /sep10/auth                                               │
│  + /sep24/*                                                  │
│  Anchor signing key (env only, never committed)              │
└─────────────────────────────────────────────────────────────┘
         │                            │
    Weave Postgres                Stellar network
    (Orders + new anchor cols)    (Horizon RPC — for tx verification)
```

- No new runtime. No new Postgres schema beyond additive columns.
- New secrets: `STELLAR_ANCHOR_SECRET`, `STELLAR_SEP10_JWT_SECRET`,
  `STELLAR_NETWORK_PASSPHRASE`, `HORIZON_URL`. All via env.
- Testnet first (Testnet USDC, Horizon testnet) → mainnet for final tranche.

---

## 12. Milestones (SCF Build tranches)

1. **MVP (⅓):** `stellar.toml` live, SEP-10 auth working, SEP-24 withdrawal happy path on
   testnet with mock NGN payout. `anchorTxId` round-trips correctly.
2. **Testnet / LaunchKit:** Full withdrawal end-to-end on testnet through real executor
   (NEAR bridge → Paycrest sandbox). KYC reusing `OtpChallenge`. Status round-trips
   correct. Weave anchor submitted to Anchor Validator.
3. **Mainnet (final ⅓):** Live on mainnet. Real user cashes Stellar USDC → NGN.
   Anchor submitted to Anchor Directory (anchors.stellar.org).

---

## 13. Open Questions / Risks

- **End-user KYC tier:** Anchor cash-out is by an end user, not a merchant. A `basic`
  tier (phone OTP) is likely sufficient for NGN regulatory requirements, but confirm with
  local legal counsel.
- **NEAR Intents Stellar min-amount:** Verify minimum swap threshold for STELLAR:USDC →
  BASE:USDC. The executor already surfaces "amount too low" errors.
- **SEP-10 JWT expiry:** SEP-10 JWTs should be short-lived (15–30 min). Anchor clients
  typically re-auth before each interactive session.
- **Horizon RPC:** Needed for SEP-10 tx verification. Prefer a managed provider
  (Blockdaemon, Quicknode Stellar) over a self-hosted node.
- **Direct Stellar→NGN partner (future):** If a partner (e.g. Yellow Card) can off-ramp
  directly from Stellar USDC, the NEAR bridge hop can be removed for this corridor —
  track as an optimization that reduces latency and fees.

---

## References

- SEP-10 spec — https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md
- SEP-24 spec — https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md
- SEP-1 (stellar.toml) — https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0001.md
- Anchor basics — https://developers.stellar.org/docs/learn/fundamentals/anchors
- Stellar JS SDK — https://github.com/stellar/js-stellar-sdk
