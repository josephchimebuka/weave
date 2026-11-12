// LI.FI (li.quest) — cross-chain routing used for the Stellar → Base USDC hop
// of the Pollar corridor (Circle CCTP under the hood). Non-custodial: the
// route's `toAddress` is the NEXT hop's deposit address (Paycrest's Base
// receive address), and the USER signs the Stellar transactions, so funds burn
// on Stellar and mint on Base straight into Paycrest — Weave never holds them.
//
// The Stellar leg is two Soroban transactions the sender signs:
//   1. `approve` on the USDC Stellar Asset Contract — grants CCTP's
//      TokenMessenger an expiring allowance (Soroban has no indefinite approvals)
//   2. LI.FI's `bridge` call — pulls the USDC via transfer_from and burns it
// LI.FI can only simulate (2) once (1) is on-chain, so we hand the client the
// approve XDR at order creation and let it fetch the bridge XDR afterwards.
//
// Docs: https://docs.li.fi (Stellar: /introduction/lifi-architecture/stellar-overview)

import {
  Address, Contract, Keypair, TransactionBuilder, nativeToScVal, scValToNative, rpc, BASE_FEE,
} from '@stellar/stellar-sdk';
import { parseAsset } from '../lib/assets';
import { getTreasuryPublicKey, isTreasuryBridgeEnabled } from './stellar.service';
import { stellarBridgeHopCount } from '../lib/offramp-estimate';
import type { RoutePlan } from './router.service';
import { Networks } from '@stellar/stellar-sdk';

const LIFI_API_URL = (process.env.LIFI_API_URL || 'https://li.quest/v1').replace(/\/$/, '');
const LIFI_API_KEY = process.env.LIFI_API_KEY || '';
const LIFI_INTEGRATOR = process.env.LIFI_INTEGRATOR || 'weave';
const SOROBAN_RPC_URL = process.env.STELLAR_SOROBAN_RPC_URL || 'https://mainnet.sorobanrpc.com';

export const LIFI_STELLAR_CHAIN_ID = 1201081091099710;

