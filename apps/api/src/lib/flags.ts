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
