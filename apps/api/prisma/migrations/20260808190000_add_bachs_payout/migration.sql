-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "bachsPayoutAt" TIMESTAMP(3),
ADD COLUMN     "bachsPayoutStatus" TEXT,
ADD COLUMN     "bachsWithdrawalId" TEXT;

