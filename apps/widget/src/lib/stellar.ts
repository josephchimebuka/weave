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
import { fetchStellarPublicConfig } from '../api/client';
import { mapStellarPaymentError } from './stellar-errors';

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
let kitNetwork: StellarNetwork | null = null;

/** Overrides build-time VITE_* when set from GET /stellar/config (must match API). */
let runtimeFromApi: {
  network?: StellarNetwork;
  horizonUrl?: string;
  usdcIssuer?: string;
  networkPassphrase?: string;
} | null = null;

export function applyStellarPublicConfig(cfg: {
  network?: string;
  horizonUrl?: string;
  usdcIssuer?: string;
  networkPassphrase?: string;
}): void {
  const n = String(cfg.network ?? '').toLowerCase();
  const network: StellarNetwork | undefined =
    n === 'mainnet' ? 'mainnet' : n === 'testnet' ? 'testnet' : undefined;
  runtimeFromApi = {
    network,
    horizonUrl: cfg.horizonUrl?.trim() || undefined,
    usdcIssuer: cfg.usdcIssuer?.trim() || undefined,
    networkPassphrase: cfg.networkPassphrase?.trim() || undefined,
  };
  const active = getStellarNetwork();
  if (kitInitialized && kitNetwork !== active) {
    kitInitialized = false;
    kitNetwork = null;
  }
}

function stellarNetworkFromBuildEnv(): StellarNetwork {
  const raw =
    (import.meta as any).env?.VITE_STELLAR_NETWORK ??
    (import.meta as any).env?.NEXT_PUBLIC_STELLAR_NETWORK ??
    'testnet';
  return String(raw).toLowerCase() === 'mainnet' ? 'mainnet' : 'testnet';
}

export function getStellarNetwork(): StellarNetwork {
  if (runtimeFromApi?.network) return runtimeFromApi.network;
  return stellarNetworkFromBuildEnv();
}

/** Load network/issuer from API so hosted www (Next) matches production STELLAR_NETWORK. */
export async function ensureStellarConfigSynced(): Promise<void> {
  const cfg = await fetchStellarPublicConfig();
  if (cfg) applyStellarPublicConfig(cfg);
}

export function getHorizonUrl(): string {
  if (runtimeFromApi?.horizonUrl) return runtimeFromApi.horizonUrl;
  return (import.meta as any).env?.VITE_STELLAR_HORIZON_URL ?? HORIZON_URLS[getStellarNetwork()];
}

export function getUsdcIssuer(): string {
  if (runtimeFromApi?.usdcIssuer) return runtimeFromApi.usdcIssuer;
  return (import.meta as any).env?.VITE_STELLAR_USDC_ISSUER ?? USDC_ISSUERS[getStellarNetwork()];
}

export function getNetworkPassphrase(): string {
  if (runtimeFromApi?.networkPassphrase) return runtimeFromApi.networkPassphrase;
  return NETWORK_PASSPHRASES[getStellarNetwork()];
}

function ensureKit(): void {
  const network = getStellarNetwork();
  if (kitInitialized && kitNetwork === network) return;
  StellarWalletsKit.init({
    modules: defaultModules(),
    network: network === 'mainnet' ? KitNetworks.PUBLIC : KitNetworks.TESTNET,
  });
  kitInitialized = true;
  kitNetwork = network;
}

/** Opens wallet picker modal and returns connected Stellar address. */
export async function openStellarWalletModal(): Promise<string> {
  try {
    await ensureStellarConfigSynced();
    ensureKit();
    const { address } = await StellarWalletsKit.authModal();
    return address;
  } catch (e) {
    throw new Error(mapStellarPaymentError(e));
  }
}

export async function sendStellarUsdcPayment(params: {
  destination: string;
  amount: number;
  memo: string;
}): Promise<{ txHash: string }> {
  try {
    await ensureStellarConfigSynced();
    ensureKit();
    const { address } = await StellarWalletsKit.getAddress();
    const server = new Horizon.Server(getHorizonUrl());
    try {
      await server.loadAccount(params.destination);
    } catch (destErr: any) {
      const d = String(destErr?.response?.data?.detail ?? destErr?.message ?? '').toLowerCase();
      if (d.includes('not found') || destErr?.response?.status === 404) {
        throw new Error('op_no_destination');
      }
      throw destErr;
    }
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
  } catch (e) {
    throw new Error(mapStellarPaymentError(e));
  }
}
