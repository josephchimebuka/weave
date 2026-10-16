/**
 * One-time testnet/mainnet setup: establish USDC trustline on Weave treasury.
 * Usage: WEAVE_STELLAR_SECRET_KEY=... pnpm exec ts-node scripts/setup-stellar-treasury.ts
 */
import 'dotenv/config';
import { ensureTreasuryTrustline, publicConfig } from '../src/services/stellar.service';

async function main() {
  const result = await ensureTreasuryTrustline();
  console.log('Treasury ready:', result.publicKey);
  console.log('Config:', JSON.stringify(publicConfig(), null, 2));
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
