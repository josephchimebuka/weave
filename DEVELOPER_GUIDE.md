# ⚡ Weave Developer Documentation

Welcome to Weave. These docs cover how to integrate our checkout widget and use our REST API to process payments.

## 1. Quick Start (The 2-Minute Setup)
The fastest way to accept payments is using our **Hosted Widget**. You don't need a backend to start—just your `pk_live` key.

### HTML/UMD Integration
```html
<!-- 1. The container -->
<div id="weave-checkout"></div>

<!-- 2. The script -->
<script src="https://unpkg.com/@weave-sdk/widget/dist/umd.js"></script>

<!-- 3. The magic -->
<script>
  Weave.mount('#weave-checkout', {
    apiKey: 'YOUR_PUBLISHABLE_KEY',
    merchant: {
      name: 'Your Store Name',
      amount: 5000,
      currency: 'NGN' // Base currency
    }
  });
</script>
```

---

## 2. API Reference (Server-to-Server)
Use your `Secret Key` (sk_live) to perform administrative actions from your backend.

### Authentication
All API requests must include the secret key hash or the publishable key.
- `x-api-key`: Your publishable key (browser).
- `x-secret-key`: Your raw secret key (server).

### Create a Payment Link
`POST /api/v1/links`
```json
{
  "title": "Monthly Subscription",
  "amount": 100,
  "currency": "USDC",
  "description": "Pro plan access"
}
```

---

## 3. Webhooks (The Outgoing Engine)
Weave notifies your system programmatically when a payment is completed.

### Event Types
- `payment.succeeded`: Fired the moment funds are confirmed and settled to your destination.
- `payment.failed`: Fired if a transaction expires or is rejected by the provider.

### Signature Verification
To ensure that a webhook was actually sent by Weave, you MUST verify the `x-weave-signature` header. This header is an HMAC-SHA256 hash of the JSON payload, using your `webhookSecret` as the key.

**Node.js / Express Example:**
```javascript
const crypto = require('crypto');

app.post('/webhooks/weave', (req, res) => {
  const signature = req.headers['x-weave-signature'];
  const secret = process.env.WEAVE_WEBHOOK_SECRET;
  
  // 1. Calculate the expected signature
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  // 2. Perform timing-safe comparison
  if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    // 3. Process the event (e.g., release digital goods)
    console.log('Verified Payment:', req.body.data.id);
    res.status(200).send('Verified');
  } else {
    res.status(401).send('Invalid Signature');
  }
});
```

---

## 4. Supported Assets & Chains
Weave supports 30+ cross-chain assets out of the box.

| Asset | Supported Chains |
| :--- | :--- |
| **USDC** | Arbitrum, Optimism, Base, Polygon, BSC, Avalanche, Solana, Stellar, Ethereum |
| **USDT** | Arbitrum, Optimism, Polygon, Avalanche, TON, BSC, Ethereum |
| **BTC** | Bitcoin (Native), Base (cbBTC), Ethereum (cbBTC), Arbitrum (cbBTC) |
| **ETH** | Ethereum, Base, Optimism, Arbitrum, Scroll, Taiko |
| **SOL** | Solana (Native) |
| **NEAR** | NEAR (Native) |
| **STARK** | Starknet (Native) |

---

## 5. Security Checklist
- [ ] Never share your `Secret Key` (sk_live) or your `Webhook Secret` (whsec_...) with anyone.
- [ ] Always verify `x-weave-signature` in production.
- [ ] Use `pk_live` keys only for client-side mounting.
- [ ] Implement idempotency checks using the `orderId` provided in the webhook payload.
