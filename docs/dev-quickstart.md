# Weave local dev quickstart

Run the full stack on `joe-dev` for payment links, cash-out, and Stellar testnet checkout.

## Prerequisites

- Node 20+, pnpm
- Docker (Postgres on host port **5434**)

## 1. Start infrastructure

```bash
cd weave
docker compose up -d
```

## 2. Database

```bash
cd apps/api
cp .env.example .env   # if needed
pnpm db:push
```

## 3. Environment highlights

| App | File | Must set |
|-----|------|----------|
| API | `apps/api/.env` | `DATABASE_URL`, `WEAVE_STELLAR_PUBLIC_KEY`, `STELLAR_NETWORK=testnet` |
| Widget | `apps/widget/.env` | `VITE_STELLAR_NETWORK=testnet`, `VITE_PAYMENT_COPY_MODE=infra` (or `dev` for Stellar-branded demos) |
| WWW demo | `apps/www/.env.local` | `NEXT_PUBLIC_API_KEY=pk_test_…` matching a merchant in DB |
| Dashboard | `apps/dashboard/.env` | `API_BASE=http://localhost:4000/api/v1` |

**Local polling without QStash:** `SKIP_QSTASH_VERIFICATION=true` in `apps/api/.env` (dev only). Stellar steps still advance via **`GET /orders/:id`**, which calls `syncOrder` and polls Horizon on each request.

## 4. Run apps

From repo root:

```bash
pnpm dev
```

- API: http://localhost:4000  
- Dashboard: http://localhost:3001  
- Marketing + demo: http://localhost:3000  

## 5. Smoke paths

1. **Demo** — http://localhost:3000/demo → widget → stablecoin wallet or crypto transfer  
2. **Payment link** — Dashboard → Payment links → `/pay/{id}`  
3. **Cash-out** — Dashboard → Payout links → `/cashout/{id}`  
4. **Stellar config** — `curl http://localhost:4000/api/v1/stellar/config`

See [stellar-e2e-checklist.md](./stellar-e2e-checklist.md) for the testnet wallet payment definition of done.
