ALTER TABLE "Merchant" ADD COLUMN "sandboxPublishableKey" TEXT;
CREATE UNIQUE INDEX "Merchant_sandboxPublishableKey_key" ON "Merchant"("sandboxPublishableKey");

-- Backfill existing merchants with a test key
UPDATE "Merchant"
SET "sandboxPublishableKey" = 'pk_test_' || encode(gen_random_bytes(24), 'hex')
WHERE "sandboxPublishableKey" IS NULL;

ALTER TABLE "Order" ADD COLUMN "sandboxMode" BOOLEAN NOT NULL DEFAULT FALSE;
