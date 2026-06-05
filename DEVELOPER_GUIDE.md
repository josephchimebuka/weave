# Weave Developer Documentation

Weave is a universal crypto ↔ fiat checkout. Customers pay in 30+ chains or fiat; you receive funds in your chosen corridor — NGN to a bank, USDC to a wallet, etc.

You can integrate Weave in three ways. Pick the one that matches your product.

| Path | Best for | What you build |
| :--- | :--- | :--- |
| **A — Widget** | Drop-in checkout on a page you already own | One script tag, one publishable key |
| **B — Direct API** | Custom checkout UX, server-orchestrated payments | REST calls + your own UI + webhooks |
| **C — Checkout Sessions** | Stripe / Paystack-style redirect flow | `POST /checkout/sessions` → redirect → webhook |

Base URL: `https://api.paywithweave.com/api/v1`

---

## Authentication

Three header sets exist. Use the right one for the context.

| Header | Key | Where to use it |
| :--- | :--- | :--- |
| `x-api-key` | `pk_live_…` (publishable) | Browser, widget, hosted checkout page |
| `x-public-key` + `x-secret-key` | `pk_live_…` + `sk_live_…` (keypair) | Server-to-server — your backend |
| `x-session-token` | (issued at `/auth/login`) | Dashboard UI only — not for API integration |

Sandbox keys (`pk_test_…`) auto-route to sandbox mode: orders auto-complete, providers are not called, outgoing webhooks are suppressed.

---

## Path A — Widget (low-code)

The fastest path. No backend needed; just your publishable key.

```html
<div id="weave-checkout"></div>

<script src="https://unpkg.com/@weave-sdk/widget/dist/umd.js"></script>
<script>
  Weave.mount('#weave-checkout', {
    apiKey: 'pk_live_...',
    merchant: {
      name: 'Your Store Name',
      amount: 5000,
      currency: 'NGN',
    },
    onSuccess: (txn) => console.log('Paid', txn.orderId),
  });
</script>
```

React and Next.js examples are in the hosted docs at `/docs`.

---

## Path B — Direct API (custom UX)

Use this if you want to render your own payment UI. Your server orchestrates the flow.

**The flow:**

1. `POST /quotes` — optional — get an indicative rate before committing.
2. `POST /orders` — create the order; receive a `depositInstruction`.
3. Show the deposit instruction to your user in your own UI.
4. `GET /orders/:id` — poll for `status: 'completed'`, OR receive the `order.completed` webhook.

### `POST /orders` — response shape

The response contains two parallel fields:

- **`depositInstruction`** — framework-agnostic. Read this in server-to-server integrations.
- **`nextAction`** — widget-specific (carries `screen` labels). Ignore unless you're building UI on top of it.

`depositInstruction.type` is one of three values:

#### Crypto source — `type: "crypto_transfer"`
```json
{
  "type": "crypto_transfer",
  "depositAddress": "0xabc...",
  "depositMemo": null,
  "amount": 12.50,
  "token": "USDC",
  "chain": "BASE",
  "expiresAt": "2026-05-28T12:30:00Z"
}
```
Show the address (and memo, if non-null) to your user. `depositMemo` is required on XRP, TON, XLM, NEAR — funds without the memo will be lost.

#### Fiat source, bank transfer — `type: "bank_transfer"`
```json
{
  "type": "bank_transfer",
  "institution": "GTBank",
  "accountIdentifier": "0123456789",
  "accountName": "Weave / Acme Store",
  "amountToTransfer": "10500",
  "currency": "NGN",
  "expiresAt": "2026-05-28T12:30:00Z"
}
```

#### Fiat source, Paystack popup — `type: "paystack_popup"`
```json
{
  "type": "paystack_popup",
  "accessCode": "ACCESS_CODE_HERE",
  "publicKey": "pk_live_xxx",
  "amount": 10500,
  "reference": "ord_abc-0"
}
```
Drive Paystack's official popup with these.

### Listing supported assets

`GET /api/v1/assets` (no auth) returns every fiat and crypto asset Weave supports. Use the `key` field on each entry as the canonical identifier in `POST /orders` and `POST /checkout/sessions`. Fetch once on app boot and cache — the list changes rarely.

### Attaching customer identity (optional)

