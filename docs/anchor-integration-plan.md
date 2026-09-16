# Anchor Integration — Build Plan (Weave / Dewdrop Labs)

> Goal: replace Bachs with **Anchor** as the naira collection + settlement rail. Anchor mirrors the existing Bachs integration surface almost 1:1, so most work is "swap the provider," but Anchor's model differs in three ways that change the design: **(1) real per-merchant KYB'd bank accounts**, **(2) collection is bank-transfer-to-a-NUBAN, not a hosted card overlay**, and **(3) a different webhook signature scheme.**

---

## How Anchor differs from Bachs (the shape of the work)

| | Bachs (current) | Anchor (new) |
| --- | --- | --- |
| Merchant account | Connected account (Bachs-hosted KYC) | **BusinessCustomer + DepositAccount**, KYB'd in the merchant's own name (BVN, directors, docs) |
| Collection UX | Hosted overlay (`bachs.js`), card + transfer | **"Transfer ₦X to this NUBAN"** — bank transfer only, no SDK, no card |
| Order → payment match | Checkout session id | **Needs a correlation strategy** (see Decision D1) |
| Money units | Decimal strings ("75000.00") | **Kobo integers** (7500000) |
| Fee extraction | Split-transfer to connected acct | **Book transfer** (₦0) merchant acct → Dewdrop platform acct |
| Payout to bank | Withdrawal from connected balance | NIP transfer from deposit account |
| Webhook signature | HMAC-SHA256 over `ts.body`, hex | **HMAC-SHA1 over raw body, Base64(hexdigest)** — new scheme |
| Verified event | `capability.updated` | `customer.identification.approved` |

---

## Anchor API contract (confirmed from docs)

- **Auth:** `x-anchor-key: <key>` header. Sandbox key infix `_test_`, live infix `_prod_`. Base: sandbox `https://api.sandbox.getanchor.co/api/v1`, live `https://api.getanchor.co/api/v1` *(confirm live host)*. Collections live under a `/pay/*` prefix.
- **Amounts:** integer **kobo** (₦1 = 100).
- **Customer + KYB:**
  - `POST /customers` (type `BusinessCustomer`: name, BVN, registration, industry, officers[] with BVN/DOB/address/ownership%, emails, addresses) → `…-anc_bus_cst`, status ACTIVE/unverified.
  - `POST /customers/{id}/verification/business` → triggers KYB. Webhooks: `customer.identification.approved | rejected | error | manualReview | reenter_information | awaitingDocument`; docs → `document.approved | rejected`.
- **Deposit account:** `POST /accounts` (type `DepositAccount`, productName `CURRENT`, customer rel) — **requires KYC complete** → `…-anc_acc`; NUBAN generated async → webhook `accountNumber.created`; also `account.opened`.
- **Collections:** `POST /pay/reserved-account` (provider e.g. `ninepsb`, linked to customer/subaccount) → 10-digit NUBAN. Inbound → `payin.received` (minimal; fetch `GET /pay/payin/:id` + `include` Charge for amount/sender/ref/account). Also `payment.received` (into VNUBAN) → `payment.settled` (into deposit account); and `nip.inbound.received` → `nip.inbound.completed` for direct deposit-account NUBANs.
- **Payout (NIP out):** `GET /banks` (NIP codes) → `GET /payments/verify-account/{bankCode}/{acctNo}` → `POST /counterparties` (or one-shot `verifyName:true`) → `POST /transfers` (amount kobo, currency, reason, `reference` = idempotency, `account` src, `counterParty`). Status `GET /transfers/verify/{id}`; webhooks `nip.transfer.initiated | successful | failed | reversed`.
- **Book transfer (₦0):** intra-Anchor account→account — used to skim Weave's fee to Dewdrop's platform account.
- **Balance:** `GET` deposit-account balance (available vs pending) — gate fee-skim/payout on available.
- **Webhook signature:** header `x-anchor-signature`; **HMAC-SHA1** of the **raw body** (no timestamp); value = `Base64( hex_digest )`; constant-time compare; fail closed. *(Note: Base64 of the hex string, per Anchor's own example — replicate exactly.)*

---

## Five decisions — RESOLVED

- **D1 — Order ↔ payment correlation → per-order Dynamic Virtual Account.** ✅ Confirmed live: `POST /pay/pay-with-transfer` creates a single-use NUBAN (≤1hr TTL, fields `reference`, `customerEmail`, `expiryTime` secs, `amount` kobo); inbound → `payin.received` maps 1:1 to the order. **CAVEAT:** the docs state `/pay/pay-with-transfer` is *"only available to organizations with a payment program in production"* — so it may be disabled in sandbox. **Plan:** service client implements BOTH `createDynamicAccount` (pay-with-transfer) and `createReservedAccount` (`/pay/reserved-account`); executor defaults to Dynamic, config-fallback to Reserved. Confirm against sandbox creds; if pay-with-transfer is blocked in sandbox, build/test on Reserved and switch to Dynamic at go-live.
- **D2 — Payout model → ACCRUE.** ✅ Funds accrue in the merchant's Anchor account; payout is a decoupled, merchant-initiated/bulk concern, not per-order. (Margin-friendly — amortizes the ₦50 NIP + stamp.)
- **D3 — Account structure → per-merchant BusinessCustomer + DepositAccount in the merchant's own name.** ✅ Confirmed direction (still get Anchor's written confirmation via redline A1, but build proceeds on this).
- **D4 — Fee extraction → book-transfer skim** of Weave's 0.85% from merchant acct → Dewdrop platform acct after settlement. ✅ (Confirm merchant→platform book transfers via redline A3.)
- **D5 — Keep Bachs gated off.** ✅ Add Anchor alongside; leave `bachs*` in place with `BACHS_ENABLED=false` while in sandbox. When ready to switch: flip to Anchor, then delete Paystack. No destructive rename now.

