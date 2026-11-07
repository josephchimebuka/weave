# NEAR HACKATHON — Weave

Official event instructions: **[nearhackathon.com/HACKATHON.md](https://nearhackathon.com/HACKATHON.md)** (read the live file before submitting).

## Project

- **Name:** Weave  
- **Live:** [paywithweave.com](https://paywithweave.com) · [docs.paywithweave.com](https://docs.paywithweave.com) · [demo](https://paywithweave.com/demo)  
- **NEAR integration:** [NEAR Intents](https://docs.near-intents.org/) cross-chain execution on `flow: "external"` (see repo `docs/near-intents-in-weave.md`).  
- **Stellar integration:** Separate native USDC wallet rail — `docs/stellar-integration.md` (not replaced by NEAR).

## Try it (judges)

Full steps are in the root **[README.md](./README.md)** section **NEAR HACKATHON (Nov 2026)**.

Summary:

1. Obtain `pk_test_…` from the Weave merchant dashboard (Developer tab).  
2. `GET /quotes` with `from=crypto:BASE:USDC&to=fiat:NGN`.  
3. `POST /orders` with `flow: "external"`.  
4. `GET /orders/:id` — sandbox orders should reach `completed`.  
5. Optional: run live demo at [paywithweave.com/demo](https://paywithweave.com/demo).

## Submission

- Public repository required by **2026-11-14T23:59:00Z** UTC.  
- Public demo post on X with video, `@NEARProtocol` and `#NEARHackathon`.  
- One submission per repository — [request-changes](https://nearhackathon.com/request-changes) for fixes.
