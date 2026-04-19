// Canonical asset-key handling. Every asset in the system is identified by a
// string of the form:
//
//   "fiat:<CCY>"                 — fiat currency (ISO 4217, uppercase)
//   "crypto:<CHAIN>:<TOKEN>"     — on-chain asset (uppercase chain + token)
//
// Using a single convention keeps the router, executor, and DB columns in
// agreement. Normalize early, parse at use sites.

export type AssetKey = string;

export interface FiatAsset   { kind: 'fiat';   currency: string }
export interface CryptoAsset { kind: 'crypto'; chain: string; token: string }
export type ParsedAsset = FiatAsset | CryptoAsset;

export function parseAsset(key: AssetKey): ParsedAsset {
  const [kind, ...rest] = key.split(':');
  if (kind === 'fiat' && rest.length === 1) {
    return { kind: 'fiat', currency: rest[0].toUpperCase() };
  }
  if (kind === 'crypto' && rest.length === 2) {
    return { kind: 'crypto', chain: rest[0].toUpperCase(), token: rest[1].toUpperCase() };
  }
  throw new Error(`invalid asset key: ${key}`);
}

export function fiatKey(currency: string): AssetKey {
  return `fiat:${currency.toUpperCase()}`;
}

export function cryptoKey(chain: string, token: string): AssetKey {
  return `crypto:${chain.toUpperCase()}:${token.toUpperCase()}`;
}

export function isFiat  (key: AssetKey) { return parseAsset(key).kind === 'fiat'; }
export function isCrypto(key: AssetKey) { return parseAsset(key).kind === 'crypto'; }
