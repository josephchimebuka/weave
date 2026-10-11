-- CreateIndex
CREATE INDEX "Order_merchantId_sandboxMode_createdAt_idx" ON "Order"("merchantId", "sandboxMode", "createdAt");
