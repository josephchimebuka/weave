/**
 * Dry-run LI.FI Stellar → Base route for the treasury (no database, no signing).
 *
 *   PAYCREST_TEST_ADDRESS=0x... pnpm stellar:verify-lifi-route
 *
 * Optional: BRIDGE_TEST_AMOUNT=0.5 (default 0.5 USDC)
 */
import 'dotenv/config';
import { getTreasuryPublicKey, isStellarEnabled } from '../src/services/stellar.service';
import { lifi, lifiAsset, toBaseUnits } from '../src/services/lifi.service';

async function main() {
  if (!isStellarEnabled()) {
    throw new Error('WEAVE_STELLAR_PUBLIC_KEY is not set');
  }
  const toAddress = process.env.PAYCREST_TEST_ADDRESS?.trim();
  if (!toAddress || !/^0x[0-9a-fA-F]{40}$/.test(toAddress)) {
    throw new Error('Set PAYCREST_TEST_ADDRESS to a valid Base 0x address (e.g. a Paycrest deposit from a test order)');
  }
  const amount = Number(process.env.BRIDGE_TEST_AMOUNT ?? 0.5);
  const treasury = getTreasuryPublicKey();
  const meta = lifiAsset('crypto:STELLAR:USDC');
  const sacBal = await lifi.stellarSacBalance({ address: treasury, tokenContract: meta.token });
  console.log('Treasury:', treasury);
  console.log('Soroban USDC balance (base units):', sacBal.toString());
  console.log('Quote amount:', amount, 'USDC →', toAddress);

  const route = await lifi.getRoute({
    fromAssetKey: 'crypto:STELLAR:USDC',
    toAssetKey: 'crypto:BASE:USDC',
    amount,
    fromAddress: treasury,
    toAddress,
  });
  const step = route.steps[0];
  console.log('LI.FI route OK:', {
    routeId: route.id,
    tool: step.tool,
    fromAmount: step.action.fromAmount,
    toAmountMin: step.estimate.toAmountMin,
    approvalAddress: step.estimate.approvalAddress,
    skipApproval: step.estimate.skipApproval,
  });
  const need = BigInt(step.action.fromAmount);
  if (sacBal < need) {
    console.warn('WARNING: Soroban/trustline balance is below LI.FI fromAmount — bridge will refuse until treasury is funded.');
  } else {
    console.log('Treasury balance covers LI.FI fromAmount; bridge will approve (if needed) then submit LI.FI tx.');
  }
}

main().catch((err) => {
  console.error('verify failed:', err.message ?? err);
  process.exit(1);
});
