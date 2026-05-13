# @weave-sdk/widget

Accept any currency, settle anywhere. Drop-in payment widget that routes crypto across 30+ chains and settles in NGN or your preferred asset.

## Features

- **Universal Payment Orchestration** — Customers pay in 30+ chains or fiat; you receive NGN to bank or crypto to wallet
- **Automatic Routing** — Multi-hop settlement via ChainRails, NEAR Intents, and Paycrest
- **Multiple Payment Methods** — Crypto wallets (self/external), bank transfers, stablecoin swaps
- **Customizable** — Organic/minimal themes, accent colors, corner radius — zero-code styling
- **Real-Time Exchange Rates** — Live pricing on every quote
- **Webhook Signatures** — HMAC-SHA256 verified async notifications
- **Framework Support** — React, Next.js, vanilla HTML/JS

## Installation

```bash
npm install @weave-sdk/widget
# or
pnpm add @weave-sdk/widget
# or
yarn add @weave-sdk/widget
```

The widget is distributed as a single package with built-in styles.

## Quick Start

### React

```tsx
import { WeaveCheckout } from '@weave-sdk/widget';

export default function CheckoutPage() {
  return (
    <WeaveCheckout
      apiKey="pk_live_your_api_key"
      theme="organic"
      accentColor="#3D6B50"
      borderRadius={16}
      merchant={{
        name: 'Acme Store',
        amount: 5000,
        currency: 'NGN',
        description: 'Order #1042',
      }}
      onSuccess={(txn) => console.log('Paid', txn.orderId)}
      onError={(err) => console.error(err.message)}
      onClose={() => console.log('closed')}
    />
  );
}
```

### Next.js (App Router)

```tsx
'use client';
// The widget uses window + wallet APIs — must be client-only.
import dynamic from 'next/dynamic';

const WeaveCheckout = dynamic(
  () => import('@weave-sdk/widget').then(m => m.WeaveCheckout),
  { ssr: false }
);

export default function CheckoutPage() {
  return (
    <WeaveCheckout
      apiKey="pk_live_..."
      theme="organic"
      accentColor="#3D6B50"
      borderRadius={16}
      merchant={{ name: 'Acme Store', amount: 5000, currency: 'NGN' }}
      onSuccess={(txn) => console.log('paid', txn.orderId)}
      onError={(err) => console.error(err.message)}
      onClose={() => router.back()}
    />
  );
}
```

### HTML / Vanilla JavaScript

```html
<div id="weave-checkout"></div>

<script src="https://unpkg.com/@weave-sdk/widget/dist/umd.js"></script>
<script>
  Weave.mount('#weave-checkout', {
    apiKey:       'pk_live_...',
    theme:        'organic',
    accentColor:  '#3D6B50',
    borderRadius: 16,
    merchant: {
      name:        'Acme Store',
      amount:      5000,
      currency:    'NGN',
      description: 'Order #1042',
    },
    onSuccess: (txn) => console.log('Paid', txn.orderId),
    onError:   (err) => console.error(err.message),
    onClose:   ()    => console.log('closed'),
  });
</script>
```

## Widget Props

### Required

#### `merchant`
Payment context object.

```typescript
merchant: {
  name:        string;      // Business/store name
  amount:      number;      // Payment amount
  currency:    string;      // Settlement currency (e.g. 'NGN')
  description?: string;     // Order description
  amountIn?:   'source' | 'dest'; // 'source' = exact deposit, 'dest' = exact payout
  sourceAssetKey?: string;  // Lock to asset, e.g. 'crypto:ETHEREUM:USDC'
  destAssetKey?:   string;  // Lock payout to asset, e.g. 'fiat:NGN'
  destInstrument?: any;     // Explicit payout instrument
}
```

### Optional

#### `apiKey`
Publishable API key (`pk_live_...` or `pk_test_...`). Falls back to `window.__WEAVE_API_KEY__` or `VITE_WEAVE_PUBLIC_KEY` env var.

Type: `string`

#### `theme`
Visual theme. Default: `'organic'`

- `'organic'` — Soft curves, warm palette
- `'minimal'` — Flat, minimal

Type: `'organic' | 'minimal'`

#### `accentColor`
Brand accent color. Can be a named color or hex code.

Type: `string` — e.g. `'#3D6B50'` or `'forest'` or `'tan'`

#### `borderRadius`
Corner radius of the widget frame in pixels. Default: `16`

Type: `number`

#### `userAddress`
Pre-fill a customer wallet address (for crypto sources).

Type: `string`

