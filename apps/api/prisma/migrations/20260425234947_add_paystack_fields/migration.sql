-- CreateEnum
CREATE TYPE "SubaccountSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "paystackSubaccountCode" TEXT,
ADD COLUMN     "paystackSubaccountStatus" "SubaccountSyncStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "paystackSubaccountSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RouteStep" ADD COLUMN     "dvaExpiresAt" TIMESTAMP(3),
ADD COLUMN     "paystackDvaAcct" TEXT,
ADD COLUMN     "paystackDvaBank" TEXT,
ADD COLUMN     "paystackDvaRef" TEXT;
