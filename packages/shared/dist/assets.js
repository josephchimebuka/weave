"use strict";
// Canonical asset key helpers — single source of truth used by API, dashboard, and widget.
// Format:
//   Fiat:   "fiat:NGN"
//   Crypto: "crypto:BASE:USDC"
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCrypto = exports.isFiat = exports.cryptoKey = exports.fiatKey = void 0;
exports.parseAsset = parseAsset;
function parseAsset(key) {
    if (!key)
        throw new Error('asset key is required');
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
const fiatKey = (currency) => `fiat:${currency.toUpperCase()}`;
exports.fiatKey = fiatKey;
const cryptoKey = (chain, token) => `crypto:${chain.toUpperCase()}:${token.toUpperCase()}`;
exports.cryptoKey = cryptoKey;
const isFiat = (key) => key.startsWith('fiat:');
exports.isFiat = isFiat;
const isCrypto = (key) => key.startsWith('crypto:');
exports.isCrypto = isCrypto;
