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

// User-facing message when a naira (Paystack) collection is attempted while the
// provider is disabled. Kept here so the copy is identical everywhere it surfaces.
export const NAIRA_DISABLED_MESSAGE =
  'Naira card & bank payments are temporarily unavailable. Please pay with crypto instead.';
