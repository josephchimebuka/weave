// Canonical asset key helpers — single source of truth used by API, dashboard, and widget.
// Format:
//   Fiat:   "fiat:NGN"
//   Crypto: "crypto:BASE:USDC"

export type AssetKey = string;

export interface FiatAsset {
  kind:     'fiat';
  currency: string;
}

export interface CryptoAsset {
  kind:  'crypto';
  chain: string;
  token: string;
}

export interface ParsedFiatAsset {
  kind:     'fiat';
  currency: string; // e.g. "NGN"
  key:      string;
}

export interface ParsedCryptoAsset {
  kind:    'crypto';
  chain:   string; // e.g. "BASE"
  token:   string; // e.g. "USDC"
  key:     string;
}

export type ParsedAsset = ParsedFiatAsset | ParsedCryptoAsset;

export function parseAsset(key: string): ParsedAsset {
  if (!key) throw new Error('asset key is required');
  const parts = key.split(':');
  if (parts[0] === 'fiat' && parts[1]) {
    const currency = parts[1].toUpperCase();
    return { kind: 'fiat', currency, key: `fiat:${currency}` };
  }
  if (parts[0] === 'crypto' && parts[1] && parts[2]) {
    const chain = parts[1].toUpperCase();
    const token = parts[2].toUpperCase();
    return { kind: 'crypto', chain, token, key: `crypto:${chain}:${token}` };
  }
  throw new Error(`Invalid asset key: "${key}". Expected "fiat:CCY" or "crypto:CHAIN:TOKEN"`);
}

export const fiatKey   = (currency: string)             => `fiat:${currency.toUpperCase()}`;
export const cryptoKey = (chain: string, token: string) => `crypto:${chain.toUpperCase()}:${token.toUpperCase()}`;
export const isFiat    = (key: string)                  => key.startsWith('fiat:');
export const isCrypto  = (key: string)                  => key.startsWith('crypto:');

/**
 * Returns a human-friendly label for an asset key.
 */
export function assetLabel(key: string): string {
  try {
    const a = parseAsset(key);
    return a.kind === 'fiat' ? a.currency : `${a.token} · ${a.chain}`;
  } catch {
    return key;
  }
}

export type OrderDirection = 'offramp' | 'onramp' | 'bridge' | 'transfer';

/**
 * Determines the logical direction of an order based on source/dest assets.
 */
export function directionOf(sourceKey: string, destKey: string): OrderDirection {
  try {
    const s = parseAsset(sourceKey).kind;
    const d = parseAsset(destKey).kind;
    if (s === 'crypto' && d === 'fiat')   return 'offramp';
    if (s === 'fiat'   && d === 'crypto') return 'onramp';
    if (s === 'crypto' && d === 'crypto') return 'bridge';
    return 'transfer';
  } catch {
    return 'transfer';
  }
}