// Our canonical asset key → LI.FI (chainId, token address). Stellar tokens are
// Soroban Asset Contract `C…` addresses (case-sensitive), EVM tokens are ERC-20s.
const ASSETS: Record<string, { chainId: number; token: string; decimals: number }> = {
  'crypto:STELLAR:USDC': { chainId: LIFI_STELLAR_CHAIN_ID, token: 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75', decimals: 7 },
  'crypto:STELLAR:XLM':  { chainId: LIFI_STELLAR_CHAIN_ID, token: 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA', decimals: 7 },
  'crypto:BASE:USDC':    { chainId: 8453,  token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
  'crypto:ETHEREUM:USDC':{ chainId: 1,     token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  'crypto:ARBITRUM:USDC':{ chainId: 42161, token: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
  'crypto:POLYGON:USDC': { chainId: 137,   token: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
};

export function lifiAsset(key: string) {
  const a = ASSETS[key];
  if (!a) throw new Error(`LI.FI: unsupported asset ${key}`);
  return a;
}
export function lifiSupports(key: string): boolean { return !!ASSETS[key]; }

export function toBaseUnits(amount: number, decimals: number): string {
  const [w, f = ''] = amount.toFixed(decimals).split('.');
  return (w + f.padEnd(decimals, '0')).replace(/^0+(?=\d)/, '');
}
export function fromBaseUnits(raw: string | number, decimals: number): number {
  return Number(raw) / 10 ** decimals;
}

// ── Types (subset of LI.FI's Step / Route) ──────────────────────────────────

export interface LifiStep {
  id: string;
  type: string;
  tool: string;
  action: {
    fromChainId: number; toChainId: number; fromAmount: string;
    fromToken: { address: string; decimals: number; symbol: string };
    toToken: { address: string; decimals: number; symbol: string };
    fromAddress?: string; toAddress?: string; slippage?: number;
  };
  estimate: {
    fromAmount: string; toAmount: string; toAmountMin: string; executionDuration: number;
    approvalAddress?: string; skipApproval?: boolean;
    feeCosts?: Array<{ name: string; amountUSD: string; included?: boolean }>;
    gasCosts?: Array<{ amount: string; amountUSD: string; token: { symbol: string } }>;
  };
  includedSteps?: Array<{ tool: string; type: string }>;
  integrator?: string;
}

export interface LifiRoute { id: string; steps: LifiStep[]; toAmount: string; toAmountMin: string; tags?: string[] }

export interface LifiStatus {
  status: 'NOT_FOUND' | 'INVALID' | 'PENDING' | 'DONE' | 'FAILED';
  substatus?: string;
  substatusMessage?: string;
  sending?: { txHash?: string; amount?: string; token?: { decimals: number } };
  receiving?: { txHash?: string; amount?: string; token?: { decimals: number } };
}

// LI.FI's reasons quote raw base units; rewrite the common ones into money.
function humanizeLifiReason(reason: string): string {
  const range = reason.match(/out of acceptable range \(min: (\d+), max: (\d+)\)/);
  if (range) return `Amount is below the bridge minimum of ${fromBaseUnits(range[1], 7)} USDC.`;
  const xlm = reason.match(/holds ([\d.]+) XLM but needs ([\d.]+) XLM/);
  if (xlm) return `Your Stellar wallet needs at least ${xlm[2]} XLM for network fees (it holds ${xlm[1]}).`;
  if (/trustline/i.test(reason)) return 'The destination Stellar wallet needs a USDC trustline first.';
  return reason;
}

// ── Client ──────────────────────────────────────────────────────────────────

// ── Stellar → Base cost estimate (for quotes and order sizing) ───────────────
// The cost of the Stellar USDC → Base USDC hop is NOT a constant: from about $2 up
// LI.FI routes over Circle CCTP at a flat 0.25%, but a sub-$2 amount goes over
// Layerswap, which is fast and costs ~7.9% at $0.80. A flat figure is right for one
// and wrong for the other, so we ask LI.FI for the actual route estimate.

export interface StellarBridgeEstimate {
  /** USD lost to the hop (amount in − amount that arrives). */
  feeUsd: number;
  /** Expected USDC arriving on Base. */
  arrivalUsd: number;
  /** Worst case after LI.FI's slippage — what an order should be sized to. */
  arrivalMinUsd: number;
  source: 'live' | 'fallback';
}

const BRIDGE_EST_TTL_MS = 60_000;

/** Conservative fallback if LI.FI can't be reached: CCTP's 0.25%, plus a fixed cost for tiny sizes. */
export function fallbackStellarBridgeEstimate(amountUsd: number): StellarBridgeEstimate {
  const feeUsd = amountUsd * 0.0025 + (amountUsd < 2 ? 0.07 : 0);
  const arrivalUsd = Math.max(0, amountUsd - feeUsd);
  return { feeUsd, arrivalUsd, arrivalMinUsd: arrivalUsd * 0.995, source: 'fallback' };
}

export class LifiService {
  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (LIFI_API_KEY) headers['x-lifi-api-key'] = LIFI_API_KEY;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch(`${LIFI_API_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: controller.signal });
      const text = await res.text();
      let json: any = null; try { json = JSON.parse(text); } catch { /* non-JSON */ }
      if (!res.ok) {
        // Surface LI.FI's per-route reasons (e.g. "holds 0.4 XLM but needs 2.0 XLM") — they are user-actionable.
        const filtered = json?.errors?.filteredOut?.map((f: any) => f.reason).filter(Boolean) ?? [];
        const msg = filtered[0] || json?.message || `LI.FI ${res.status}`;
        const err: any = new Error(msg); err.status = res.status; err.lifi = json; throw err;
      }
      return json as T;
    } finally { clearTimeout(t); }
  }

  /**
   * Best route for an exact-input transfer. Uses /advanced/routes (not /quote)
   * because /quote also simulates the Stellar tx, which fails before the
   * allowance exists — routes are computed without that dependency.
   */
  async getRoute(params: {
    fromAssetKey: string; toAssetKey: string; amount: number;
    fromAddress: string; toAddress: string; slippage?: number;
  }): Promise<LifiRoute> {
    const from = lifiAsset(params.fromAssetKey);
    const to = lifiAsset(params.toAssetKey);
    const res = await this.request<{ routes: LifiRoute[]; unavailableRoutes?: { filteredOut?: Array<{ reason?: string }>; failed?: Array<{ subpaths?: Record<string, Array<{ message?: string }>> }> } }>('POST', '/advanced/routes', {
      fromChainId: from.chainId, toChainId: to.chainId,
      fromTokenAddress: from.token, toTokenAddress: to.token,
      fromAmount: toBaseUnits(params.amount, from.decimals),
      fromAddress: params.fromAddress, toAddress: params.toAddress,
      options: { integrator: LIFI_INTEGRATOR, slippage: params.slippage ?? 0.005, order: 'RECOMMENDED' },
    });
    const route = res.routes?.[0];
    if (!route) {
      // LI.FI explains why each candidate was dropped (amount floors, missing
      // XLM for fees, no trustline…) — pass the first reason through, it's
      // exactly what the payer needs to fix.
      const reason = res.unavailableRoutes?.filteredOut?.[0]?.reason
        ?? Object.values(res.unavailableRoutes?.failed?.[0]?.subpaths ?? {})[0]?.[0]?.message;
      throw new Error(reason ? humanizeLifiReason(reason) : `LI.FI: no route from ${params.fromAssetKey} to ${params.toAssetKey}`);
    }
    return route;
  }

  /** Build the executable transaction for a step (Stellar: unsigned XDR in `data`). */
  async getStepTransaction(step: LifiStep): Promise<{ data: string; [k: string]: unknown }> {
    const res = await this.request<LifiStep & { transactionRequest?: { data: string } }>('POST', '/advanced/stepTransaction', step);
    if (!res.transactionRequest?.data) throw new Error('LI.FI: step has no transactionRequest');
    return res.transactionRequest;
  }

  /** Cross-chain status by source tx hash. */
  async getStatus(params: { txHash: string; fromChain: number; toChain: number; bridge?: string }): Promise<LifiStatus> {
    const qs = new URLSearchParams({ txHash: params.txHash, fromChain: String(params.fromChain), toChain: String(params.toChain) });
    if (params.bridge) qs.set('bridge', params.bridge);
    return this.request<LifiStatus>('GET', `/status?${qs}`);
  }

  // ── Stellar helpers ───────────────────────────────────────────────────────

  /**
   * Unsigned Soroban `approve` on a Stellar Asset Contract, simulated and
   * assembled against mainnet RPC so the wallet only has to sign + submit.
   * `expirationLedger` defaults to ~1h from now (Stellar closes a ledger ≈ every 5s).
   */
  async buildStellarApproveXdr(params: {
    from: string; spender: string; tokenContract: string; amountRaw: string; ttlLedgers?: number;
  }): Promise<{ xdr: string; expirationLedger: number }> {
    // LI.FI's Stellar routing exists on the public network only — live orders.
    const server = new rpc.Server(SOROBAN_RPC_URL);
    const [account, latest] = await Promise.all([server.getAccount(params.from), server.getLatestLedger()]);
    const expirationLedger = latest.sequence + (params.ttlLedgers ?? 720);
    const contract = new Contract(params.tokenContract);
    const op = contract.call(
      'approve',
      new Address(params.from).toScVal(),
      new Address(params.spender).toScVal(),
      nativeToScVal(BigInt(params.amountRaw), { type: 'i128' }),
      nativeToScVal(expirationLedger, { type: 'u32' }),
    );
    const tx = new TransactionBuilder(account, { fee: String(Number(BASE_FEE) * 100), networkPassphrase: Networks.PUBLIC })
      .addOperation(op).setTimeout(300).build();
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) throw new Error(`Stellar approve simulation failed: ${sim.error}`);
    const assembled = rpc.assembleTransaction(tx, sim).build();
    return { xdr: assembled.toXDR(), expirationLedger };
  }

  /**
   * Soroban USDC balance for a G-address on the Stellar Asset Contract (LI.FI leg).
   * For a classic G-address, SAC `balance` reflects the trustline (same asset as wallet pay-in).
   */
  async stellarSacBalance(params: { address: string; tokenContract: string }): Promise<bigint> {
    const server = new rpc.Server(SOROBAN_RPC_URL);
    const account = await server.getAccount(params.address);
    const contract = new Contract(params.tokenContract);
    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.PUBLIC })
      .addOperation(contract.call('balance', new Address(params.address).toScVal()))
      .setTimeout(60).build();
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim) || !sim.result) return 0n;
    try { return BigInt(scValToNative(sim.result.retval)); } catch { return 0n; }
  }

  /** Current allowance the SAC has recorded for (from → spender), in base units. */
  async stellarAllowance(params: { from: string; spender: string; tokenContract: string }): Promise<bigint> {
    const server = new rpc.Server(SOROBAN_RPC_URL);
    const account = await server.getAccount(params.from);
    const contract = new Contract(params.tokenContract);
    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.PUBLIC })
      .addOperation(contract.call('allowance', new Address(params.from).toScVal(), new Address(params.spender).toScVal()))
      .setTimeout(60).build();
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim) || !sim.result) return 0n;
    try { return BigInt(scValToNative(sim.result.retval)); } catch { return 0n; }
  }

  /** Hash of a signed/unsigned Stellar tx envelope (for correlating a wallet's submission). */
  static txHashFromXdr(envelopeXdr: string): string {
    return Buffer.from(TransactionBuilder.fromXDR(envelopeXdr, Networks.PUBLIC).hash()).toString('hex');
  }

  private bridgeEstCache    = new Map<string, { at: number; est: StellarBridgeEstimate }>();
  private bridgeEstInflight = new Map<string, Promise<StellarBridgeEstimate>>();

  private async fetchStellarBridgeEstimate(amountUsd: number): Promise<StellarBridgeEstimate> {
    const to = lifiAsset('crypto:BASE:USDC');
    const route = await this.getRoute({
      fromAssetKey: 'crypto:STELLAR:USDC',
      toAssetKey: 'crypto:BASE:USDC',
      amount: amountUsd,
      fromAddress: getTreasuryPublicKey(),
      toAddress: process.env.WEAVE_EVM_REFUND_ADDRESS || '0x742d35cc6634c0532925a3b844bc454e4438f44e',
    });
    const est = route.steps[0]?.estimate as { toAmount?: string; toAmountMin?: string } | undefined;
    if (!est?.toAmount) throw new Error('LI.FI route has no estimate');
    const scale = 10 ** to.decimals;
    const arrivalUsd = Number(est.toAmount) / scale;
    const arrivalMinUsd = Number(est.toAmountMin ?? est.toAmount) / scale;
    return { feeUsd: Math.max(0, amountUsd - arrivalUsd), arrivalUsd, arrivalMinUsd, source: 'live' };
  }

  /** Live estimate of the Stellar → Base hop. Cached 60s per amount (cents). Never throws. */
  async estimateStellarBridge(amountUsd: number): Promise<StellarBridgeEstimate> {
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) return fallbackStellarBridgeEstimate(0);
    const key = amountUsd.toFixed(2);
    const hit = this.bridgeEstCache.get(key);
    if (hit && Date.now() - hit.at < BRIDGE_EST_TTL_MS) return hit.est;
    const pending = this.bridgeEstInflight.get(key);
    if (pending) return pending;

    const p = this.fetchStellarBridgeEstimate(amountUsd)
      .catch((err: Error) => {
        console.warn(`[lifi] Stellar bridge estimate failed (${err.message}); using fallback`);
        return fallbackStellarBridgeEstimate(amountUsd);
      })
      .then(est => {
        // Don't cache a fallback: retry LI.FI on the next call.
        if (est.source === 'live') this.bridgeEstCache.set(key, { at: Date.now(), est });
        return est;
      })
      .finally(() => this.bridgeEstInflight.delete(key));
    this.bridgeEstInflight.set(key, p);
    return p;
  }

  /**
   * The Stellar-bridge fee to price into a plan's quote, or undefined when the plan has
   * no such hop (or it's a sandbox / bridge-off order, where nothing is bridged for real
   * and the estimator's default applies).
   */
  async stellarBridgeFeeForPlan(plan: RoutePlan, usdEquivalent: number, opts: { sandbox?: boolean } = {}): Promise<number | undefined> {
    if (opts.sandbox || stellarBridgeHopCount(plan) === 0) return undefined;
    if (!isTreasuryBridgeEnabled() && !plan.steps.some(s => s.provider === 'lifi')) return undefined;
    return (await this.estimateStellarBridge(usdEquivalent)).feeUsd;
  }

  /** Utility for tests: a throwaway keypair. */
  static randomKeypair() { return Keypair.random(); }
}

export const lifi = new LifiService();
