-- Migration: add_order_reference_unique_constraint
--
-- Prevents duplicate orders for the same merchant+reference under concurrent
-- requests. NULL references are exempt: PostgreSQL treats NULL != NULL for
-- unique indexes, so merchants that omit reference are unaffected.
--
-- Deduplication guard: if any existing non-NULL (merchantId, reference) pairs
-- are already duplicated (shouldn't happen, but safe to handle), keep only
-- the oldest order per pair before applying the constraint.

DELETE FROM "Order"
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY "merchantId", "reference" ORDER BY "createdAt") AS rn
    FROM "Order"
    WHERE "reference" IS NOT NULL
  ) dupes
  WHERE rn > 1
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_merchantId_reference_key" ON "Order"("merchantId", "reference");