#### `apiBase`
Override the API base URL (for proxying or local testing).

Type: `string`

#### `onSuccess`
Callback when the order reaches `completed` status.

Type: `(txn: { orderId: string; status: string; }) => void`

#### `onError`
Callback on unrecoverable errors.

Type: `(err: Error) => void`

#### `onClose`
Callback when the user dismisses without completing.

Type: `() => void`

## Settlement Corridors

Weave automatically routes through the optimal provider based on source and destination assets.

| Provider | Route | Flow | Settlement Time |
|----------|-------|------|------------------|
| **Paystack** | `fiat:NGN → fiat:NGN` | external | T+1 business day (bank transfer) |
| **Paycrest** | `crypto:BASE:USDC ↔ fiat:NGN` | automatic | 30s – 2min |
| **NEAR Intents** | 30+ chains `→ crypto:BASE:USDC` | external | 30 – 90s |
| **ChainRails** | EVM chains `→ crypto:BASE:USDC` | self | ~60s |

### Payment Flows

- **`external`** — Deposit address generated. Customer sends from any wallet.
- **`self`** — Connected EVM wallet flow. Customer signs transaction directly.
- **`automatic`** — Provider-determined (usually for terminal-stage hops like crypto → fiat).

## Styling

Styles are automatically included when you import the component. Override with CSS:

```css
:root {
  --weave-accent: #3D6B50;
  --weave-radius: 16px;
  --weave-font: 'Inter', sans-serif;
  --weave-bg: #ffffff;
  --weave-text: #000000;
}
```

## Testing

Use sandbox mode with `pk_test_...` keys:

```tsx
<WeaveCheckout
  apiKey="pk_test_your_test_key"
  merchant={{ name: 'Test Store', amount: 100, currency: 'NGN' }}
/>
```

**Sandbox behavior:**
- Orders auto-complete instantly
- No real provider calls
- Webhooks suppressed
- Excluded from revenue metrics

## Supported Assets

### Source Assets (What Customers Pay With)

| Asset | Chains | Min |
|-------|--------|-----|
| SOL | Solana | 0.01 |
| ETH | Ethereum, Arbitrum, Base | 0.001 |
| USDC | Solana, Ethereum, Arbitrum, Base | 1 |
| USDT | Ethereum, Arbitrum, Base | 1 |
| NGN (fiat) | Nigeria (bank) | 100 |

### Destination Assets (What You Receive)

| Asset | Type | Min Settlement |
|-------|------|-----------------|
| NGN | Fiat (bank) | 1,000 |
| USDC | Crypto (Base) | 1 |
| SOL | Crypto (Solana) | 0.01 |
| ETH | Crypto (Ethereum) | 0.001 |

## API Keys

Every request must include an `x-api-key` header.

### Publishable Keys (`pk_live_…` or `pk_test_…`)

Safe for browser/client code. Used in the widget.

- Create orders
- Fetch quotes
- Never grants account read access

### Secret Keys (`sk_live_…`)

Server-side only. Never expose in client code, logs, or version control.

```bash
# Example: server-to-server API call
curl https://api.paywithweave.com/api/v1/orders/:id \
  -H "x-public-key: pk_live_..." \
  -H "x-secret-key: sk_live_..."
```

## Webhooks

Configure your webhook endpoint in **Settings → Developer → Webhooks**.

### Events

- `order.completed` — All route steps settled. Funds delivered to your payout destination.
- `order.failed` — Payment failed, expired, or refunded. No funds moved.

### Payload

```json
{
  "event": "order.completed",
  "data": {
    "id":             "clxq8a4...",
    "reference":      "your-internal-id",
    "status":         "completed",
    "sourceAssetKey": "crypto:ETHEREUM:USDC",
    "destAssetKey":   "fiat:NGN",
    "sourceAmount":   50.38,
    "destAmount":     74250,
    "createdAt":      "2026-05-01T10:00:00.000Z"
  }
}
```

### Signature Verification

Verify the `X-Weave-Signature` header (HMAC-SHA256 over `{timestamp}.{rawBody}`).

```typescript
import crypto from 'crypto';

const signature = req.headers['x-weave-signature'];
const timestamp = req.headers['x-weave-timestamp'];
const sig = signature.startsWith('sha256=') ? signature.slice(7) : signature;

const expected = crypto
  .createHmac('sha256', process.env.WEAVE_WEBHOOK_SECRET)
  .update(`${timestamp}.${req.rawBody.toString()}`)
  .digest('hex');

if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) {
  return res.status(401).send('Invalid signature');
}

// Process webhook
const { event, data } = JSON.parse(req.body);
if (event === 'order.completed') {
  await fulfillOrder(data.id);  // dedupe on data.id
}

res.json({ received: true });
```

