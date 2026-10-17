/**
 * Run the same logic as POST /api/v1/jobs/bridge-stellar-treasury (no QStash).
 *
 * Usage (production recovery — use prod DATABASE_URL + WEAVE_STELLAR_SECRET_KEY):
 *   ORDER_ID=f9a38669-5066-48ac-b164-ec851601fb3b pnpm stellar:retry-bridge
 *
 * Local dev: ORDER_ID=... from a local test checkout, API on mainnet Stellar vars if bridging live.
 */
import 'dotenv/config';
import { bridgeTreasuryUsdcToPaycrest } from '../src/services/stellar-treasury-bridge.service';

async function main() {
  const db = process.env.DATABASE_URL ?? '';
  if (!db || /localhost|127\.0\.0\.1/.test(db)) {
    console.error(
      'DATABASE_URL must point at production Neon (copy from Vercel weave-api → DATABASE_URL).\n' +
        'Local docker URL cannot see your live order.',
    );
    process.exit(1);
  }
  const orderId = process.env.ORDER_ID?.trim();
  if (!orderId) {
    console.error('Set ORDER_ID to the stuck order uuid');
    process.exit(1);
  }
  const result = await bridgeTreasuryUsdcToPaycrest(orderId);
  console.log('Bridge result:', result);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
