-- Merchant-supplied payer identity, pure passthrough. Weave does not verify
-- any of these fields — they're echoed on the order, in webhooks, and on
-- receipt emails so merchants can attach their own customer record.
-- Shape: { email?: string, name?: string, externalId?: string }

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "customer" JSONB;

-- AlterTable
ALTER TABLE "CheckoutSession" ADD COLUMN "customer" JSONB;