**Auth caveat:** `x-anchor-key` header is the documented method; one source mentioned HTTP basic auth — verify against sandbox on first call.

---

## Phased build

### Phase 0 — Flags & config
- `lib/flags.ts`: add `ANCHOR_ENABLED`; `NAIRA_ENABLED = PAYSTACK_ENABLED || BACHS_ENABLED || ANCHOR_ENABLED`.
- `.env.example`: `ANCHOR_API_KEY` (prod), `ANCHOR_API_KEY_TEST` (test), `ANCHOR_API_BASE`, `ANCHOR_SANDBOX_API_BASE`, `ANCHOR_WEBHOOK_SECRET`; tuning `ANCHOR_FEE_BPS`, `ANCHOR_SETTLE_DELAY_S`, `ANCHOR_PAYOUT_HOLD_S`, `ANCHOR_PAYOUT_RETRY_S`, `ANCHOR_PAYOUT_MAX_ATTEMPTS`.

### Phase 1 — `services/anchor.service.ts` (new; mirror bachs.service.ts)
- `creds(sandbox)` → base + `x-anchor-key`; `toAnchorAmount(naira)` → kobo int; `fromKobo()`.
- Methods: `createBusinessCustomer`, `triggerBusinessKYB`, `getCustomer`, `createDepositAccount`, `getAccount`, `createReservedAccount`, `getPayin`, `listBanks`, `verifyAccount`, `createCounterparty`, `createTransfer`, `getTransfer`, `createBookTransfer`, `getBalance`, `uploadDocument`.
- `verifyWebhookSignature(rawBody, signature)` — **HMAC-SHA1 → Base64(hexdigest)**, `timingSafeEqual`, fail-closed. (NOT reusable from Bachs/ChainRails — new scheme.)
- Export `export const anchor = new AnchorService()`.

### Phase 2 — Schema + migration (`prisma migrate dev`, never db push)
- `Merchant`: `anchorCustomerId?`, `anchorAccountId?`, `anchorAccountNumber?`, `anchorBankName?`, `anchorKybStatus?`, `anchorOnboardedAt?`.
- `Order`: `anchorPayinId?`, `anchorFeeTransferId?`, `anchorSettledAt?`, `anchorPayoutTransferId?`, `anchorPayoutStatus?`, `anchorPayoutAt?`.
- `RouteStep`: reuse `transferGroup`; add `anchorAccountNumber?`/`anchorReference?` (the per-order collection NUBAN + reference). Reuse `WebhookLog`.
- Apply local, then prod via `migrate deploy` on the DIRECT (non-pooled) Neon URL. **`prisma generate` kills ts-node-dev → restart the API after.**

### Phase 3 — Router (`router.service.ts`)
- `Provider` += `'anchor'`; add NGN→NGN edge (`flows:['external']`, `expectedFeeBps` ≈ 50–85) gated by `ANCHOR_ENABLED`, placed before the Bachs/Paystack edges; add to the enabled-provider filter and the same-asset-hop allowlist.

### Phase 4 — Executor (`executor.service.ts` + `sandbox-executor.ts`)
- `executeAnchorOrder`: guard `merchant.anchorAccountId && anchorKybStatus==='approved'`; create the collection RouteStep (`fiat:NGN`→`fiat:NGN`); per D1 provision the per-order virtual account + reference (or resolve static NUBAN); return `nextAction.screen='anchor_transfer'` `{ accountNumber, bankName, accountName, amount, reference }`. Sandbox-mock branch.
- Settlement helpers: `runAnchorFeeSkim` (book transfer to platform, `idempotencyKey fee:${orderId}`, gate on available balance), `scheduleAnchorSettle`; keep payout **decoupled** (`runAnchorPayout` + `scheduleAnchorPayout`, used by a merchant-initiated/bulk sweep, not per order).
- Reuse `markStepDone/markStepFailed/markStepProgress`. `syncOrder` anchor branch: poll `getPayin`/balance as webhook safety-net.

