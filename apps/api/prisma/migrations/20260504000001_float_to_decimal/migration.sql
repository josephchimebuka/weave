-- Float → Decimal migration for all monetary fields
-- NUMERIC(36,18) for asset amounts (handles 18-decimal tokens through whole-number fiat)
-- NUMERIC(18,8)  for USD fee values

ALTER TABLE "Order"
  ALTER COLUMN "sourceAmount" TYPE NUMERIC(36,18) USING "sourceAmount"::NUMERIC,
  ALTER COLUMN "destAmount"   TYPE NUMERIC(36,18) USING "destAmount"::NUMERIC,
  ALTER COLUMN "quoteRate"    TYPE NUMERIC(36,18) USING "quoteRate"::NUMERIC,
  ALTER COLUMN "senderFeeUsd" TYPE NUMERIC(18,8)  USING "senderFeeUsd"::NUMERIC,
  ALTER COLUMN "appFeeUsd"    TYPE NUMERIC(18,8)  USING "appFeeUsd"::NUMERIC,
  ALTER COLUMN "bridgeFeeUsd" TYPE NUMERIC(18,8)  USING "bridgeFeeUsd"::NUMERIC;

ALTER TABLE "RouteStep"
  ALTER COLUMN "amountIn"  TYPE NUMERIC(36,18) USING "amountIn"::NUMERIC,
  ALTER COLUMN "amountOut" TYPE NUMERIC(36,18) USING "amountOut"::NUMERIC,
  ALTER COLUMN "feeUsd"    TYPE NUMERIC(18,8)  USING "feeUsd"::NUMERIC;

ALTER TABLE "PaymentLink"
  ALTER COLUMN "amount" TYPE NUMERIC(18,8) USING "amount"::NUMERIC;
