# Stellar test transaction — local walkthrough

Complete this once to pay with Freighter testnet USDC through Weave checkout.

## Why you saw "Failed to fetch"

The browser shows **Failed to fetch** when the widget cannot reach the Weave API. Common causes:

| Cause | Fix |
|-------|-----|
| API not running | Terminal must show `Weave API listening on :4000` |
| `DATABASE_URL` still `your_db_url` | Set real Postgres URL (see Step 1) |
| Missing `NEXT_PUBLIC_API_KEY` on demo page | Create `apps/www/.env.local` (Step 4) |
| Demo amount &lt; ₦700 | Widget clicks are disabled |

Stellar Wallets Kit only opens **after** the API creates an order successfully.

---

## Step 1 — Database (required)

From repo root `weave/`:

```bash
docker compose up -d
```

Edit **`apps/api/.env`**:

```env
DATABASE_URL=postgresql://weave:weave@localhost:5432/weave
API_BASE=http://localhost:4000/api/v1
SKIP_QSTASH_VERIFICATION=true
```

Push schema:

```bash
cd apps/api
pnpm db:push
```

---

## Step 2 — Stellar treasury (you likely did this)

In **`apps/api/.env`**:

```env
STELLAR_NETWORK=testnet
WEAVE_STELLAR_PUBLIC_KEY=G...your_treasury...
WEAVE_STELLAR_SECRET_KEY=S...your_treasury_secret...
```

Trustline:

```bash
cd apps/api
pnpm stellar:setup-trustline
```

Verify:

```bash
curl http://localhost:4000/api/v1/stellar/config
# "enabled": true
```

---

## Step 3 — Merchant + API key

1. Start app: from `weave/` run `pnpm dev`
2. Open http://localhost:3001 — **sign up** a merchant account
3. Complete email verification if prompted
4. Go to **Settings** → copy **Publishable key** (`pk_test_...` or `pk_live_...`)

---

## Step 4 — Demo page env

Create **`apps/www/.env.local`**:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_API_KEY=pk_test_paste_your_key_here
```

Restart `pnpm dev` after saving.

---

## Step 5 — Freighter payer wallet (testnet)

Use your Freighter wallet (`GDXE...` or any testnet account):

1. Network: **Testnet**
2. Add asset **USDC**, issuer: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`
3. Hold some testnet USDC (swap or receive from faucet/community)

**Treasury** (in `.env`) receives USDC. **Freighter** sends USDC — they should be different accounts.

---

## Step 6 — Run test checkout

1. Open http://localhost:3000/demo
2. Amount **≥ ₦700** (e.g. 150000)
3. Payout mode: **Crypto** (fill a valid Base USDC address)
4. Click **Pay with Stellar wallet**
5. You should land on **Pay with Stellar USDC** (amount + memo)
6. **Connect Stellar wallet** → pick Freighter
7. **Pay X USDC** → confirm in Freighter (include memo!)
8. Wait ~10–30s → order completes (Horizon poll or refresh)

---

## Verify payment

```bash
# Replace ORDER_ID from widget / browser network tab
curl -s http://localhost:4000/api/v1/orders/ORDER_ID \
  -H "x-api-key: YOUR_PK_TEST_KEY"
```

Look for `"status": "completed"` and Stellar tx hash on the route step.

Stellar explorer (testnet): https://stellar.expert/explorer/testnet

---

## Quick health checks

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/v1/stellar/config
```

If quotes fail:

```bash
curl -s "http://localhost:4000/api/v1/quotes?from=crypto:STELLAR:USDC&to=fiat:NGN&amount=800&amountIn=dest" \
  -H "x-api-key: YOUR_PK_TEST_KEY"
```

Should return `"success": true`, not `Auth service error`.
