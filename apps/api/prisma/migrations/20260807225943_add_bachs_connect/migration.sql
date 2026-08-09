-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "bachsConnectedAccountId" TEXT,
ADD COLUMN     "bachsOnboardedAt" TIMESTAMP(3),
ADD COLUMN     "bachsPayoutDestinationId" TEXT,
ADD COLUMN     "bachsPayoutsStatus" TEXT,
ADD COLUMN     "bachsTransfersStatus" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "bachsSplitAt" TIMESTAMP(3),
ADD COLUMN     "bachsSplitStatus" TEXT,
ADD COLUMN     "bachsSplitTransferId" TEXT;

-- AlterTable
ALTER TABLE "RouteStep" ADD COLUMN     "bachsCheckoutUrl" TEXT,
ADD COLUMN     "transferGroup" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_bachsConnectedAccountId_key" ON "Merchant"("bachsConnectedAccountId");

