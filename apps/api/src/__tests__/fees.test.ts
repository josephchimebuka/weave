import { describe, it, expect, beforeAll } from 'vitest';

// Set env before importing the service so the constructor doesn't throw.
beforeAll(() => {
  process.env.PAYSTACK_SECRET_KEY = 'test_secret';
});

import { paystack } from '../services/paystack.service';

describe('paystack.grossUp', () => {
  const RATE = 1600;

  it('chargeAmountNgn is greater than netAmountNgn (payer pays more)', () => {
    const { chargeAmountNgn } = paystack.grossUp(5000, RATE);
    expect(chargeAmountNgn).toBeGreaterThan(5000);
  });

  it('feeUsd is positive', () => {
    const { feeUsd } = paystack.grossUp(5000, RATE);
    expect(feeUsd).toBeGreaterThan(0);
  });

  it('Weave fee is 0.5% of net for amounts under the 500 NGN cap', () => {
    const net = 5000;
    const { weaveFeeNgn } = paystack.grossUp(net, RATE);
    expect(weaveFeeNgn).toBeCloseTo(net * 0.005, 5);
  });

  it('Weave fee is capped at 500 NGN for large amounts', () => {
    const { weaveFeeNgn } = paystack.grossUp(200_000, RATE);
    expect(weaveFeeNgn).toBe(500);
  });

  it('round-trip: gross minus Paystack fee ≈ netAmountNgn + weaveFeeNgn', () => {
    const net = 10_000;
    const { chargeAmountNgn, weaveFeeNgn, paystackFeeNgn } = paystack.grossUp(net, RATE);
    // chargeAmountNgn - paystackFeeNgn should equal net + weaveFeeNgn
    expect(chargeAmountNgn - paystackFeeNgn).toBeCloseTo(net + weaveFeeNgn, 0);
  });

  it('feeUsd approximates total NGN fee converted to USD', () => {
    const net = 5000;
    const rate = 1600;
    const { feeUsd, chargeAmountNgn } = paystack.grossUp(net, rate);
    // feeUsd uses pre-ceil values so it differs from (chargeAmountNgn - net)/rate
    // by at most 1 NGN / rate. Verify within 2 decimal places (tolerance ~0.005 USD).
    expect(feeUsd).toBeCloseTo((chargeAmountNgn - net) / rate, 2);
  });
});
