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
import { STELLAR_NETWORK, STELLAR_NETWORK_PASSPHRASE } from '../lib/stellar-anchor-config';

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

// ── Client ──────────────────────────────────────────────────────────────────

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
    const res = await this.request<{ routes: LifiRoute[] }>('POST', '/advanced/routes', {
      fromChainId: from.chainId, toChainId: to.chainId,
      fromTokenAddress: from.token, toTokenAddress: to.token,
      fromAmount: toBaseUnits(params.amount, from.decimals),
      fromAddress: params.fromAddress, toAddress: params.toAddress,
      options: { integrator: LIFI_INTEGRATOR, slippage: params.slippage ?? 0.005, order: 'RECOMMENDED' },
    });
    const route = res.routes?.[0];
    if (!route) throw new Error(`LI.FI: no route from ${params.fromAssetKey} to ${params.toAssetKey}`);
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
    if (STELLAR_NETWORK !== 'mainnet') throw new Error('LI.FI Stellar routing runs on the public network only');
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
    const tx = new TransactionBuilder(account, { fee: String(Number(BASE_FEE) * 100), networkPassphrase: STELLAR_NETWORK_PASSPHRASE })
      .addOperation(op).setTimeout(300).build();
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) throw new Error(`Stellar approve simulation failed: ${sim.error}`);
    const assembled = rpc.assembleTransaction(tx, sim).build();
    return { xdr: assembled.toXDR(), expirationLedger };
  }

  /** Current allowance the SAC has recorded for (from → spender), in base units. */
  async stellarAllowance(params: { from: string; spender: string; tokenContract: string }): Promise<bigint> {
    const server = new rpc.Server(SOROBAN_RPC_URL);
    const account = await server.getAccount(params.from);
    const contract = new Contract(params.tokenContract);
    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: STELLAR_NETWORK_PASSPHRASE })
      .addOperation(contract.call('allowance', new Address(params.from).toScVal(), new Address(params.spender).toScVal()))
      .setTimeout(60).build();
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim) || !sim.result) return 0n;
    try { return BigInt(scValToNative(sim.result.retval)); } catch { return 0n; }
  }

  /** Hash of a signed/unsigned Stellar tx envelope (for correlating a wallet's submission). */
  static txHashFromXdr(envelopeXdr: string): string {
    return Buffer.from(TransactionBuilder.fromXDR(envelopeXdr, STELLAR_NETWORK_PASSPHRASE).hash()).toString('hex');
  }

  /** Utility for tests: a throwaway keypair. */
  static randomKeypair() { return Keypair.random(); }
}

export const lifi = new LifiService();
