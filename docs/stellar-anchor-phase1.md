# Weave × Stellar — Phase 1 Technical Design: NGN Off-Ramp Anchor

**Status:** Draft for review
**Author:** Engineering
**Scope:** Make Weave a SEP-24 anchor that lets any Stellar wallet cash USDC-on-Stellar out to a Nigerian bank account (NGN), reusing Weave's existing route engine for settlement.

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

---

## 2. Core Insight

The Anchor Platform's design splits cleanly:

- **Anchor Platform (SDF-maintained)** owns the Stellar/protocol side: SEP-1/10/12/24,
  Stellar custody, and **incoming-payment detection**.
- **Your business server** (Weave's existing Express API) owns the money: rates, fees, KYC,
  and the actual fiat payout.

A `USDC-on-Stellar → NGN` withdrawal therefore reduces to: *Anchor Platform tells Weave
"we received X USDC for bank account Y," and Weave runs its existing executor.* Phase 1 is a
**protocol adapter onto the existing route engine**, not a new settlement system.

---

## 3. Architecture

```
Stellar wallet (Lobstr / Vibrant / any SEP-24 client)
   │  SEP-10 auth  →  SEP-24 /withdraw/interactive  →  interactive KYC + bank entry
   ▼
┌─────────────────────────────────────────────────────────────┐
│ Anchor Platform   (JVM service + its own Postgres)            │
│  • SEP-1/10/12/24 protocol                                    │
│  • Stellar custody (self-custody signing keys, MVP)           │
│  • detects incoming USDC payment to the anchor account        │
└─────────────────────────────────────────────────────────────┘
   │  (a) Callbacks API  — Weave implements: Rate, Fee, Customer
   │  (b) Platform API   — Weave consumes: tx events + status updates
   ▼
┌─────────────────────────────────────────────────────────────┐
│ Weave API (existing Express business server)                 │
│  • /anchor/callbacks/*  (rate, fee, customer)                 │
│  • anchor event handler → creates an internal Order           │
│  • instructs custody to push held USDC onward                 │
└─────────────────────────────────────────────────────────────┘
   ▼
Weave executor  ── REUSED ──
   ├─ NEAR Intents:  crypto:STELLAR:USDC → crypto:BASE:USDC   (Phase 0, already wired)
   └─ Paycrest:      crypto:BASE:USDC   → fiat:NGN bank        (already wired)
   │  on settlement → Platform API: mark anchor tx `completed`
   ▼
NGN bank account
```

### Component decisions (defaults — revisitable)
- **Protocol layer:** SDF **Anchor Platform**. Rationale: it handles SEP-10 signing,
  custody, and payment detection (the risky parts of a financial flow), maps onto our
  callback/event model with minimal new business logic, and is the path SDF expects to see.
  Cost: a second (JVM) runtime + its own Postgres.
- **Custody:** **self-custody** via Anchor Platform signing keys for testnet + early mainnet.
  Revisit Fireblocks/external custody as volume grows.

---

## 4. The Custodial Hop (the one genuinely new piece)

In the **standard** Weave flow the payer sends crypto straight to a NEAR Intents deposit
address; Weave never holds funds. In the **anchor** flow, SEP-24 requires the user send USDC
to the *anchor's* Stellar account. So Weave is custodial for exactly one hop and must push the
funds onward:

1. Anchor Platform detects the inbound USDC and fires a transaction event to Weave.
2. Weave creates an Order (`source = crypto:STELLAR:USDC`, `dest = fiat:NGN:<bank>`).
3. Executor creates the NEAR Intents quote (Stellar USDC → Base USDC) → gets a **deposit
   address**.
4. **New step:** Weave instructs Anchor Platform custody to send the held USDC from the anchor
   account to that NEAR deposit address (an outbound Stellar payment via the Platform
   API / custody integration).
5. NEAR completes → Paycrest leg → NGN settles (existing pipeline, unchanged).
6. On settlement, Weave calls the Platform API to mark the anchor transaction `completed`.

This "push held funds to the NEAR deposit address" is the only new settlement logic.

---

## 5. Routing & Executor Integration

Introduce a third `Flow` value to signal the prefunded/custodial path without forking the
route graph:

```ts
// router.service.ts
export type Flow = 'self' | 'external' | 'anchor';
```

- Routing is identical to the existing `crypto:STELLAR:USDC → fiat:NGN` plan
  (`nearintents → paycrest`); `flow: 'anchor'` simply keeps the same Stellar NEAR edge eligible.
- The executor branches on `flow === 'anchor'`: instead of generating a **user-facing** deposit
  address at step 0, it (after building the NEAR deposit address) triggers the custodial
  outbound payment described in §4. All downstream steps run as-is.

This preserves the reverse-order executor and the `RouteStep` state machine.

---

## 6. Data Model Changes

Minimal, additive (`prisma/schema.prisma`):

```prisma
model Order {
  // ...existing...
  origin       String  @default("widget") // "widget" | "api" | "anchor"
  anchorTxId   String?  @unique           // SEP-24 transaction id from Anchor Platform
}

// Idempotency for Anchor Platform events (mirror of WebhookLog pattern)
model AnchorEventLog {
  id         String   @id @default(uuid())
  anchorTxId String
  event      String   // AP transaction status, e.g. "pending_anchor", "completed"
  processed  Boolean  @default(false)
  payload    Json
  createdAt  DateTime @default(now())

  @@unique([anchorTxId, event])
}
```

- `Order.anchorTxId` links the Weave Order ↔ the AP transaction for status round-tripping.
- `AnchorEventLog` gives the AP event stream the same idempotency guarantee inbound provider
  webhooks already have (`@@unique`), so duplicate AP notifications can't double-process.
- The Stellar receive itself is owned by AP, so we do **not** model it as a `RouteStep`; the
  executor's first real step remains the NEAR Intents leg.

---

## 7. Callbacks Weave Must Implement

New router `src/routes/anchor.ts`, mounted at `/api/v1/anchor` (or a dedicated callbacks path),
authenticated by a shared JWT/secret between Anchor Platform and the business server.

| Callback | Maps onto existing Weave logic |
|---|---|
| **Rate** (`GET /rate`) | Wrap `/quotes` + Paycrest sell rate. Returns price for `USDC → NGN`. |
| **Fee** (`GET /fee`) | Wrap `SENDER_FEE_BPS` + `APP_FEE_BPS` (+ NEAR bridge fee). |
| **Customer / KYC** (SEP-12) | Map to existing KYC infra (`OtpChallenge`, `BusinessVerification`). End-user cash-out KYC may be lighter than merchant KYB — define a dedicated tier. |
| **Unique address** (optional) | Only if per-user deposit addresses are used; not needed for memo-routed shared account. |

**Event consumption (Platform API):** a handler that receives AP transaction status changes,
checks `AnchorEventLog` for idempotency, creates/advances the Order, and on terminal settlement
PATCHes the AP transaction to `completed` / `error`.

---

## 8. Status Mapping

| Anchor Platform tx status | Trigger | Weave Order status |
|---|---|---|
| `incomplete` | withdrawal initiated, awaiting user send | (no Order yet) |
| `pending_user_transfer_start` | awaiting USDC deposit to anchor acct | `awaiting_deposit` |
| `pending_anchor` | USDC received → Order created, executor running | `processing` |
| `completed` | Paycrest settled NGN | `completed` |
| `error` / `refunded` | executor failed | `failed` / `refunded` |

Weave drives AP status via the Platform API off the existing `markStepDone` / `markStepFailed`
roll-ups — the same functions the webhook worker and NEAR poller already call.

---

## 9. SEP Stack & `stellar.toml`

- **SEP-1** `stellar.toml` at `/.well-known/stellar.toml` — advertises org info, signing key,
  `TRANSFER_SERVER_SEP0024`, supported currency (NGN), and the USDC asset accepted. Can be
  served by AP or by Weave (Next.js/Express static).
- **SEP-10** — handled by AP (server signing key).
- **SEP-12** — KYC, AP-stored, populated via our Customer callback.
- **SEP-24** — interactive withdrawal; AP hosts the webview shell, Weave provides the
  interactive content (bank entry / KYC) and the rate/fee.
- **SEP-38** (optional) — firm quotes; add if we advertise locked rates. SEP-24 works with the
  simpler rate/fee callbacks for MVP.

---

## 10. Deploy Topology

```
┌── Weave API (existing) ──┐     ┌── Anchor Platform ──┐
│  Express :4000           │◄───►│  JVM service        │
│  /anchor/callbacks/*     │ JWT │  + Postgres (AP)    │
│  Platform API client     │     │  Stellar signing key│
└──────────────────────────┘     └─────────────────────┘
        │                                  │
   Weave Postgres                    Stellar network
   (Orders, RouteSteps)              (Horizon / RPC)
```

- AP is **stateless** but needs its **own Postgres** (separate DB or schema; do not share
  Weave's app tables).
- New secrets: Stellar distribution/signing keys, SEP-10 server key, shared AP↔business-server
  JWT secret, Horizon/RPC URL. All via env (`.env.example`), never committed.
- Start testnet (Horizon testnet + test USDC) → promote to mainnet for the final tranche.

---

## 11. Milestones (mapped to SCF Build tranches)

1. **MVP (⅓):** AP on **testnet**, `stellar.toml` live, SEP-10 auth working, SEP-24 withdrawal
   happy path with rate/fee/customer callbacks wired to Weave; mock NGN payout.
2. **Testnet / LaunchKit:** Full withdrawal end-to-end on testnet through the *real* executor
   (NEAR bridge → Paycrest sandbox), KYC reusing the tiered system, status round-trips correct,
   custodial hop (§4) working.
3. **Mainnet (final ⅓):** Live on mainnet, a real merchant/user cashes Stellar USDC → NGN,
   anchor submitted to the Anchor Directory (anchors.stellar.org). Grant-completing deliverable.

---

## 12. Open Questions / Risks

- **End-user KYC tier:** anchor cash-out is by an *end user*, not a merchant. Define a
  dedicated, lighter KYC tier vs. the merchant KYB flow. (Reuses `OtpChallenge`; new policy.)
- **Custodial-hop latency/fees:** the extra Stellar→NEAR outbound adds one on-chain payment;
  confirm it stays within SLA and fee budget.
- **NEAR Intents Stellar liquidity/min-amount:** verify min-swap thresholds for
  `STELLAR:USDC → BASE:USDC` so small cash-outs don't fail (executor already maps the
  "amount too low" error).
- **Direct Stellar→NGN partner:** if a partner can off-ramp directly from Stellar USDC, the
  NEAR bridge hop could be removed for this corridor — track as an optimization.
- **JVM ops:** Anchor Platform is a new runtime for a Node shop; containerize and treat its
  Postgres as managed.

---

## References

- Anchor Platform architecture — https://developers.stellar.org/docs/platforms/anchor-platform/admin-guide/architecture
- SEP-24 withdrawal flow — https://developers.stellar.org/docs/platforms/anchor-platform/admin-guide/sep24/withdrawal
- Custody integration — https://developers.stellar.org/docs/platforms/anchor-platform/admin-guide/custody-service-integration
- Anchor basics — https://developers.stellar.org/docs/learn/fundamentals/anchors
