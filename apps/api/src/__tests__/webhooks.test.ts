import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

// ── Paycrest: HMAC-SHA256(secret, rawBody) ──────────────────────────────────

describe('Paycrest webhook signature algorithm', () => {
  const secret = 'test-paycrest-secret';
  const body = '{"event":"payment.completed","id":"abc123"}';
  const validSig = crypto.createHmac('sha256', secret).update(body).digest('hex');

  it('computes a 64-char hex digest', () => {
    expect(validSig).toHaveLength(64);
    expect(validSig).toMatch(/^[0-9a-f]+$/);
  });

  it('strips the sha256= prefix before comparing', () => {
    const withPrefix = 'sha256=' + validSig;
    const stripped = withPrefix.startsWith('sha256=') ? withPrefix.slice(7) : withPrefix;
    expect(stripped).toBe(validSig);
  });

  it('rejects a tampered body', () => {
    const tamperedSig = crypto.createHmac('sha256', secret).update(body + 'x').digest('hex');
    expect(tamperedSig).not.toBe(validSig);
  });

  it('rejects a wrong secret', () => {
    const wrongSig = crypto.createHmac('sha256', 'wrong-secret').update(body).digest('hex');
    expect(wrongSig).not.toBe(validSig);
  });

  it('length mismatch on bad hex causes timingSafeEqual to throw', () => {
    expect(() =>
      crypto.timingSafeEqual(Buffer.from('badhex'), Buffer.from(validSig, 'hex')),
    ).toThrow();
  });
});

// ── ChainRails: HMAC-SHA256(secret, `${timestamp}.${rawBody}`) ───────────────

describe('ChainRails webhook signature algorithm', () => {
  const secret = 'test-chainrails-secret';
  const body = '{"event":"transfer.completed"}';
  const ts = String(Math.floor(Date.now() / 1000));
  const payload = `${ts}.${body}`;
  const validSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  it('computes a 64-char hex digest over timestamp.body', () => {
    expect(validSig).toHaveLength(64);
  });

  it('different timestamp produces different signature', () => {
    const otherSig = crypto.createHmac('sha256', secret)
      .update(`99999999.${body}`)
      .digest('hex');
    expect(otherSig).not.toBe(validSig);
  });

  it('stale timestamp (>5 min ago) is outside the allowed window', () => {
    const staleTs = Math.floor(Date.now() / 1000) - 400;
    const outside = Math.abs(Date.now() - staleTs * 1000) > 5 * 60 * 1000;
    expect(outside).toBe(true);
  });

  it('fresh timestamp is within the allowed window', () => {
    const freshTs = Math.floor(Date.now() / 1000) - 10;
    const inside = Math.abs(Date.now() - freshTs * 1000) <= 5 * 60 * 1000;
    expect(inside).toBe(true);
  });
});
