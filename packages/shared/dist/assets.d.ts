export type AssetKey = string;
export interface FiatAsset {
    kind: 'fiat';
    currency: string;
}
export interface CryptoAsset {
    kind: 'crypto';
    chain: string;
    token: string;
}
export interface ParsedFiatAsset {
    kind: 'fiat';
    currency: string;
    key: string;
}
export interface ParsedCryptoAsset {
    kind: 'crypto';
    chain: string;
    token: string;
    key: string;
}
export type ParsedAsset = ParsedFiatAsset | ParsedCryptoAsset;
export declare function parseAsset(key: string): ParsedAsset;
export declare const fiatKey: (currency: string) => string;
export declare const cryptoKey: (chain: string, token: string) => string;
export declare const isFiat: (key: string) => boolean;
export declare const isCrypto: (key: string) => boolean;
/**
 * Returns a human-friendly label for an asset key.
 */
export declare function assetLabel(key: string): string;
export type OrderDirection = 'offramp' | 'onramp' | 'bridge' | 'transfer';
/**
 * Determines the logical direction of an order based on source/dest assets.
 */
export declare function directionOf(sourceKey: string, destKey: string): OrderDirection;
