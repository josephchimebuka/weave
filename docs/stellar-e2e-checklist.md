# Stellar testnet E2E checklist

Use this before telling the Stellar group checkout is “working” on testnet.

## Setup

- [ ] API `STELLAR_NETWORK=testnet`, treasury `WEAVE_STELLAR_PUBLIC_KEY` funded with XLM  
- [ ] Treasury USDC trustline (`pnpm stellar:setup-trustline` in `apps/api`)  
- [ ] Widget `VITE_STELLAR_NETWORK=testnet`  
- [ ] Freighter on **Testnet** with test USDC (friendbot + testnet USDC faucet)  
- [ ] Publishable key in demo or payment link matches API DB  

## Happy path (wallet pay-in)

1. Open checkout (demo, `/pay/…`, or embedded widget).  
2. Choose **Pay with stablecoin wallet** (or **Pay with Stellar wallet** in `VITE_PAYMENT_COPY_MODE=dev`).  
3. Connect Freighter → **Pay** → approve in extension.  
4. Processing screen shows steps; optional **Stellar Explorer** link after submit.  
5. Order reaches **`completed`** without manual refresh (poll via `GET /orders/:id`).  

## Verify on-chain

```bash
curl -s http://localhost:4000/api/v1/stellar/config | jq .
curl -s -H "x-api-key: pk_test_…" http://localhost:4000/api/v1/orders/ORDER_ID | jq '.data.status, .data.steps'
```

- [ ] Stellar step `status: done`  
- [ ] Step `externalId` is a tx hash viewable on [Stellar Expert testnet](https://stellar.expert/explorer/testnet)  

## Merchant dashboard

- [ ] Transaction detail → Route timeline → Stellar step ID links to explorer  

## Failure cases (manual)

- [ ] Reject in Freighter → friendly “cancelled” message  
- [ ] Pay without USDC trustline → trustline hint (not raw `op_no_trust`)  

## Notes

- QStash `poll-stellar-step` is optional in dev; **order polling** triggers Horizon via `syncOrder`.  
- Disable wallet checkout: `STELLAR_CHECKOUT_ENABLED=false` (API) and/or `VITE_STELLAR_CHECKOUT_ENABLED=false` (widget).
