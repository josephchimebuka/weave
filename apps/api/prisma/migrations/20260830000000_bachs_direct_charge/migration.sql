-- Bachs Connect: switch naira collection to the DIRECT-CHARGE model.
-- All additive + nullable (no data loss).

-- Merchant: the naira-collection (merchant-persona) capability that gates order
-- creation under direct charge. `bachsTransfersStatus` is now legacy.
ALTER TABLE "Merchant" ADD COLUMN "bachsPaymentsStatus" TEXT;

-- Order: the charge model ("direct" for the new path) and the PlatformFee record
-- id read back from Bachs after a direct charge settles.
ALTER TABLE "Order" ADD COLUMN "bachsChargeType" TEXT;
ALTER TABLE "Order" ADD COLUMN "bachsPlatformFeeId" TEXT;