**Best practices:**
1. Always verify signatures before processing
2. Hash the **raw body bytes** (not re-stringified JSON)
3. Strip the `sha256=` prefix before comparing
4. Reject deliveries older than ~5 minutes (check `X-Weave-Timestamp`)
5. Dedupe on `data.id` — handle duplicate webhooks gracefully

## API Reference

### `GET /quotes`

Get a live exchange rate and fee breakdown for any asset pair.

```bash
curl "https://api.paywithweave.com/api/v1/quotes?from=crypto:ETHEREUM:USDC&to=fiat:NGN&amount=50" \
  -H "x-api-key: pk_live_..."
```

**Query Parameters:**
- `from` (required) — Source asset key
- `to` (required) — Destination asset key
- `amount` (required) — Amount in source units
- `amountIn` (optional) — `'source'` or `'dest'`. Default: `'source'`

### `POST /orders`

Create a payment order.

```bash
curl https://api.paywithweave.com/api/v1/orders \
  -X POST -H "x-api-key: pk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "source": {
      "inline": {
        "kind":          "crypto_wallet",
        "assetKey":      "crypto:ETHEREUM:USDC",
        "walletAddress": "0xCustomer..."
      }
    },
    "amount":        50,
    "flow":          "external",
    "refundAddress": "0xCustomer..."
  }'
```

**Body Fields:**
- `source.inline.kind` (required) — `'crypto_wallet'` or `'bank_account'`
- `source.inline.assetKey` (required) — Source asset
- `source.inline.walletAddress` (optional) — Wallet address (for crypto)
- `amount` (required) — Payment amount
- `amountIn` (optional) — `'source'` or `'dest'`
- `flow` (optional) — `'external'` or `'self'`
- `refundAddress` (optional) — Refund wallet
- `reference` (optional) — Your unique ID (for idempotency)
- `dest` (optional) — Override payout destination

### `GET /orders/:id`

Fetch a single order. Triggers a live sync from the active provider.

```bash
curl https://api.paywithweave.com/api/v1/orders/ord_abc123 \
  -H "x-api-key: pk_live_..."
```

### `GET /orders`

List your last 50 orders (newest first).

```bash
curl https://api.paywithweave.com/api/v1/orders \
  -H "x-api-key: pk_live_..."
```

### `GET /institutions`

List supported banks for a currency (for onramp flows).

```bash
curl "https://api.paywithweave.com/api/v1/institutions?currency=NGN" \
  -H "x-api-key: pk_live_..."
```

## Order Statuses

- **`awaiting_deposit`** — Created. Waiting for customer to send funds.
- **`processing`** — Deposit detected. Bridge/settlement in progress.
- **`completed`** — Funds delivered to your payout destination.
- **`failed`** — Payment failed or expired. No funds moved.
- **`expired`** — No deposit received within the session window.

## Troubleshooting

### Widget won't load

- Verify your API key is valid
- Check that CORS is configured for your domain
- Ensure JavaScript is enabled
- Check browser console (`F12`) for errors

### Payment fails

- Confirm destination address is valid
- Verify merchant currency is supported
- Check customer has sufficient balance
- Try on a different network

### INSUFFICIENT_BALANCE

- Account for network fees
- Verify balance is on the correct network
- Confirm customer selected the correct wallet

### Network errors

- Check internet connection
- Verify destination network is not congested
- Wait and retry
- Check [Status](https://status.paywithweave.com) for incidents

### Webhook not received

- Verify webhook URL in Settings
- Confirm server is accessible from the internet
- Check firewall allows inbound HTTPS
- View webhook logs in Settings → Developer

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Required APIs:
- Fetch
- LocalStorage
- postMessage (iframe)
- Web Crypto API

## TypeScript Support

Full type definitions included:

```tsx
import { WeaveCheckout } from '@weave-sdk/widget';
import type { Transaction, MerchantConfig } from '@weave-sdk/widget';
```

## Security

- All communication over HTTPS
- Webhook signatures via HMAC-SHA256
- API keys scoped by context (publishable vs. secret)
- Sandbox traffic isolated from live
- No credit card processing
- Provider webhooks verified before state mutation

## License

Proprietary. All rights reserved.

## Support

- **Email:** admin@dewdroplabs.com
- **Docs:** https://app.paywithweave.com/docs
