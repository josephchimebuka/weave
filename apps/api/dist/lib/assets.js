"use strict";
// Canonical asset-key handling. Every asset in the system is identified by a
// string of the form:
//
//   "fiat:<CCY>"                 — fiat currency (ISO 4217, uppercase)
//   "crypto:<CHAIN>:<TOKEN>"     — on-chain asset (uppercase chain + token)
//
// Using a single convention keeps the router, executor, and DB columns in
// agreement. Normalize early, parse at use sites.
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAsset = parseAsset;
exports.fiatKey = fiatKey;
exports.cryptoKey = cryptoKey;
exports.isFiat = isFiat;
exports.isCrypto = isCrypto;
function parseAsset(key) {
    const [kind, ...rest] = key.split(':');
    if (kind === 'fiat' && rest.length === 1) {
        return { kind: 'fiat', currency: rest[0].toUpperCase() };
    }
    if (kind === 'crypto' && rest.length === 2) {
        return { kind: 'crypto', chain: rest[0].toUpperCase(), token: rest[1].toUpperCase() };
    }
    throw new Error(`invalid asset key: ${key}`);
}
function fiatKey(currency) {
    return `fiat:${currency.toUpperCase()}`;
}
function cryptoKey(chain, token) {
    return `crypto:${chain.toUpperCase()}:${token.toUpperCase()}`;
}
function isFiat(key) { return parseAsset(key).kind === 'fiat'; }
function isCrypto(key) { return parseAsset(key).kind === 'crypto'; }
