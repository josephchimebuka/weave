/**
 * Convert a human-readable amount to the smallest unit for a given decimal precision.
 * e.g. toSmallestUnit(1.5, 6) === 1500000n  (USDC with 6 decimals)
 */
export declare function toSmallestUnit(amount: number, decimals: number): bigint;
/**
 * Convert smallest unit back to a human-readable amount.
 */
export declare function fromSmallestUnit(amount: bigint, decimals: number): number;
