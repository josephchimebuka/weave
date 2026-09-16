-- Track reserved (permanent) virtual NUBANs so a cleanup sweep can deactivate them
-- once their order is terminal. Dynamic accounts self-expire and leave these null.
ALTER TABLE "RouteStep" ADD COLUMN "anchorReservedNubanId" TEXT,
                        ADD COLUMN "anchorNubanReleasedAt" TIMESTAMP(3);
