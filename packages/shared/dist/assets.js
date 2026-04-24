"use strict";
// Canonical asset key helpers — single source of truth used by API, dashboard, and widget.
// Format:
//   Fiat:   "fiat:NGN"
//   Crypto: "crypto:BASE:USDC"
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCrypto = exports.isFiat = exports.cryptoKey = exports.fiatKey = void 0;
exports.parseAsset = parseAsset;
exports.assetLabel = assetLabel;
exports.directionOf = directionOf;
function parseAsset(key) {
    if (!key)
        throw new Error('asset key is required');
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
const fiatKey = (currency) => `fiat:${currency.toUpperCase()}`;
exports.fiatKey = fiatKey;
const cryptoKey = (chain, token) => `crypto:${chain.toUpperCase()}:${token.toUpperCase()}`;
exports.cryptoKey = cryptoKey;
const isFiat = (key) => key.startsWith('fiat:');
exports.isFiat = isFiat;
const isCrypto = (key) => key.startsWith('crypto:');
exports.isCrypto = isCrypto;
/**
 * Returns a human-friendly label for an asset key.
 */
function assetLabel(key) {
    try {
        const a = parseAsset(key);
        return a.kind === 'fiat' ? a.currency : `${a.token} · ${a.chain}`;
    }
    catch {
        return key;
    }
}
/**
 * Determines the logical direction of an order based on source/dest assets.
 */
function directionOf(sourceKey, destKey) {
    try {
        const s = parseAsset(sourceKey).kind;
        const d = parseAsset(destKey).kind;
        if (s === 'crypto' && d === 'fiat')
            return 'offramp';
        if (s === 'fiat' && d === 'crypto')
            return 'onramp';
        if (s === 'crypto' && d === 'crypto')
            return 'bridge';
        return 'transfer';
    }
    catch {
        return 'transfer';
    }
}
