// Stellar Wallets Kit + USDC payment builder for Weave checkout.

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

export type StellarNetwork = 'testnet' | 'mainnet';

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
  mainnet: 'GA5ZSEJYB37JRC5EAAOKU5YDTYNNAMDR2EMH5QAFB5S64XAHQXHUM5N',
};

let kitInitialized = false;

export function getStellarNetwork(): StellarNetwork {
  const env = (import.meta as any).env?.VITE_STELLAR_NETWORK ?? 'testnet';
  return String(env).toLowerCase() === 'mainnet' ? 'mainnet' : 'testnet';
}

export function getHorizonUrl(): string {
  return (import.meta as any).env?.VITE_STELLAR_HORIZON_URL ?? HORIZON_URLS[getStellarNetwork()];
}

export function getUsdcIssuer(): string {
  return (import.meta as any).env?.VITE_STELLAR_USDC_ISSUER ?? USDC_ISSUERS[getStellarNetwork()];
}

export function getNetworkPassphrase(): string {
  return NETWORK_PASSPHRASES[getStellarNetwork()];
}

function ensureKit(): void {
  if (kitInitialized) return;
  const network = getStellarNetwork();
  StellarWalletsKit.init({
    modules: defaultModules(),
    network: network === 'mainnet' ? KitNetworks.PUBLIC : KitNetworks.TESTNET,
  });
  kitInitialized = true;
}

/** Opens wallet picker modal and returns connected Stellar address. */
export async function openStellarWalletModal(): Promise<string> {
  ensureKit();
  const { address } = await StellarWalletsKit.authModal();
  return address;
}

export async function sendStellarUsdcPayment(params: {
  destination: string;
  amount: number;
  memo: string;
}): Promise<{ txHash: string }> {
  ensureKit();
  const { address } = await StellarWalletsKit.getAddress();
  const server = new Horizon.Server(getHorizonUrl());
  const sourceAccount = await server.loadAccount(address);
  const usdc = new Asset('USDC', getUsdcIssuer());
  const passphrase = getNetworkPassphrase();

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
}
