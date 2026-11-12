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
  mainnet: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
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

/** The treasury → Base bridge runs only with a signing key and the kill switch not thrown. */
export function isTreasuryBridgeEnabled(): boolean {
  if (process.env.STELLAR_TREASURY_BRIDGE_ENABLED === 'false') return false;
  return Boolean(process.env.WEAVE_STELLAR_SECRET_KEY);
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

/** One USDC payment into the treasury that carried an order's memo. */
export interface StellarPaymentPart {
  txHash: string;
  opId: string;
  amount: number;
  from: string;
  createdAt: string;
}

export interface MemoInspection {
  /** none: nothing seen · underpaid: some, but below the threshold · matched: at/above it. */
  status: 'none' | 'underpaid' | 'matched';
  /** Sum of every distinct USDC payment carrying the memo (top-ups accumulate). */
  total: number;
  expected: number;
  /** Threshold `total` must reach (expected × minFraction). */
  minAmount: number;
  /** Newest first. */
  payments: StellarPaymentPart[];
  /** The page cap was hit before the scan reached `since`: older payments may be unseen. */
  truncated: boolean;
}

const TX_PAGE_SIZE = 200;
// Treasury history is scanned back to the order's creation (minus slack for clock
// skew between us and Horizon). The page cap bounds work on a very busy treasury.
const SINCE_SLACK_MS = 10 * 60 * 1000;
const DEFAULT_MAX_PAGES = 5;

/**
 * Everything the treasury has received for one order memo.
 *
 * Unlike the old "latest 30 transactions" scan this walks back to `since`, so a
 * payment cannot be missed just because the treasury got busy; and it SUMS
 * payments with the memo, so a payer who tops up a short transfer (or an
 * exchange that splits one) is credited for the total instead of being ignored.
 */
export async function inspectMemoPayments(params: {
  memo: string;
  expectedAmount: number;
  /** Accept a total of at least this fraction of expected (default 99.5%). */
  minFraction?: number;
  /** Stop scanning at transactions older than this (order creation time). */
  since?: Date | string | null;
  maxPages?: number;
}): Promise<MemoInspection> {
  const treasury = getTreasuryPublicKey();
  const server = getServer();
  const issuer = getUsdcIssuer();
  const minAmount = params.expectedAmount * (params.minFraction ?? 0.995);
  const maxPages = params.maxPages ?? DEFAULT_MAX_PAGES;
  const sinceMs = params.since ? new Date(params.since).getTime() - SINCE_SLACK_MS : null;

  const payments: StellarPaymentPart[] = [];
  const seen = new Set<string>();
  let truncated = false;

  let page = await server.transactions().forAccount(treasury).order('desc').limit(TX_PAGE_SIZE).call();
  for (let pageNo = 1; ; pageNo++) {
    let reachedSince = false;
    for (const tx of page.records) {
      // Newest first, so the first transaction older than the window ends the scan.
      if (sinceMs != null && new Date(tx.created_at).getTime() < sinceMs) { reachedSince = true; break; }
      if (txMemo(tx) !== params.memo) continue;

      const ops = await server.operations().forTransaction(tx.hash).limit(200).call();
      for (const op of ops.records) {
        if (op.type !== 'payment') continue;
        const p = op as Horizon.ServerApi.PaymentOperationRecord;
        if (p.asset_type !== 'credit_alphanum4' && p.asset_type !== 'credit_alphanum12') continue;
        if (p.asset_code !== 'USDC' || p.asset_issuer !== issuer) continue;
        if (p.to !== treasury) continue;
        const amount = Number(p.amount);
        if (!Number.isFinite(amount) || amount <= 0) continue;
        const key = `${tx.hash}:${p.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        payments.push({ txHash: tx.hash, opId: String(p.id), amount, from: p.from, createdAt: tx.created_at });
      }
    }
    if (reachedSince || page.records.length < TX_PAGE_SIZE) break;
    if (pageNo >= maxPages) { truncated = true; break; }
    page = await page.next();
  }

  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  const status: MemoInspection['status'] =
    total >= minAmount && total > 0 ? 'matched' : total > 0 ? 'underpaid' : 'none';
  return { status, total, expected: params.expectedAmount, minAmount, payments, truncated };
}

/**
 * The payment that satisfies an order, or null. `amount` is the total received
 * for the memo; `txHash` is the newest payment (the one that completed it).
 */
export async function findMatchingPayment(params: {
  memo: string;
  expectedAmount: number;
  minFraction?: number;
  since?: Date | string | null;
}): Promise<StellarPaymentMatch | null> {
  const r = await inspectMemoPayments(params);
  if (r.status !== 'matched') return null;
  const latest = r.payments[0];
  return { txHash: latest.txHash, amount: r.total, from: latest.from, memo: params.memo };
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

const STELLAR_POLL_DELAY_S = Math.max(1, Math.round(Number(process.env.STELLAR_POLL_INTERVAL_MS ?? 10_000) / 1000));

/**
 * Every poll is one QStash message, and the free plan allows 1,000 a day. Payers who are
 * going to pay usually do so within a couple of minutes, so poll fast at first and back off:
 * the base interval for the first 2 min, then 30 s until 10 min, then 60 s. A deposit that
 * shows up late is still caught within a minute, but an order nobody pays costs ~50
 * messages over a 30 min window instead of ~186.
 */
const POLL_STAGES: Array<{ untilSec: number; minDelaySec: number }> = [
  { untilSec: 120, minDelaySec: 0 },
  { untilSec: 600, minDelaySec: 30 },
  { untilSec: Infinity, minDelaySec: 60 },
];

/** Seconds to wait before running poll number `attempt` (attempt 1 is scheduled at order creation). */
export function stellarPollDelaySeconds(attempt: number, baseSec = STELLAR_POLL_DELAY_S): number {
  const elapsed = stellarPollElapsedSeconds(attempt, baseSec);
  const stage = POLL_STAGES.find(st => elapsed < st.untilSec)!;
  return Math.max(baseSec, stage.minDelaySec);
}

/** Seconds from order creation until poll number `attempt` runs. */
function stellarPollElapsedSeconds(attempt: number, baseSec: number): number {
  let t = 0;
  for (let n = 1; n < attempt; n++) {
    const stage = POLL_STAGES.find(st => t < st.untilSec)!;
    t += Math.max(baseSec, stage.minDelaySec);
  }
  return t;
}

/** Number of polls needed to keep watching for `ttlMinutes`, plus a small grace tail. */
export function stellarPollMaxAttempts(ttlMinutes: number, baseSec = STELLAR_POLL_DELAY_S): number {
  const windowSec = ttlMinutes * 60;
  let n = 1;
  while (stellarPollElapsedSeconds(n, baseSec) < windowSec) n++;
  return n + 6;
}

/**
 * How long a treasury deposit address stays open for payment. 30 min suits a
 * wallet; an exchange withdrawal can take longer, so it is configurable
 * (5 min – 24 h). The poll window below is derived from it so the order never
 * expires while nothing is still watching for the payment.
 */
export function stellarDepositTtlMinutes(): number {
  const n = Number(process.env.STELLAR_DEPOSIT_TTL_MINUTES ?? 30);
  return Number.isFinite(n) && n >= 5 && n <= 24 * 60 ? n : 30;
}
/**
 * How long the per-order QStash poll chain runs (default 5 min). After that the treasury
 * sweep keeps watching for the rest of the deposit window, in one pass for every open
 * order, so an abandoned order stops costing a message per poll.
 */
export function stellarPollChainMinutes(): number {
  const n = Number(process.env.STELLAR_POLL_CHAIN_MINUTES ?? 5);
  return Number.isFinite(n) && n >= 1 && n <= stellarDepositTtlMinutes() ? n : Math.min(5, stellarDepositTtlMinutes());
}
const STELLAR_POLL_MAX_ATTEMPTS = stellarPollMaxAttempts(stellarPollChainMinutes());

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
      delay: stellarPollDelaySeconds(params.attempt),
    });
  } catch (err: any) {
    console.warn('[stellar] failed to schedule poll:', err.message);
  }
}

export { STELLAR_POLL_MAX_ATTEMPTS };
