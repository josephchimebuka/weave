/**
 * Human amount → smallest-unit integer string (100 USDC @ 6 dec → "100000000").
 *
 * Done on the decimal *string* with BigInt rather than via floats: `toFixed`
 * on a 24-decimal asset (NEAR) exposes binary float noise — 0.1 became
 * "100000000000000005551115". We take the shortest round-trip decimal form of
 * the number (what the caller actually meant), expand any exponent, and round
 * half-up at `decimals`. Non-finite or non-positive input yields "0".
 */
export function toSmallestUnit(amount: number | string, decimals: number): string {
  const raw = typeof amount === 'string' ? amount.trim() : String(amount);
  const m = /^\+?(\d*)\.?(\d*)(?:[eE]([+-]?\d+))?$/.exec(raw);
  if (!m || (m[1] === '' && m[2] === '')) return '0';

  let digits = m[1] + m[2];
  let pointAt = m[1].length + (m[3] ? parseInt(m[3], 10) : 0); // digits before the point

  if (pointAt < 0) { digits = '0'.repeat(-pointAt) + digits; pointAt = 0; }
  if (pointAt > digits.length) digits = digits + '0'.repeat(pointAt - digits.length);

  const whole = digits.slice(0, pointAt) || '0';
  const frac  = digits.slice(pointAt);

  let scaled = BigInt(whole + frac.slice(0, decimals).padEnd(decimals, '0'));
  if (frac.length > decimals && frac.charCodeAt(decimals) >= 53 /* '5' */) scaled += 1n;
  return scaled.toString();
}