Weave does **not** collect or verify payer identity. If you already know who the payer is (they're logged into your product), pass it as `customer` on `POST /orders` or `POST /checkout/sessions`:

```json
{
  "customer": {
    "email": "jane@example.com",
    "name": "Jane Doe",
    "externalId": "usr_999"
  }
}
```

All three fields are optional. We treat them as opaque passthrough — never validated, never enriched, never exposed to the payer. We echo them back on the `Order`, in the `order.completed` webhook payload (`data.customer`), and on the merchant-facing receipt email. If you omit `customer`, emails fall back to your `reference` field and avoid making any claim about who paid.

### End-to-end example (Node.js)

```javascript
const HEADERS = {
  'x-public-key': 'pk_live_...',
  'x-secret-key': 'sk_live_...',
  'Content-Type': 'application/json',
};

// 1. Create the order
const res = await fetch('https://api.paywithweave.com/api/v1/orders', {
  method: 'POST',
  headers: HEADERS,
  body: JSON.stringify({
    source: { inline: { kind: 'crypto_wallet', assetKey: 'crypto:BASE:USDC', walletAddress: '0xCustomerWallet' } },
    amount: 50,
    flow: 'external',
    reference: 'order_abc123',
  }),
});

const { data: { order, depositInstruction } } = await res.json();
console.log('Send', depositInstruction.amount, depositInstruction.token, 'to', depositInstruction.depositAddress);

// 2. Poll (or wait for webhook)
async function poll() {
  const r = await fetch(`https://api.paywithweave.com/api/v1/orders/${order.id}`, { headers: HEADERS });
  const { data } = await r.json();
  if (data.status === 'completed') return data;
  if (data.status === 'failed' || data.status === 'expired') throw new Error(data.status);
  await new Promise((r) => setTimeout(r, 5000));
  return poll();
}
```

---

## Path C — Checkout Sessions (redirect flow)

Use this if you want a hosted checkout URL — like Stripe Checkout or Paystack initialize.

**The flow:**

1. Your server: `POST /checkout/sessions` with the payment params and a `redirectUrl`.
2. Redirect the user's browser to the returned `checkoutUrl`.
3. User pays on the Weave-hosted page.
4. Once the payment is **fully confirmed** (`order.status === 'completed'`), Weave redirects the user back to `redirectUrl?session_id=<id>&order_id=<id>`.
5. Your server confirms the payment via the `order.completed` webhook (do **not** rely on the redirect alone — the user could close the tab).

### `POST /checkout/sessions`

Auth: `x-api-key` (publishable) **or** `x-public-key` + `x-secret-key` keypair.

```json
{
  "amount": 5000,
  "amountIn": "dest",
  "destAsset": "fiat:NGN",
  "sourceAsset": "crypto:BASE:USDC",
  "reference": "order_abc123",
  "metadata": { "userId": "usr_999", "plan": "pro" },
  "redirectUrl": "https://yourstore.com/payment/success",
  "cancelUrl": "https://yourstore.com/cart",
  "expiresIn": 7200
}
```

Required: `amount`, `destAsset`, `redirectUrl`. `expiresIn` is in seconds (default `7200` = 2 hours, min `300`, max `86400`). `metadata` is an opaque JSON object echoed back in the webhook.

Response:
```json
{
  "success": true,
  "data": {
    "id": "clx9abc...",
    "checkoutUrl": "https://pay.paywithweave.com/checkout/clx9abc...",
    "expiresAt": "2026-05-28T14:00:00Z",
    "status": "open"
  }
}
```

### `GET /checkout/sessions/:id`

Retrieve a session and its linked order status. Returns all session fields plus `orderId` and `orderStatus` once a payment has started.

### Session lifecycle

| Status | Meaning |
| :--- | :--- |
| `open` | Created, awaiting payer |
| `processing` | User started paying; order created |
| `complete` | Payment confirmed; user redirected |
| `expired` | No deposit received within the session window |

### Important callouts

- **The redirect fires only when payment is confirmed**, not when the deposit address is shown. The hosted success screen drives the redirect.
- **Sessions expire after 2 hours by default.** Override per-session with `expiresIn`. Bounds: 5 minutes to 24 hours.
- **Always confirm via webhook.** The redirect is a UX hint — the user may close the tab before being redirected.
- **Webhook payload echoes back `sessionId` and `metadata`** so you can reconcile by your own internal IDs.

### Example (Node.js)

```javascript
// 1. Server-side: create the session and redirect
app.post('/checkout', async (req, res) => {
  const r = await fetch('https://api.paywithweave.com/api/v1/checkout/sessions', {
    method: 'POST',
    headers: { 'x-public-key': 'pk_live_...', 'x-secret-key': 'sk_live_...', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 5000,
      destAsset: 'fiat:NGN',
      redirectUrl: 'https://yourstore.com/payment/success',
      reference: 'order_abc123',
      metadata: { userId: req.user.id },
    }),
  });
  const { data } = await r.json();
  res.redirect(data.checkoutUrl);
});

