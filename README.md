# Weave 🛰️

**The Universal Checkout Layer for the Global Economy.**

Weave is a high-performance payment orchestration platform designed to bridge the gap between traditional fiat rails and the decentralized economy. It allows merchants to accept payments from **any chain, any token, or any bank account** and settle directly into their preferred currency — whether that's USDC on Base or Naira in a local bank.

**Live product:** [paywithweave.com](https://paywithweave.com) · **Docs:** [docs.paywithweave.com](https://docs.paywithweave.com) · **Demo:** [paywithweave.com/demo](https://paywithweave.com/demo)

---

## 🚀 Key Value Proposition

- **Universal Input**: Customers can pay with anything (EVM, Solana, Fiat Bank Transfers).
- **Settlement Choice**: Merchants receive funds exactly where they want them (Fiat or Crypto).
- **Atomic Chaining**: Our routing engine chains onramps and offramps together at the protocol level. Bank-led corridors settle in **30s – 2mins**, while crypto-native paths are virtually instant.
- **Enterprise KYB Pipeline**: A full-featured business verification workflow with document collection and secure admin magic-link approval.
- **Payment Links**: Instantly create reusable, high-fidelity checkout pages for products or services.
- **Developer-First**: A premium, drop-in widget for React/Next.js and a simple UMD bundle for vanilla HTML/JS.

---

## 📦 Project Structure

Weave is built as a highly performant monorepo using **pnpm** and **Turborepo**:

- `apps/widget`: The merchant-facing checkout UI (Vite + React). High-fidelity official branding for 30+ assets.
- `apps/dashboard`: The command center for revenue tracking, **KYB management**, **Payment Links**, and support (Next.js 15).
- `apps/api`: The orchestration engine, router, and provider integrations (Node.js + Prisma).
- `packages/shared`: Common types and validation logic.

---

## 🔥 Key Features (v1.0-beta)

- **Universal Stablecoin Coverage**: 100% USDT/USDC coverage across Arbitrum, Optimism, Base, Polygon, BSC, Avalanche, Solana, and TON.
- **Rapid Bank Settlement**: High-speed offramps to Naira (NGN) and beyond with 30-second target SLAs.
- **Institutional Assets**: Native BTC and wrapped cbBTC support on primary EVM layers.
- **Automated Verification**: Integrated KYB and support systems with email routing and secure admin controls.
- **Atomic Webhook Engine**: Cryptographically signed merchant notifications with BullMQ-backed retry logic.

---

## 🛠️ Technology Stack

- **Runtime**: Node.js & Next.js
- **Database**: PostgreSQL (Prisma ORM)
- **Caching/Queuing**: Redis & BullMQ
- **Infrastructure**: Resend (Email), Paycrest (Fiat), NEAR Intents (Cross-chain).
- **Styling**: Tailored Vanilla CSS for the widget, Tailwind for the dashboard.

---

## 🚦 Internal Quickstart

### Prerequisites
- Node.js 18+ & pnpm
- A running PostgreSQL instance
- A running Redis instance

### Installation
```bash
pnpm install
```

### Environment Setup
1. Copy `.env.example` in `apps/api` and `apps/dashboard` to `.env`.
2. Configure your `DATABASE_URL` and `RESEND_API_KEY`.

### Running Development
```bash
pnpm dev
```

### Stellar checkout (Priority 1 — testnet)

See [`docs/stellar-integration.md`](docs/stellar-integration.md) for full setup. Quick start:

1. Set treasury keys in `apps/api/.env` (`WEAVE_STELLAR_PUBLIC_KEY`, `WEAVE_STELLAR_SECRET_KEY`).
2. Fund testnet account and establish USDC trustline (Circle testnet issuer).
3. Set `VITE_STELLAR_NETWORK=testnet` in `apps/widget/.env`.
4. Run `pnpm dev` — checkout shows **Pay with Stellar wallet** alongside bank and crypto options.

---

## 🛡️ Security & Architecture

Weave uses a **Non-Custodial Orchestration** model. For cross-chain and fiat-to-crypto routes, we utilize **Forward-Binding**:
1. We create a payout intent first to secure a destination address.
2. We then create a collection intent that delivers directly to that destination.
3. Funds never touch a Weave-owned hot wallet, reducing gas costs and eliminating platform risk.

---

## 📄 Documentation

- **[Deployment Guide](DEPLOYMENT.md)**: How to go live on production infrastructure.
- **[Developer Integration Guide](DEVELOPER_GUIDE.md)**: How to integrate the widget into your application.
- **[NEAR Intents in Weave](docs/near-intents-in-weave.md)**: Cross-chain checkout via NEAR Intents (`flow: "external"`).
- **[Stellar integration](docs/stellar-integration.md)**: Stellar USDC wallet checkout (`flow: "stellar"`).
- **[HACKATHON.md](HACKATHON.md)**: Pointers for [NEAR HACKATHON](https://nearhackathon.com) judges.

---

## NEAR HACKATHON (Nov 2026)

Built for **[NEAR HACKATHON: Build Beyond Boundaries](https://nearhackathon.com)**. Weave is **production software** (merchant dashboard, API, widget, payment links, cash-out). **NEAR Intents** powers cross-chain pay-ins; **Stellar** powers native USDC wallet checkout — both on the same orchestration layer.

### Baseline vs hackathon window

| | Scope |
| --- | --- |
| **Baseline (before Nov 2026)** | NEAR Intents client, routing (`nearintents` steps), executor polling, widget/API `flow: "external"`, Stellar treasury checkout, Paycrest fiat settlement. |
| **Hackathon (Nov 2026)** | Judge-ready README, [HACKATHON.md](HACKATHON.md), [docs/near-intents-in-weave.md](docs/near-intents-in-weave.md), public docs page `/near-intents`, MIT [LICENSE](LICENSE). |

### NEAR technologies used

- **[NEAR Intents](https://docs.near-intents.org/)** — 1Click quotes, deposit addresses, status polling (`apps/api/src/services/nearintents.service.ts`).
- **Stellar (parallel rail)** — Circle USDC, Horizon, treasury — see [`docs/stellar-integration.md`](docs/stellar-integration.md) (SCF / Stellar track; not superseded by NEAR).

### Judge steps (do X → see Y)

Prerequisites: `pk_test_…` publishable key from the Weave dashboard (Developer → API keys). Base URL: `https://api.paywithweave.com/api/v1` (or local API if self-hosting).

1. **Quote** — Run `GET /quotes?from=crypto:BASE:USDC&to=fiat:NGN&amount=50` with header `x-api-key: pk_test_…`.  
   **See:** `success: true` and a `route.steps` entry that includes cross-chain providers (e.g. nearintents).

2. **Create order** — `POST /orders` with `flow: "external"`, crypto source, and `refundAddress` (see [docs/near-intents-in-weave.md](docs/near-intents-in-weave.md)).  
   **See:** `depositInstruction` or `nextAction` with amount and deposit target; order `status` `awaiting_deposit` (live) or quick completion (sandbox).

3. **Poll** — `GET /orders/:id` with the same key.  
   **See:** For **sandbox**, `status` → `completed` without sending funds. For **live**, step `nearintents` progresses after deposit.

4. **Hosted demo** — Open [paywithweave.com/demo](https://paywithweave.com/demo), complete a checkout flow.  
   **See:** Payment UI and success state (use test keys on sandbox merchants where applicable).

Detailed curls: [docs/near-intents-in-weave.md](docs/near-intents-in-weave.md).

---

<div align="center">
  Built with ❤️ by Dewdrop Labs.
</div>
