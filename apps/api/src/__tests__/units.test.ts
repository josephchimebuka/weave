import { describe, it, expect } from 'vitest';
import { toSmallestUnit } from '../lib/units';

describe('toSmallestUnit', () => {
  it('scales whole and fractional amounts', () => {
    expect(toSmallestUnit(100, 6)).toBe('100000000');
    expect(toSmallestUnit(20.5, 6)).toBe('20500000');
    expect(toSmallestUnit('0.000001', 6)).toBe('1');
  });

  it('has no float noise on 24-decimal assets (NEAR)', () => {
    expect(toSmallestUnit(0.1, 24)).toBe('100000000000000000000000');
    expect(toSmallestUnit(5, 24)).toBe('5000000000000000000000000');
    expect(toSmallestUnit(20.5, 24)).toBe('20500000000000000000000000');
    expect(toSmallestUnit(0.3, 24)).toBe('300000000000000000000000');
  });

  it('expands scientific notation', () => {
    expect(toSmallestUnit(1e-7, 7)).toBe('1');
    expect(toSmallestUnit(1e-7, 18)).toBe('100000000000');
    expect(toSmallestUnit(1e21, 2)).toBe('100000000000000000000000');
  });

  it('rounds half-up beyond the asset precision', () => {
    expect(toSmallestUnit(1.2345675, 6)).toBe('1234568');
    expect(toSmallestUnit(1.2345674, 6)).toBe('1234567');
  });

  it('returns "0" for junk, zero and negatives', () => {
    expect(toSmallestUnit(NaN, 6)).toBe('0');
    expect(toSmallestUnit(Infinity, 6)).toBe('0');
    expect(toSmallestUnit('abc', 6)).toBe('0');
    expect(toSmallestUnit(0, 6)).toBe('0');
    expect(toSmallestUnit(-5, 6)).toBe('0');
  });
});
