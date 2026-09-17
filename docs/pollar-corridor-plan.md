# Pollar × Weave — Africa ↔ LatAm corridor (hackathon build plan)

> Branch: `pollar-corridor` (off `main`). Five days. Goal: win the flagship
> "African leg of an Africa ↔ Latin America corridor" challenge.

## Thesis

Pollar already models every LatAm country as a **ramp corridor** (direction +
country + fiat + rail + USDC on Stellar), and it can enable **any SEP-24 anchor**
as a provider. So the highest-leverage African leg is not a bespoke remittance
app — it is **making Weave a SEP-24 anchor for NGN**. Then:

- every Pollar app gets `Nigeria · NGN · Bank transfer` in `openRampModal()`
  next to Bolivia, Mexico, Brazil — zero integration code;
- an Africa ↔ LatAm transfer collapses to *ramp in locally → Stellar USDC
  payment → ramp out locally*, the exact shape Pollar already runs;
- Weave stays non-custodial: every hop is forward-bound
  (Paycrest ↔ Base USDC ↔ NEAR Intents ↔ Stellar USDC), as today.

```
Nigeria (Weave = SEP-24 anchor)                 Stellar             Bolivia (Pollar / Stereum)
NGN bank ─Paycrest onramp─▶ USDC(Base) ─NEAR─▶ USDC(Stellar) ─▶ Pollar wallet ─offramp─▶ BOB (ACH)
NGN bank ◀─Paycrest offramp─ USDC(Base) ◀─NEAR─ USDC(Stellar) ◀─ Pollar wallet ◀─onramp── BOB (QR)
```

Verified prerequisites (2026-09-17):
- NEAR Intents 1Click lists Stellar USDC (Circle, issuer `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`) and Base USDC.
- Pollar `buildTx('payment')` accepts `options.memo` (`text` | `id`).
- Pollar ramps adapter "Anclap" = any SEP-24 anchor; corridors are seeded from `stellar.toml` + `/info`.
- Weave already accepts `crypto:STELLAR:USDC` as a payment source (memo deposits) → Stellar → NGN works today.

## Deliverables

1. **Weave SEP-24 anchor** (`apps/api`, `apps/dashboard`)
   - `GET /.well-known/stellar.toml` (SIGNING_KEY, WEB_AUTH_ENDPOINT, TRANSFER_SERVER_SEP0024, CURRENCIES USDC).
   - SEP-10: `GET /sep10/auth` (challenge) · `POST /sep10/auth` (verify → JWT).
   - SEP-24: `GET /sep24/info` · `POST /sep24/transactions/{deposit,withdraw}/interactive` · `GET /sep24/transaction` · `GET /sep24/transactions`.
   - `StellarAnchorTransaction` ↔ `Order` (1:1), SEP-24 status derived from order/step state.
   - Interactive pages in the dashboard app: `/ramp/deposit/[id]` (NGN → user's Stellar wallet) and `/ramp/withdraw/[id]` (Stellar USDC → NGN bank; anchor returns `withdraw_anchor_account` + `withdraw_memo` so Pollar auto-builds the payment).
2. **Router edge**: NEAR Intents → `crypto:STELLAR:USDC` (+ executor refund-address fix for EVM-source → non-EVM-dest NEAR hops).
3. **`apps/corridor`** — Next.js on `@pollar/react`: login → wallet → *Send to Nigeria* (USDC→NGN via Weave), *Receive from Nigeria* (NGN→this wallet), *Cash out to Bolivia* (Pollar ramp modal). Recipient directory (handle → G-address).
4. Docs page (`apps/docs`), README, demo video, real small-amount test with the Pollar team on the Bolivian side.
5. Stretch: x402-gated `POST /x402/payout` — an agent pays a Nigerian bank in NGN with Stellar USDC.

## Day plan

| Day | Build | Proof |
| --- | --- | --- |
| 1 | Router edge + executor fix; Prisma model; stellar.toml + SEP-10 | vitest green; `NGN → crypto:STELLAR:USDC` sandbox order returns bank details; SEP-10 challenge verifies with `@stellar/stellar-sdk` |
| 2 | SEP-24 endpoints + interactive pages + status mapping | Stellar demo wallet / Pollar test app completes deposit + withdraw in sandbox |
| 3 | `apps/corridor` on `@pollar/react` | Login → wallet → pay Weave memo-address → NGN order completes (sandbox) |
| 4 | Live test (small amounts) with Pollar team; polish; docs | Real NGN → BOB and BOB → NGN receipts |
| 5 | Video, README, submission; x402 stretch | — |

## Naming

`anchor*` in this codebase already means **getanchor.co** (Nigerian BaaS). All
Stellar SEP work is namespaced `stellar-anchor` / `sep10` / `sep24`, env vars
`STELLAR_ANCHOR_*` / `WEAVE_STELLAR_*`, dashboard route `/ramp/*`.
