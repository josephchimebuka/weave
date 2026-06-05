-- CheckoutSessions created with a sandbox publishable key are now flagged so
-- that the hosted checkout page returns the sandbox key (not the live key),
-- ensuring the widget creates sandbox orders end-to-end.

-- AlterTable
ALTER TABLE "CheckoutSession" ADD COLUMN "sandboxMode" BOOLEAN NOT NULL DEFAULT false;