### Phase 5 — Webhooks + jobs
- `routes/webhooks.ts`: `POST /anchor` → `anchor.verifyWebhookSignature` (401 on fail) → enqueue QStash `/jobs/process-webhook` `{source:'anchor', event, data}`.
- `routes/jobs.ts` `/process-webhook` anchor branch: `payment.settled` / `nip.inbound.completed` → mark collection done → order processing/completed + schedule fee-skim; `payin.received` → fetch payin, tag order; `nip.transfer.successful|failed` → payout/fee-skim status; `customer.identification.*` → update `merchant.anchorKybStatus`; `accountNumber.created` → store `merchant.anchorAccountNumber`; `document.*`. Idempotency via `WebhookLog(source_event_externalId)`.
- Sweeps: `/anchor-settle-sweep` (fee-skim pending), `/anchor-payout-sweep`. Register QStash schedules.

### Phase 6 — Orders pricing (`routes/orders.ts`)
- `isPureAnchor` gross-up branch (mirror `isPureBachs`: `sourceAmount = target/(1-feePct)`), safety-net pin, `syncOrder` anchor poll, payouts-listing handling.

### Phase 7 — Merchant onboarding (API + dashboard) — *the biggest net-new piece*
- `routes/merchant.ts`: `POST /anchor/connect` (build Anchor `BusinessCustomer` from `BusinessVerification` KYB → `triggerBusinessKYB` → on approval `createDepositAccount` → store ids), `POST /anchor/onboarding/submit` (relay/upload docs on `awaitingDocument`), `GET /anchor/status` (live KYB status). Map `BusinessVerification` → Anchor customer payload (name, BVN, registration, industry, officers w/ BVN/DOB/ownership, emails, addresses).
- Dashboard: proxy routes `app/api/merchant/anchor/{connect,status,onboarding/submit}`; `settings/page.tsx` "Naira Payments" (Anchor) card with KYB states (unverified/pending/awaitingDocument/approved/rejected) + document upload.

### Phase 8 — Widget (`apps/widget`) — republish required
- `api/client.ts`: `NextAction.screen` += `'anchor_transfer'` + payload `{ accountNumber, bankName, accountName, amount, reference, expiresAt? }`.
- `WeaveWidget.tsx`: `ScreenAnchorTransfer` — show bank + NUBAN + amount + copy buttons + "I've sent it", poll order status → success. **No SDK.** `FIAT_METHOD_DISABLED_NOTICE` stays `null`.

### Phase 9 — Dashboard peripherals
- `app/types.ts` anchor fields; `transactions/[id]` + `transactions` payout labels; `audit-log/audit-meta.ts` anchor events; `docs/page.tsx` provider row + webhook-signature (HMAC-SHA1 Base64) entry.

### Phase 9.5 — Compliance gating (go-live blocker; can run in parallel)
- **KYB category screening** — map Weave's `PRODUCT_CATEGORIES` → Anchor high-risk/prohibited (Schedule C); hard-block prohibited, flag high-risk (CSA 5.1.2 / 18.2.4).
- **Sanctions/geo screening** — screen payer/source-of-funds origin vs Anchor's prohibited jurisdictions + OFAC (Schedule D). *Scope depends on Anchor's payer-origin answer.*

### Phase 10 — Test & rollout
- Sandbox E2E: create BusinessCustomer + KYB (sandbox auto-approves), DepositAccount, reserved/virtual account, simulate inbound payin, verify webhooks, fee-skim book transfer, NIP payout. Router tests (+anchor edge). Typecheck + existing suite.
- Rollout: migrations (local → prod direct URL) · env vars · QStash schedules · register Anchor webhook endpoint (`enabledEvents`) · widget republish · flip `ANCHOR_ENABLED=true`, keep `BACHS_ENABLED=false`.

---

## Dependencies / blockers (from the Anchor conversation)
- **Anchor sandbox credentials** (`_test_` key + webhook token) to build against.
- **D3 account-structure confirmation** (redline A1) — build assumes per-merchant deposit accounts.
- **D4 book-transfer permission** (redline A3).
- **D1 Dynamic Accounts availability** — determines the collection-correlation approach.
- **Payer-origin/sanctions answer** (Schedule D) — scopes Phase 9.5.

## Suggested build order (given dependencies)
1. Phases 0–2 (flags, service client, schema) — no external blockers; can start now against sandbox.
2. Phase 7 onboarding + Phase 4/5 collection happy-path — needs sandbox creds + D1/D3.
3. Phase 8 widget + Phase 6 pricing.
4. Phase 9 peripherals + 9.5 compliance.
5. Phase 10 E2E + rollout.
