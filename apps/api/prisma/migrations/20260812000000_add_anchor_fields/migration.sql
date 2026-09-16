-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "anchorCustomerId" TEXT,
ADD COLUMN     "anchorAccountId" TEXT,
ADD COLUMN     "anchorAccountNumber" TEXT,
ADD COLUMN     "anchorBankName" TEXT,
ADD COLUMN     "anchorKybStatus" TEXT,
ADD COLUMN     "anchorOnboardedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "anchorPayinId" TEXT,
ADD COLUMN     "anchorFeeTransferId" TEXT,
ADD COLUMN     "anchorSettledAt" TIMESTAMP(3),
ADD COLUMN     "anchorPayoutStatus" TEXT,
ADD COLUMN     "anchorPayoutTransferId" TEXT,
ADD COLUMN     "anchorPayoutAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RouteStep" ADD COLUMN     "anchorAccountNumber" TEXT,
ADD COLUMN     "anchorBankName" TEXT,
ADD COLUMN     "anchorReference" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_anchorCustomerId_key" ON "Merchant"("anchorCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_anchorAccountId_key" ON "Merchant"("anchorAccountId");
