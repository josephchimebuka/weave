// Canonical asset key helpers — single source of truth used by API, dashboard, and widget.
// Format:
//   Fiat:   "fiat:NGN"
//   Crypto: "crypto:BASE:USDC"

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
    return { kind: 'fiat', currency: parts[1].toUpperCase(), key: `fiat:${parts[1].toUpperCase()}` };
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
