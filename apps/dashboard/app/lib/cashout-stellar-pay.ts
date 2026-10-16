'use client';

import {
  Asset,
  Horizon,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { StellarWalletsKit, Networks as KitNetworks } from '@creit.tech/stellar-wallets-kit';
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils';

type StellarNetwork = 'testnet' | 'mainnet';

const NETWORK_PASSPHRASES: Record<StellarNetwork, string> = {
  testnet: Networks.TESTNET,
  mainnet: Networks.PUBLIC,
};

const HORIZON_URLS: Record<StellarNetwork, string> = {
  testnet: 'https://horizon-testnet.stellar.org',
  mainnet: 'https://horizon.stellar.org',
};

const USDC_ISSUERS: Record<StellarNetwork, string> = {
  testnet: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  mainnet: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
};

let kitInitialized = false;
let issuerOverride: string | null = null;

export function configureCashoutStellarFromApi(cfg: { network?: string; usdcIssuer?: string } | null) {
  if (cfg?.usdcIssuer) issuerOverride = cfg.usdcIssuer;
}

function getNetwork(): StellarNetwork {
  const env = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';
  return String(env).toLowerCase() === 'mainnet' ? 'mainnet' : 'testnet';
}

function ensureKit(): void {
  if (kitInitialized) return;
  const network = getNetwork();
  StellarWalletsKit.init({
    modules: defaultModules(),
    network: network === 'mainnet' ? KitNetworks.PUBLIC : KitNetworks.TESTNET,
  });
  kitInitialized = true;
}

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? 'Payment failed');
  if (/user rejected|cancel/i.test(msg)) return 'Payment cancelled in wallet.';
  if (/no trustline|op_no_trust/i.test(msg)) return 'Add a USDC trustline in your wallet, then try again.';
  return msg;
}

export async function connectCashoutStellarWallet(): Promise<string> {
  try {
    ensureKit();
    const { address } = await StellarWalletsKit.authModal();
    return address;
  } catch (e) {
    throw new Error(friendlyError(e));
  }
}

export async function sendCashoutStellarUsdc(params: {
  destination: string;
  amount: number;
  memo: string;
}): Promise<{ txHash: string }> {
  try {
    ensureKit();
    const { address } = await StellarWalletsKit.getAddress();
    const network = getNetwork();
    const server = new Horizon.Server(process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ?? HORIZON_URLS[network]);
    const sourceAccount = await server.loadAccount(address);
    const usdc = new Asset('USDC', issuerOverride ?? USDC_ISSUERS[network]);
    const passphrase = NETWORK_PASSPHRASES[network];

    const tx = new TransactionBuilder(sourceAccount, {
      fee: '100000',
      networkPassphrase: passphrase,
    })
      .addOperation(
        Operation.payment({
          destination: params.destination,
          asset: usdc,
          amount: params.amount.toFixed(7),
        }),
      )
      .addMemo(Memo.text(params.memo.slice(0, 28)))
      .setTimeout(180)
      .build();

    const { signedTxXdr } = await StellarWalletsKit.signTransaction(tx.toXDR(), {
      address,
      networkPassphrase: passphrase,
    });

    const signed = TransactionBuilder.fromXDR(signedTxXdr, passphrase);
    const result = await server.submitTransaction(signed);
    return { txHash: result.hash };
  } catch (e) {
    throw new Error(friendlyError(e));
  }
}

export function isStellarUsdcAsset(assetKey: string): boolean {
  const p = assetKey.split(':');
  return p.length >= 3 && p[1]?.toUpperCase() === 'STELLAR' && p[2]?.toUpperCase() === 'USDC';
}
