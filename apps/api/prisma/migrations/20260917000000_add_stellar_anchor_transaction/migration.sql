-- CreateTable
CREATE TABLE "StellarAnchorTransaction" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "accountMemo" TEXT,
    "assetCode" TEXT NOT NULL DEFAULT 'USDC',
    "status" TEXT NOT NULL DEFAULT 'incomplete',
    "lang" TEXT,
    "amountIn" DECIMAL(36,18),
    "amountOut" DECIMAL(36,18),
    "amountFee" DECIMAL(36,18),
    "orderId" TEXT,
    "withdrawAnchorAccount" TEXT,
    "withdrawMemo" TEXT,
    "withdrawMemoType" TEXT,
    "stellarTransactionId" TEXT,
    "externalTransactionId" TEXT,
    "message" TEXT,
    "refunded" BOOLEAN NOT NULL DEFAULT false,
    "interactiveTokenHash" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StellarAnchorTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StellarAnchorTransaction_orderId_key" ON "StellarAnchorTransaction"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "StellarAnchorTransaction_interactiveTokenHash_key" ON "StellarAnchorTransaction"("interactiveTokenHash");

-- CreateIndex
CREATE INDEX "StellarAnchorTransaction_account_startedAt_idx" ON "StellarAnchorTransaction"("account", "startedAt");

-- CreateIndex
CREATE INDEX "StellarAnchorTransaction_status_idx" ON "StellarAnchorTransaction"("status");

-- AddForeignKey
ALTER TABLE "StellarAnchorTransaction" ADD CONSTRAINT "StellarAnchorTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

