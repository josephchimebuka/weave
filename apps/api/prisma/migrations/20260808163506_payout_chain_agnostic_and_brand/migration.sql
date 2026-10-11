-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "brand" JSONB;

-- AlterTable
ALTER TABLE "PayoutLink" ALTER COLUMN "sourceAsset" DROP NOT NULL;

