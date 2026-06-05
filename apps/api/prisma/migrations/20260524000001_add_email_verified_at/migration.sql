-- Add emailVerifiedAt to Merchant.
-- Nullable column — existing rows get NULL (unverified), no data loss.
ALTER TABLE "Merchant" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
