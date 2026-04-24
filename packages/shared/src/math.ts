/**
 * Convert a human-readable amount to the smallest unit for a given decimal precision.
 * e.g. toSmallestUnit(1.5, 6) === 1500000n  (USDC with 6 decimals)
 */
export function toSmallestUnit(amount: number, decimals: number): bigint {
  // Use BigInt to avoid floating-point precision errors
  return BigInt(Math.round(amount * 10 ** decimals));
}

/**
 * Convert smallest unit back to a human-readable amount.
 */
export function fromSmallestUnit(amount: bigint, decimals: number): number {
  return Number(amount) / 10 ** decimals;
}
