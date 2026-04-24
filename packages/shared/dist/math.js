"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSmallestUnit = toSmallestUnit;
exports.fromSmallestUnit = fromSmallestUnit;
/**
 * Convert a human-readable amount to the smallest unit for a given decimal precision.
 * e.g. toSmallestUnit(1.5, 6) === 1500000n  (USDC with 6 decimals)
 */
function toSmallestUnit(amount, decimals) {
    // Use BigInt to avoid floating-point precision errors
    return BigInt(Math.round(amount * 10 ** decimals));
}
/**
 * Convert smallest unit back to a human-readable amount.
 */
function fromSmallestUnit(amount, decimals) {
    return Number(amount) / 10 ** decimals;
}
