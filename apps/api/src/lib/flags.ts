// Provider / feature kill switches. Centralized so an on-call operator can flip
// a corridor off during an incident without hunting through the codebase.
//
// PAYSTACK: Paystack suspended our merchant account, so ALL naira collection
// through Paystack is disabled. `planRoute` refuses to plan a Paystack hop and
// `executeOrder` refuses to dispatch one, so neither the widget nor a direct
// API caller can start a Paystack charge. Re-enable by setting
// `PAYSTACK_ENABLED=true` in the API environment once a replacement corridor
// is live — it defaults to OFF so a forgotten env var can never silently
// re-open the dead provider.
export const PAYSTACK_ENABLED = process.env.PAYSTACK_ENABLED === 'true';

// BACHS: Bachs Connect is the licensed naira-collection replacement for Paystack.
// The customer pays into Dewdrop's Bachs platform balance (funds custodied by
// Bachs, the CBN-licensed party — NOT Dewdrop's own bank account), and each
// vendor's share is split to their connected account. Defaults OFF; set
// `BACHS_ENABLED=true` once onboarding + licensing are confirmed. When enabled,
// `planRoute` routes NGN→NGN through Bachs instead of Paystack.
export const BACHS_ENABLED = process.env.BACHS_ENABLED === 'true';

// True when SOME naira corridor is live. The naira kill switch (in planRoute)
// only rejects a pure NGN→NGN collection when EVERY corridor is down.
export const NAIRA_ENABLED = PAYSTACK_ENABLED || BACHS_ENABLED;

// User-facing message when a naira collection is attempted while every naira
// corridor is disabled. Kept here so the copy is identical everywhere it surfaces.
export const NAIRA_DISABLED_MESSAGE =
  'Naira card & bank payments are temporarily unavailable. Please pay with crypto instead.';

/** Basic-tier (email verified, not KYB) rolling 30-day order cap. */
export function basicMonthlyOrderLimit(): number {
  const n = Number(process.env.BASIC_MONTHLY_ORDER_LIMIT ?? 30);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
}

/** Publishable key(s) used on paywithweave.com/demo — exempt from basic-tier cap. */
export function isWeaveDemoPublishableKey(key: string | undefined): boolean {
  const k = key?.trim();
  if (!k) return false;
  const allowed = (process.env.WEAVE_DEMO_PUBLISHABLE_KEY ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.includes(k);
}

// Anonymous Stellar deposits. 1Click refuses every Stellar-ORIGIN quote, so a
// Stellar USDC payer we can't ask for a signature (an exchange, a phone wallet,
// a payment link) has no NEAR route. With this on, `planRoute` collects their
// USDC on the Weave treasury (address + per-order memo) and settles it through
// the treasury bridge instead. Off by default: it must not be enabled before the
// matching/recovery hardening is in place. Fiat payouts only for now — the
// treasury bridge forwards to Paycrest, nothing else. Read at call time.
export function stellarAnonymousDepositsEnabled(): boolean {
  return process.env.STELLAR_ANONYMOUS_DEPOSITS_ENABLED === 'true';
}
