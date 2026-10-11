// ┌─────────────────────────────────────────────────────────────────────────┐
// │  SANDBOX ONLY · STELLAR TESTNET ONLY · PLAY MONEY                        │
// └─────────────────────────────────────────────────────────────────────────┘
//
// The Stellar leg of a sandbox order needs a counterparty, the same way the
// sandbox Paycrest/NEAR mocks stand in for those providers. On mainnet that
// counterparty is a THIRD PARTY Weave never controls — NEAR Intents' deposit
// address, Circle's CCTP contract (via LI.FI), Paycrest's receive address. On
// testnet none of those exist for us, so this simulator plays their role with
// a dedicated testnet account holding faucet USDC:
//
//   deposit  (… → USDC on Stellar): after the mocked NGN leg, pay testnet USDC
//                                    to the user's own wallet
//   cash-out (USDC on Stellar → …): hand out the simulator's address + a
//                                    per-order memo; complete when it lands
//
// It is a provider stub, not a treasury: it is impossible to reach from a live
// order (every entry point asserts sandbox + testnet), it holds nothing of
// value, and the production path is untouched. Label it as such wherever it
// surfaces (RouteStep.provider = 'stellar_simulator', SEP-24 `message`, UI).

import { Asset, Horizon, Keypair, Memo, Operation, TransactionBuilder, BASE_FEE, StrKey } from '@stellar/stellar-sdk';
import { stellarNet } from '../lib/stellar-anchor-config';

export const STELLAR_SIMULATOR_PROVIDER = 'stellar_simulator';
export const STELLAR_SIMULATOR_LABEL = 'testnet · simulated bridge counterparty (NEAR Intents / Circle CCTP on mainnet)';

const SECRET = process.env.WEAVE_SANDBOX_STELLAR_SECRET || '';
const NET = stellarNet(true); // always testnet — by construction, not by config

/** Stellar text memos are ≤ 28 bytes; "wv-sbx-" + 20 hex of the order id. */
export function simulatorMemoFor(orderId: string): string {
  return `wv-sbx-${orderId.replace(/-/g, '').slice(0, 20)}`;
}

export class StellarSimulator {
  private horizon = new Horizon.Server(NET.horizonUrl);

  get enabled(): boolean { return !!SECRET; }

  /** Every method goes through here. A live order can never reach the simulator. */
  private assertSandbox(sandboxMode: boolean, what: string) {
    if (!sandboxMode) throw new Error(`stellar_simulator: refusing ${what} outside sandbox mode`);
    if (NET.network !== 'testnet') throw new Error(`stellar_simulator: refusing ${what} off testnet`);
    if (!SECRET) throw new Error('stellar_simulator: WEAVE_SANDBOX_STELLAR_SECRET is not configured');
  }

  publicKey(sandboxMode: boolean): string {
    this.assertSandbox(sandboxMode, 'address lookup');
    return Keypair.fromSecret(SECRET).publicKey();
  }

  /** Does `account` exist on testnet and trust testnet USDC? */
  async accountAcceptsUsdc(sandboxMode: boolean, account: string): Promise<{ exists: boolean; trusts: boolean }> {
    this.assertSandbox(sandboxMode, 'account check');
    if (!StrKey.isValidEd25519PublicKey(account)) return { exists: false, trusts: false };
    try {
      const acc = await this.horizon.loadAccount(account);
      const trusts = acc.balances.some((b: any) => b.asset_code === 'USDC' && b.asset_issuer === NET.usdcIssuer);
      return { exists: true, trusts };
    } catch (err: any) {
      if (err?.response?.status === 404) return { exists: false, trusts: false };
      throw err;
    }
  }

  async balance(sandboxMode: boolean): Promise<number> {
    this.assertSandbox(sandboxMode, 'balance');
    const acc = await this.horizon.loadAccount(this.publicKey(sandboxMode));
    const b: any = acc.balances.find((x: any) => x.asset_code === 'USDC' && x.asset_issuer === NET.usdcIssuer);
    return b ? Number(b.balance) : 0;
  }

  /** Pay testnet USDC to the user's wallet (deposit direction). Returns the tx hash. */
  async payUsdc(sandboxMode: boolean, params: { to: string; amount: number; memo?: string }): Promise<string> {
    this.assertSandbox(sandboxMode, 'payment');
    const { exists, trusts } = await this.accountAcceptsUsdc(sandboxMode, params.to);
    if (!exists) throw new Error('Your Stellar wallet is not active on testnet yet.');
    if (!trusts) throw new Error('Your Stellar wallet needs a testnet USDC trustline before it can receive this deposit.');
    const kp = Keypair.fromSecret(SECRET);
    const source = await this.horizon.loadAccount(kp.publicKey());
    const builder = new TransactionBuilder(source, { fee: String(Number(BASE_FEE) * 10), networkPassphrase: NET.passphrase })
      .addOperation(Operation.payment({ destination: params.to, asset: new Asset('USDC', NET.usdcIssuer), amount: params.amount.toFixed(7) }))
      .setTimeout(120);
    if (params.memo) builder.addMemo(Memo.text(params.memo.slice(0, 28)));
    const tx = builder.build();
    tx.sign(kp);
    const res = await this.horizon.submitTransaction(tx);
    return res.hash;
  }

  /** Sum of testnet USDC payments into the simulator carrying `memo` (cash-out direction). */
  async findIncoming(sandboxMode: boolean, memo: string): Promise<{ amount: number; txHash: string; from: string } | null> {
    this.assertSandbox(sandboxMode, 'incoming scan');
    const me = this.publicKey(sandboxMode);
    const page = await this.horizon.payments().forAccount(me).order('desc').limit(200).join('transactions').call();
    let total = 0; let hash: string | null = null; let from = '';
    for (const rec of page.records as any[]) {
      if (rec.type !== 'payment' || rec.to !== me) continue;
      if (rec.asset_type === 'native' || rec.asset_code !== 'USDC' || rec.asset_issuer !== NET.usdcIssuer) continue;
      // With join=transactions the SDK exposes the tx as `transaction_attr`
      // (and shadows `transaction` with a lazy loader).
      const txMemo = rec.transaction_attr?.memo ?? (typeof rec.transaction === 'object' ? rec.transaction?.memo : null) ?? null;
      if (txMemo !== memo) continue;
      total += Number(rec.amount);
      if (!hash) { hash = rec.transaction_hash; from = rec.from; }
    }
    return hash ? { amount: total, txHash: hash, from } : null;
  }
}

export const stellarSimulator = new StellarSimulator();
