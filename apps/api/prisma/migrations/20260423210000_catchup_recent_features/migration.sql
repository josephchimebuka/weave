-- 1. Create BusinessVerification
CREATE TABLE "BusinessVerification" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "dob" TEXT,
    "personalAddress" TEXT,
    "legalName" TEXT,
    "dba" TEXT,
    "entityType" TEXT,
    "regNumber" TEXT,
    "businessAddress" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "documentUrls" JSONB,
    "status" TEXT NOT NULL DEFAULT 'none',
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessVerification_pkey" PRIMARY KEY ("id")
);

-- 2. Create WebhookDelivery
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "orderId" TEXT,
    "event" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "response" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- 3. Create PaymentLink
CREATE TABLE "PaymentLink" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "asset" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentLink_pkey" PRIMARY KEY ("id")
);

-- 4. Add Webhook columns to Merchant
ALTER TABLE "Merchant" ADD COLUMN "webhookSecret" TEXT DEFAULT gen_random_uuid();
ALTER TABLE "Merchant" ADD COLUMN "webhookUrl" TEXT;

-- 5. Add Indices and FKs
CREATE UNIQUE INDEX "BusinessVerification_merchantId_key" ON "BusinessVerification"("merchantId");
CREATE INDEX "WebhookDelivery_merchantId_idx" ON "WebhookDelivery"("merchantId");
CREATE INDEX "WebhookDelivery_status_idx" ON "WebhookDelivery"("status");
CREATE INDEX "PaymentLink_merchantId_idx" ON "PaymentLink"("merchantId");

ALTER TABLE "BusinessVerification" ADD CONSTRAINT "BusinessVerification_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentLink" ADD CONSTRAINT "PaymentLink_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
