-- CreateTable
CREATE TABLE "PayoutLink" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceAsset" TEXT NOT NULL,
    "payoutCurrency" TEXT NOT NULL DEFAULT 'NGN',
    "amount" DECIMAL(18,8),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayoutLink_merchantId_idx" ON "PayoutLink"("merchantId");

-- AddForeignKey
ALTER TABLE "PayoutLink" ADD CONSTRAINT "PayoutLink_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

