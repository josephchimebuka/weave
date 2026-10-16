// Stellar treasury collection — Priority 1 direct USDC payments on Stellar.
// Customer wallet → Weave treasury; Horizon polling matches amount + memo to order.

import {
  Asset,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

export type StellarNetwork = 'testnet' | 'mainnet';

const USDC_ISSUERS: Record<StellarNetwork, string> = {
  testnet: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  mainnet: 'GA5ZSEJYB37JRC5EAAOKU5YDTYNNAMDR2EMH5QAFB5S64XAHQXHUM5N',
};

const HORIZON_URLS: Record<StellarNetwork, string> = {
  testnet: 'https://horizon-testnet.stellar.org',
  mainnet: 'https://horizon.stellar.org',
};

const NETWORK_PASSPHRASES: Record<StellarNetwork, string> = {
  testnet: Networks.TESTNET,
  mainnet: Networks.PUBLIC,
};

export function getStellarNetwork(): StellarNetwork {
  const n = (process.env.STELLAR_NETWORK ?? 'testnet').toLowerCase();
  return n === 'mainnet' ? 'mainnet' : 'testnet';
}

export function isStellarEnabled(): boolean {
  return Boolean(process.env.WEAVE_STELLAR_PUBLIC_KEY);
}

/** When false, checkout UIs should hide Stellar wallet pay-in (treasury may still exist). */
export function isStellarCheckoutEnabled(): boolean {
  const flag = process.env.STELLAR_CHECKOUT_ENABLED;
  if (flag === 'false' || flag === '0') return false;
  return isStellarEnabled();
}

export function getHorizonUrl(): string {
  return process.env.STELLAR_HORIZON_URL ?? HORIZON_URLS[getStellarNetwork()];
}

export function getNetworkPassphrase(): string {
  return NETWORK_PASSPHRASES[getStellarNetwork()];
}

export function getUsdcIssuer(): string {
  const fromEnv = process.env.STELLAR_USDC_ISSUER?.trim();
  if (fromEnv) return fromEnv;
  return USDC_ISSUERS[getStellarNetwork()];
}

export function getTreasuryPublicKey(): string {
  const pk = process.env.WEAVE_STELLAR_PUBLIC_KEY;
  if (!pk) throw new Error('WEAVE_STELLAR_PUBLIC_KEY is not configured');
  return pk;
}

/** Stellar MEMO_TEXT max length is 28 bytes. */
export function paymentMemoForOrder(orderId: string): string {
  const compact = orderId.replace(/-/g, '').slice(0, 28);
  return compact;
}

export function getUsdcAsset(): Asset {
  return new Asset('USDC', getUsdcIssuer());
}

function getServer(): Horizon.Server {
  return new Horizon.Server(getHorizonUrl());
}

export interface StellarPaymentMatch {
  txHash: string;
  amount: number;
  from: string;
  memo: string;
}

/** Poll Horizon for an incoming USDC payment to treasury matching memo + amount. */
export async function findMatchingPayment(params: {
  memo: string;
  expectedAmount: number;
  /** Accept payments at least this fraction of expected (default 99.5%). */
  minFraction?: number;
  lookbackTxs?: number;
}): Promise<StellarPaymentMatch | null> {
  const treasury = getTreasuryPublicKey();
  const server = getServer();
  const issuer = getUsdcIssuer();
  const minFraction = params.minFraction ?? 0.995;
  const minAmount = params.expectedAmount * minFraction;

  const txs = await server
    .transactions()
    .forAccount(treasury)
    .order('desc')
    .limit(params.lookbackTxs ?? 30)
    .call();

  for (const tx of txs.records) {
    const memo = txMemo(tx);
    if (memo !== params.memo) continue;

    const ops = await server.operations().forTransaction(tx.hash).call();
    for (const op of ops.records) {
      if (op.type !== 'payment') continue;
      const p = op as Horizon.ServerApi.PaymentOperationRecord;
      if (p.asset_type !== 'credit_alphanum4' && p.asset_type !== 'credit_alphanum12') continue;
      if (p.asset_code !== 'USDC' || p.asset_issuer !== issuer) continue;
      if (p.to !== treasury) continue;

      const amount = Number(p.amount);
      if (!Number.isFinite(amount) || amount < minAmount) continue;

      return { txHash: tx.hash, amount, from: p.from, memo };
    }
  }

  return null;
}

function txMemo(tx: Horizon.ServerApi.TransactionRecord): string | null {
  if (!tx.memo_type || tx.memo_type === 'none') return null;
  return String(tx.memo ?? '');
}

/** Ensure treasury account exists and has USDC trustline (run once at setup). */
export async function ensureTreasuryTrustline(): Promise<{ publicKey: string; funded: boolean }> {
  const secret = process.env.WEAVE_STELLAR_SECRET_KEY;
  if (!secret) throw new Error('WEAVE_STELLAR_SECRET_KEY required for trustline setup');

  const kp = Keypair.fromSecret(secret);
  const server = getServer();
  const account = await server.loadAccount(kp.publicKey());
  const usdc = getUsdcAsset();

  const hasTrustline = account.balances.some((b) => {
    if (b.asset_type !== 'credit_alphanum4' && b.asset_type !== 'credit_alphanum12') return false;
    return b.asset_code === 'USDC' && b.asset_issuer === getUsdcIssuer();
  });

  if (!hasTrustline) {
    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(Operation.changeTrust({ asset: usdc }))
      .setTimeout(30)
      .build();
    tx.sign(kp);
    await server.submitTransaction(tx);
  }

  return { publicKey: kp.publicKey(), funded: true };
}

export function publicConfig() {
  const network = getStellarNetwork();
  return {
    enabled: isStellarEnabled(),
    checkoutEnabled: isStellarCheckoutEnabled(),
    network,
    horizonUrl: getHorizonUrl(),
    networkPassphrase: getNetworkPassphrase(),
    treasuryPublicKey: process.env.WEAVE_STELLAR_PUBLIC_KEY ?? null,
    usdcIssuer: getUsdcIssuer(),
    usdcAssetCode: 'USDC',
  };
}

/** Whether the treasury account exists on the active network and can receive USDC. */
export async function getTreasuryReadiness(): Promise<{
  accountExists: boolean;
  usdcTrustline: boolean;
  ready: boolean;
}> {
  if (!isStellarEnabled()) {
    return { accountExists: false, usdcTrustline: false, ready: false };
  }
  try {
    const treasury = getTreasuryPublicKey();
    const account = await getServer().loadAccount(treasury);
    const issuer = getUsdcIssuer();
    const usdcTrustline = account.balances.some((b) => {
      if (b.asset_type !== 'credit_alphanum4' && b.asset_type !== 'credit_alphanum12') return false;
      return b.asset_code === 'USDC' && b.asset_issuer === issuer;
    });
    return { accountExists: true, usdcTrustline, ready: usdcTrustline };
  } catch (e: any) {
    const detail = String(e?.response?.data?.detail ?? e?.message ?? '').toLowerCase();
    if (detail.includes('not found') || e?.response?.status === 404) {
      return { accountExists: false, usdcTrustline: false, ready: false };
    }
    return { accountExists: false, usdcTrustline: false, ready: false };
  }
}

export async function publicConfigWithTreasuryStatus() {
  const base = publicConfig();
  const treasury = await getTreasuryReadiness();
  return {
    ...base,
    treasuryAccountExists: treasury.accountExists,
    treasuryUsdcTrustline: treasury.usdcTrustline,
    treasuryReady: treasury.ready,
  };
}

const STELLAR_POLL_DELAY_S = Math.round(Number(process.env.STELLAR_POLL_INTERVAL_MS ?? 10_000) / 1000);
const STELLAR_POLL_MAX_ATTEMPTS = 180; // ~30 min at 10s

export async function scheduleStellarPoll(params: {
  orderId: string;
  memo: string;
  expectedAmount: number;
  attempt: number;
}): Promise<void> {
  if (params.attempt > STELLAR_POLL_MAX_ATTEMPTS) return;

  const { qstash } = await import('../lib/qstash');
  const apiBase = process.env.API_BASE;
  if (!apiBase) {
    console.warn('[stellar] API_BASE not set — cannot schedule poll');
    return;
  }

  try {
    await qstash.publishJSON({
      url: `${apiBase}/jobs/poll-stellar-step`,
      body: params,
      delay: STELLAR_POLL_DELAY_S,
    });
  } catch (err: any) {
    console.warn('[stellar] failed to schedule poll:', err.message);
  }
}

export { STELLAR_POLL_MAX_ATTEMPTS };
