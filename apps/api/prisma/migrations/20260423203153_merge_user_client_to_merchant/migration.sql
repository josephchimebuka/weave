-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: merge_user_client_to_merchant
--
-- The shadow database only has what's in migration history. KeyPair was created
-- directly in the real DB and never migrated, so we create it here first.
--
-- Strategy (nullable → backfill → NOT NULL) keeps existing data intact.
-- Client.id becomes Merchant.id so all existing FK values are preserved.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create KeyPair (missing from migration history, exists in real DB) ───────
CREATE TABLE IF NOT EXISTS "KeyPair" (
    "id"              TEXT        NOT NULL,
    "publicKey"       TEXT        NOT NULL,
    "hashedSecretKey" TEXT        NOT NULL,
    "merchantId"      TEXT        NOT NULL,
    "isActive"        BOOLEAN     NOT NULL DEFAULT true,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KeyPair_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "KeyPair_publicKey_key" ON "KeyPair"("publicKey");
CREATE INDEX        IF NOT EXISTS "KeyPair_merchantId_idx" ON "KeyPair"("merchantId");

-- 2. Create Merchant ──────────────────────────────────────────────────────────
CREATE TABLE "Merchant" (
    "id"                        TEXT         NOT NULL,
    "email"                     TEXT         NOT NULL,
    "passwordHash"              TEXT,
    "name"                      TEXT         NOT NULL,
    "kycLevel"                  TEXT         NOT NULL DEFAULT 'none',
    "publishableKey"            TEXT         NOT NULL,
    "defaultPayoutInstrumentId" TEXT,
    "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Merchant_email_key"          ON "Merchant"("email");
CREATE UNIQUE INDEX "Merchant_publishableKey_key" ON "Merchant"("publishableKey");

-- 3. Populate Merchant from Client + User ────────────────────────────────────
--    Client.id → Merchant.id so Order.clientId values remain valid.
INSERT INTO "Merchant" (
    "id", "email", "passwordHash", "name", "kycLevel",
    "publishableKey", "defaultPayoutInstrumentId", "createdAt", "updatedAt"
)
SELECT
    c.id,
    COALESCE(u.email, c.id || '@migrated.local'),
    u."passwordHash",
    c.name,
    COALESCE(u."kycLevel", 'none'),
    CASE
        WHEN c."apiKey" LIKE '%|%' THEN SPLIT_PART(c."apiKey", '|', 1)
        ELSE c."apiKey"
    END,
    c."defaultPayoutInstrumentId",
    c."createdAt",
    c."updatedAt"
FROM "Client" c
LEFT JOIN "User" u ON u.id = c."userId";

-- 4. Sync KeyPair rows: clientId → merchantId ─────────────────────────────────
-- In the real DB KeyPair.merchantId already exists pointing at old Client IDs.
-- In the shadow DB we just created it above pointing at Merchant (same IDs).
-- No data movement needed; the column + FK will be wired at the end.

-- 5. Session: userId → merchantId ─────────────────────────────────────────────
ALTER TABLE "Session" ADD COLUMN "merchantId" TEXT;
UPDATE "Session" s
SET "merchantId" = c.id
FROM "Client" c
WHERE c."userId" = s."userId";
DELETE FROM "Session" WHERE "merchantId" IS NULL; -- orphaned sessions
ALTER TABLE "Session" ALTER COLUMN "merchantId" SET NOT NULL;
ALTER TABLE "Session" DROP COLUMN "userId";
ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_userId_fkey";
ALTER TABLE "Session" ADD CONSTRAINT "Session_merchantId_fkey"
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DROP INDEX IF EXISTS "Session_userId_idx";
CREATE INDEX "Session_merchantId_idx" ON "Session"("merchantId");

-- 6. Order: clientId → merchantId ─────────────────────────────────────────────
ALTER TABLE "Order" ADD COLUMN "merchantId" TEXT;
UPDATE "Order" SET "merchantId" = "clientId";
ALTER TABLE "Order" ALTER COLUMN "merchantId" SET NOT NULL;
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_clientId_fkey";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_userId_fkey";
DROP INDEX IF EXISTS "Order_clientId_idx";
DROP INDEX IF EXISTS "Order_userId_idx";
ALTER TABLE "Order" DROP COLUMN "clientId";
ALTER TABLE "Order" DROP COLUMN "userId";
ALTER TABLE "Order" ADD CONSTRAINT "Order_merchantId_fkey"
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Order_merchantId_idx" ON "Order"("merchantId");

-- 7. Instrument: drop userId/ownerType, re-point FK to Merchant ───────────────
-- Re-assign user-owned instruments to their merchant
UPDATE "Instrument" i
SET "merchantId" = c.id
FROM "Client" c
WHERE i."userId" IS NOT NULL
  AND c."userId" = i."userId"
  AND i."merchantId" IS NULL;

ALTER TABLE "Instrument" DROP CONSTRAINT IF EXISTS "Instrument_userId_fkey";
ALTER TABLE "Instrument" DROP CONSTRAINT IF EXISTS "Instrument_merchantId_fkey";
DROP INDEX IF EXISTS "Instrument_userId_idx";
DROP INDEX IF EXISTS "Instrument_ownerType_assetKey_idx";
ALTER TABLE "Instrument" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "Instrument" DROP COLUMN IF EXISTS "ownerType";
ALTER TABLE "Instrument" ADD CONSTRAINT "Instrument_merchantId_fkey"
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Instrument_assetKey_idx" ON "Instrument"("assetKey");

-- 8. Wire KeyPair FK to Merchant ───────────────────────────────────────────────
ALTER TABLE "KeyPair" DROP CONSTRAINT IF EXISTS "KeyPair_clientId_fkey";
ALTER TABLE "KeyPair" DROP CONSTRAINT IF EXISTS "KeyPair_merchantId_fkey";
ALTER TABLE "KeyPair" ADD CONSTRAINT "KeyPair_merchantId_fkey"
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 9. Drop old tables ───────────────────────────────────────────────────────────
ALTER TABLE "Client" DROP CONSTRAINT IF EXISTS "Client_userId_fkey";
DROP TABLE "Client";
DROP TABLE "User";
