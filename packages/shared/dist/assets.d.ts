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
