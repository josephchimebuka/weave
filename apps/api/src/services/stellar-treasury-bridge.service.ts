/**
 * After a Stellar Wallets Kit payment lands in the Weave treasury (classic USDC),
 * bridge to Paycrest's Base deposit address via LI.FI (Circle CCTP / Soroban USDC).
 *
 * NOTE: LI.FI's Stellar leg uses the Soroban USDC contract. Treasury must hold
 * enough XLM for fees; bridging may require Soroban-compatible USDC on mainnet.
 * Validate on testnet with small amounts before production.
 */

import { Keypair, TransactionBuilder, rpc } from '@stellar/stellar-sdk';
import { prisma } from '../lib/prisma';
import { getNetworkPassphrase, getTreasuryPublicKey, isTreasuryBridgeEnabled } from './stellar.service';
import { lifi, lifiAsset, LIFI_STELLAR_CHAIN_ID, type LifiStep } from './lifi.service';
import { syncOrder } from './executor.service';
import { recordServerEvent } from './order-event.service';

const SOROBAN_RPC_URL = process.env.STELLAR_SOROBAN_RPC_URL || 'https://mainnet.sorobanrpc.com';

export { isTreasuryBridgeEnabled };

async function signAndSubmitSorobanXdr(unsignedXdr: string, secret: string): Promise<string> {
  const kp = Keypair.fromSecret(secret);
  const passphrase = getNetworkPassphrase();
  const tx = TransactionBuilder.fromXDR(unsignedXdr, passphrase);
  tx.sign(kp);
  const server = new rpc.Server(SOROBAN_RPC_URL);
  const sent = await server.sendTransaction(tx);
  const hash = sent.hash ?? Buffer.from(tx.hash()).toString('hex');
  if (sent.status === 'ERROR') {
    throw new Error(`Stellar bridge tx rejected: ${JSON.stringify(sent.errorResult ?? sent)}`);
  }
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const got = await server.getTransaction(hash);
    if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) return hash;
    if (got.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Stellar bridge tx failed on-chain: ${hash}`);
    }
  }
  throw new Error('Stellar bridge tx timed out waiting for confirmation');
}

/** How far a bridge attempt got — decides whether a failure is safe to retry. */
interface BridgeProgress {
  /** The bridge transaction (the one that moves USDC) is about to be, or has been, submitted. */
  fundsMayHaveMoved: boolean;
  /** The submitted bridge's hash is saved on the step; a re-run is then a no-op. */
  bridgeRecorded: boolean;
}

async function doBridge(orderId: string, progress: BridgeProgress): Promise<{ bridgeTxHash: string }> {
  if (!isTreasuryBridgeEnabled()) {
    throw new Error('Treasury bridge is disabled (set WEAVE_STELLAR_SECRET_KEY and STELLAR_TREASURY_BRIDGE_ENABLED)');
  }
  const secret = process.env.WEAVE_STELLAR_SECRET_KEY!;
  const treasury = getTreasuryPublicKey();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { steps: { orderBy: { sequence: 'asc' } } },
  });
  if (!order) throw new Error('Order not found');

  const stellarStep = order.steps.find(s => s.provider === 'stellar' && s.status === 'done');
  const paycrestStep = order.steps.find(s => s.provider === 'paycrest' && s.status !== 'done');
  if (!stellarStep) throw new Error('No completed Stellar collection step');
  if (!paycrestStep?.depositAddress) throw new Error('No Paycrest deposit address on order');

  if (paycrestStep.status === 'failed') {
    await prisma.routeStep.update({
      where: { id: paycrestStep.id },
      data: { status: 'processing' },
    });
  }

  const amountIn = Number(stellarStep.amountIn ?? order.sourceAmount);
  if (!Number.isFinite(amountIn) || amountIn <= 0) throw new Error('Invalid Stellar amount for bridge');

  const toAddress = paycrestStep.depositAddress;
  if (!/^0x[0-9a-fA-F]{40}$/.test(toAddress)) {
    throw new Error('Paycrest deposit address is not a Base EVM address');
  }

  if (order.status === 'failed') {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'processing' } });
  }

  recordServerEvent(orderId, 'treasury.bridge.started', 'Bridging treasury USDC to Paycrest', {
    amount: amountIn,
    toAddress,
  });

  const fromMeta = lifiAsset('crypto:STELLAR:USDC');

  const route = await lifi.getRoute({
    fromAssetKey: 'crypto:STELLAR:USDC',
    toAssetKey: 'crypto:BASE:USDC',
    amount: amountIn,
    fromAddress: treasury,
    toAddress,
  });
  const lstep: LifiStep = route.steps[0];
  const need = BigInt(lstep.action.fromAmount);
  const sacBal = await lifi.stellarSacBalance({ address: treasury, tokenContract: fromMeta.token }).catch(() => 0n);
  if (sacBal < need) {
    throw new Error(
      `Treasury USDC balance (${sacBal}) is below LI.FI bridge amount (${need}). ` +
        'Confirm the Stellar payment credited the treasury trustline.',
    );
  }

  const approvalAddress = lstep.estimate.approvalAddress ?? '';

  if (approvalAddress && !lstep.estimate.skipApproval) {
    const have = await lifi.stellarAllowance({ from: treasury, spender: approvalAddress, tokenContract: fromMeta.token }).catch(() => 0n);
    if (have < need) {
      const { xdr } = await lifi.buildStellarApproveXdr({
        from: treasury,
        spender: approvalAddress,
        tokenContract: fromMeta.token,
        amountRaw: lstep.action.fromAmount,
      });
      await signAndSubmitSorobanXdr(xdr, secret);
    }
  }

  let bridgeXdr: string | null = null;
  for (let attempt = 0; attempt < 12 && !bridgeXdr; attempt++) {
    try {
      const tr = await lifi.getStepTransaction(lstep);
      bridgeXdr = tr.data;
    } catch (e: any) {
      if (/allowance/i.test(e.message ?? '') && attempt < 11) {
        await new Promise(r => setTimeout(r, 4000));
        continue;
      }
      throw e;
    }
  }
  if (!bridgeXdr) throw new Error('Could not build LI.FI bridge transaction');

  progress.fundsMayHaveMoved = true; // from here a failure is ambiguous: the tx may have landed
  const bridgeTxHash = await signAndSubmitSorobanXdr(bridgeXdr, secret);

  await prisma.routeStep.update({
    where: { id: paycrestStep.id },
    data: {
      status: 'in_flight',
      providerData: {
        ...((paycrestStep.providerData as object) ?? {}),
        treasuryBridge: { bridgeTxHash, routeId: route.id, tool: lstep.tool },
      },
    },
  });
  progress.bridgeRecorded = true;

  recordServerEvent(orderId, 'treasury.bridge.submitted', 'Treasury bridge tx submitted', { bridgeTxHash });

  const st = await lifi.getStatus({ txHash: bridgeTxHash, fromChain: LIFI_STELLAR_CHAIN_ID, toChain: 8453, bridge: lstep.tool });
  if (st.status === 'DONE') {
    recordServerEvent(orderId, 'treasury.bridge.done', 'LI.FI bridge completed', { bridgeTxHash });
  }

  await syncOrder(orderId);
  return { bridgeTxHash };
}

export type BridgeResult = {
  bridgeTxHash: string | null;
  /** Set when nothing was bridged because another run already owns, or has done, it. */
  skipped?: 'already_bridged' | 'needs_review' | 'in_progress';
};

// A Paycrest step may be claimed for bridging from these states only.
const CLAIMABLE_STATUSES = ['pending', 'awaiting_deposit'];

/**
 * Bridge an order's treasury USDC to Paycrest — at most once.
 *
 * The treasury is shared by every Stellar order, so a duplicate run does not fail
 * loudly: it spends another order's USDC. Several things can trigger a run (the
 * scheduled job, a QStash retry after an error response, the sweep, an operator), so
 * the first thing a run does is claim the Paycrest step with an atomic
 * pending → in_flight transition; whoever loses the claim backs off.
 *
 *  - Failure BEFORE the bridge transaction is submitted: nothing left the treasury, so
 *    the claim is released and a retry can run.
 *  - Failure AFTER it may have been submitted (and before its hash was saved): the
 *    outcome is unknown, so automatic retries are blocked and the order is flagged
 *    `treasury.bridge.needs_review`. An operator confirms on Stellar/LI.FI, then reruns
 *    with `force`.
 *  - Failure after the hash is saved: a re-run finds it and skips.
 *
 * `force` skips the guard — for an operator who has verified no bridge tx landed.
 */
export async function bridgeTreasuryUsdcToPaycrest(orderId: string, opts: { force?: boolean } = {}): Promise<BridgeResult> {
  if (opts.force) {
    return doBridge(orderId, { fundsMayHaveMoved: false, bridgeRecorded: false });
  }
  if (!isTreasuryBridgeEnabled()) {
    throw new Error('Treasury bridge is disabled (set WEAVE_STELLAR_SECRET_KEY and STELLAR_TREASURY_BRIDGE_ENABLED)');
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { steps: { orderBy: { sequence: 'asc' } } },
  });
  if (!order) throw new Error('Order not found');
  const paycrestStep = order.steps.find(s => s.provider === 'paycrest');
  if (!paycrestStep) throw new Error('No Paycrest step on this order');

  const prior = (paycrestStep.providerData as { treasuryBridge?: { bridgeTxHash?: string; ambiguous?: boolean } } | null)?.treasuryBridge;
  if (prior) {
    return { bridgeTxHash: prior.bridgeTxHash ?? null, skipped: prior.ambiguous ? 'needs_review' : 'already_bridged' };
  }
  // A finished order is not an error: QStash retries a job after a late failure, and by then the
  // order may have completed. Answering 200 stops the retries; throwing would keep them going.
  if (paycrestStep.status === 'done') return { bridgeTxHash: null, skipped: 'already_bridged' };

  const originalStatus = paycrestStep.status;
  const claim = await prisma.routeStep.updateMany({
    where: { id: paycrestStep.id, status: { in: CLAIMABLE_STATUSES } },
    data: { status: 'in_flight' },
  });
  if (claim.count !== 1) return { bridgeTxHash: null, skipped: 'in_progress' };

  const progress: BridgeProgress = { fundsMayHaveMoved: false, bridgeRecorded: false };
  try {
    return await doBridge(orderId, progress);
  } catch (err: any) {
    if (!progress.fundsMayHaveMoved) {
      // Nothing left the treasury: release the claim so a retry can run.
      await prisma.routeStep
        .updateMany({ where: { id: paycrestStep.id, status: 'in_flight' }, data: { status: originalStatus } })
        .catch(() => { /* leave the claim; the sweep will not pick an in_flight step */ });
    } else if (!progress.bridgeRecorded) {
      // The bridge tx may have landed but we can't tell. Block automatic retries.
      const message = String(err?.message ?? err);
      await prisma.routeStep
        .update({
          where: { id: paycrestStep.id },
          data: {
            providerData: {
              ...((paycrestStep.providerData as object) ?? {}),
              treasuryBridge: { ambiguous: true, error: message, at: new Date().toISOString() },
            },
          },
        })
        .catch(() => { /* best effort — the event below is the operator's signal */ });
      recordServerEvent(orderId, 'treasury.bridge.needs_review',
        'Bridge transaction may have been submitted but could not be confirmed; automatic retries are blocked',
        { error: message });
    }
    throw err;
  }
}

/** A processed Stellar order whose treasury bridge never started. */
const BRIDGE_SWEEP_MIN_AGE_MS = 3 * 60_000;

interface SweepOrder {
  id: string;
  steps: Array<{ sequence: number; provider: string; status: string; updatedAt: Date | string; providerData: unknown }>;
}

/**
 * Orders the bridge sweep should pick up: the Stellar deposit was confirmed more than
 * a few minutes ago (so the normal scheduled job has had its chance) and the next
 * step, Paycrest, is still untouched with no bridge recorded or claimed.
 */
export function selectStuckBridgeOrders(orders: SweepOrder[], now = Date.now()): string[] {
  const out: string[] = [];
  for (const o of orders) {
    const stellar = o.steps.find(s => s.provider === 'stellar' && s.status === 'done');
    if (!stellar) continue;
    if (now - new Date(stellar.updatedAt).getTime() < BRIDGE_SWEEP_MIN_AGE_MS) continue;
    const paycrest = o.steps.find(s => s.sequence === stellar.sequence + 1 && s.provider === 'paycrest');
    if (!paycrest || !CLAIMABLE_STATUSES.includes(paycrest.status)) continue;
    if ((paycrest.providerData as { treasuryBridge?: unknown } | null)?.treasuryBridge) continue;
    out.push(o.id);
  }
  return out;
}

export async function scheduleTreasuryBridge(orderId: string): Promise<void> {
  if (!isTreasuryBridgeEnabled()) {
    recordServerEvent(orderId, 'treasury.bridge.skipped', 'Treasury bridge disabled (no WEAVE_STELLAR_SECRET_KEY)', {});
    return;
  }

  const { qstash } = await import('../lib/qstash');
  const apiBase = process.env.API_BASE;
  if (!apiBase) {
    console.warn('[stellar-bridge] API_BASE not set — cannot schedule treasury bridge');
    recordServerEvent(orderId, 'treasury.bridge.skipped', 'API_BASE not set — bridge job was not scheduled', {});
    return;
  }
  try {
    await qstash.publishJSON({
      url: `${apiBase}/jobs/bridge-stellar-treasury`,
      body: { orderId },
      delay: 5,
    });
    recordServerEvent(orderId, 'treasury.bridge.scheduled', 'QStash bridge job scheduled', {
      url: `${apiBase}/jobs/bridge-stellar-treasury`,
    });
  } catch (err: any) {
    recordServerEvent(orderId, 'treasury.bridge.schedule_failed', 'Failed to enqueue QStash bridge job', {
      error: String(err?.message ?? err),
    });
    throw err;
  }
}