// 2. Webhook handler — the source of truth
app.post('/webhooks/weave', verifyWeaveSignature, (req, res) => {
  const { event, data } = req.body;
  if (event === 'order.completed') {
    // data.sessionId and data.metadata are present when triggered via a session
    fulfillOrder(data.sessionId, data.metadata);
  }
  res.json({ received: true });
});
```

---

## Webhooks

Weave POSTs to your registered endpoint when an order changes terminal state.

### Event types
- `order.completed` — funds confirmed and delivered to your payout destination.
- `order.failed` — payment failed, expired, or refunded.

### Payload
```json
{
  "event": "order.completed",
  "data": {
    "id": "ord_abc",
    "reference": "your-internal-id",
    "status": "completed",
    "sourceAssetKey": "crypto:BASE:USDC",
    "destAssetKey": "fiat:NGN",
    "sourceAmount": 50.38,
    "destAmount": 74250,
    "createdAt": "2026-05-28T10:00:00Z",
    "sessionId": "clx9abc...",
    "metadata": { "userId": "usr_999" },
    "customer": { "email": "jane@example.com", "name": "Jane Doe", "externalId": "usr_999" }
  }
}
```

`sessionId` and `metadata` are present only when the order was triggered by a checkout session. `customer` is present whenever you passed it on `/orders` or `/checkout/sessions` — it's pure passthrough; Weave never verifies these fields.

### Signature verification

Every webhook carries:
- `X-Weave-Signature: sha256=<hex>` — HMAC-SHA256 of `${timestamp}.${rawBody}` using your webhook secret.
- `X-Weave-Timestamp: <epoch seconds>` — used in the signature and for replay protection.

```javascript
const crypto = require('crypto');

app.post('/webhooks/weave', express.raw({ type: 'application/json' }), (req, res) => {
  const header = req.headers['x-weave-signature'] ?? '';
  const ts     = req.headers['x-weave-timestamp'] ?? '';
  const sig    = header.startsWith('sha256=') ? header.slice(7) : header;

  // Replay protection — reject deliveries older than ~5 minutes
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return res.status(401).send('stale');

  const expected = crypto
    .createHmac('sha256', process.env.WEAVE_WEBHOOK_SECRET)
    .update(`${ts}.${req.body.toString()}`)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
    return res.status(401).send('invalid');
  }

  const { event, data } = JSON.parse(req.body.toString());
  // Dedupe on data.id, then handle
  res.json({ received: true });
});
```

Hash the **raw bytes** — re-serialising JSON breaks the signature.

---

## Supported Assets & Chains

| Asset | Chains |
| :--- | :--- |
| **USDC** | Arbitrum, Optimism, Base, Polygon, BSC, Avalanche, Solana, Stellar, Ethereum, NEAR, Sui, Aptos |
| **USDT** | Arbitrum, Optimism, Polygon, Avalanche, TON, BSC, Ethereum, Tron |
| **BTC** | Bitcoin (native), Base / Ethereum / Arbitrum (cbBTC) |
| **ETH** | Ethereum, Base, Optimism, Arbitrum, Scroll |
| **SOL / NEAR / TRX / TON / SUI / APT** | Native chains |

Call `GET /api/v1/assets` for the complete, machine-readable list.

---

## Security Checklist

- [ ] Never expose your secret key (`sk_live_…`) or webhook secret in client code or version control.
- [ ] Always verify `X-Weave-Signature` and reject stale timestamps in production.
- [ ] Use `pk_live_…` keys only for client-side mounting and the hosted checkout page.
- [ ] Dedupe webhook deliveries on `data.id`.
- [ ] Treat the post-checkout redirect as a UX hint only. The webhook is the source of truth.
