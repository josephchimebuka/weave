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
let kitNetwork: StellarNetwork | null = null;

/** Overrides build-time env when set from GET /stellar/config (must match API). */
let runtimeFromApi: {
  network?: StellarNetwork;
  horizonUrl?: string;
  usdcIssuer?: string;
  networkPassphrase?: string;
} | null = null;

let configSyncPromise: Promise<void> | null = null;

export function configureCashoutStellarFromApi(cfg: {
  network?: string;
  horizonUrl?: string;
  usdcIssuer?: string;
  networkPassphrase?: string;
} | null) {
  if (!cfg) return;
  const n = String(cfg.network ?? '').toLowerCase();
  const network: StellarNetwork | undefined =
    n === 'mainnet' ? 'mainnet' : n === 'testnet' ? 'testnet' : undefined;
  runtimeFromApi = {
    network,
    horizonUrl: cfg.horizonUrl?.trim() || undefined,
    usdcIssuer: cfg.usdcIssuer?.trim() || undefined,
    networkPassphrase: cfg.networkPassphrase?.trim() || undefined,
  };
  const active = getCashoutStellarNetwork();
  if (kitInitialized && kitNetwork !== active) {
    kitInitialized = false;
    kitNetwork = null;
  }
}

function stellarNetworkFromBuildEnv(): StellarNetwork {
  const env = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';
  return String(env).toLowerCase() === 'mainnet' ? 'mainnet' : 'testnet';
}

export function getCashoutStellarNetwork(): StellarNetwork {
  if (runtimeFromApi?.network) return runtimeFromApi.network;
  return stellarNetworkFromBuildEnv();
}

function getHorizonUrl(): string {
  if (runtimeFromApi?.horizonUrl) return runtimeFromApi.horizonUrl;
  return process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ?? HORIZON_URLS[getCashoutStellarNetwork()];
}

function getUsdcIssuer(): string {
  if (runtimeFromApi?.usdcIssuer) return runtimeFromApi.usdcIssuer;
  return USDC_ISSUERS[getCashoutStellarNetwork()];
}

function getNetworkPassphrase(): string {
  if (runtimeFromApi?.networkPassphrase) return runtimeFromApi.networkPassphrase;
  return NETWORK_PASSPHRASES[getCashoutStellarNetwork()];
}

/** Load network from API before wallet connect/sign (matches hosted checkout widget). */
export async function ensureCashoutStellarConfigSynced(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!configSyncPromise) {
    configSyncPromise = fetch('/api/public/stellar/config')
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        configureCashoutStellarFromApi(j?.data ?? null);
      })
      .catch(() => {});
  }
  await configSyncPromise;
}

function ensureKit(): void {
  const network = getCashoutStellarNetwork();
  if (kitInitialized && kitNetwork === network) return;
  StellarWalletsKit.init({
    modules: defaultModules(),
    network: network === 'mainnet' ? KitNetworks.PUBLIC : KitNetworks.TESTNET,
  });
  kitInitialized = true;
  kitNetwork = network;
}

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? 'Payment failed');
  if (/user rejected|cancel/i.test(msg)) return 'Payment cancelled in wallet.';
  if (/no trustline|op_no_trust/i.test(msg)) return 'Add a USDC trustline in your wallet, then try again.';
  if (/test net|testnet/i.test(msg) && getCashoutStellarNetwork() === 'mainnet') {
    return 'Wallet network mismatch — refresh the page and try again. Freighter should be on Mainnet.';
  }
  return msg;
}

export async function connectCashoutStellarWallet(): Promise<string> {
  try {
    await ensureCashoutStellarConfigSynced();
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
    await ensureCashoutStellarConfigSynced();
    ensureKit();
    const { address } = await StellarWalletsKit.getAddress();
    const network = getCashoutStellarNetwork();
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
  } catch (e) {
    throw new Error(friendlyError(e));
  }
}

export function isStellarUsdcAsset(assetKey: string): boolean {
  const p = assetKey.split(':');
  return p.length >= 3 && p[1]?.toUpperCase() === 'STELLAR' && p[2]?.toUpperCase() === 'USDC';
}
