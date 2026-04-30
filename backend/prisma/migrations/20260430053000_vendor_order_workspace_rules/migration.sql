-- Align order statuses with the vendor workspace V1 flow before shrinking the enum.
UPDATE "Order" SET "status" = 'CONFIRMED' WHERE "status" = 'PREPARING';
UPDATE "Order" SET "status" = 'SHIPPED' WHERE "status" = 'READY_FOR_DELIVERY';

ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;

CREATE TYPE "OrderStatus_new" AS ENUM (
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'RETURNED',
  'CANCELLED'
);

ALTER TABLE "Order"
  ALTER COLUMN "status" TYPE "OrderStatus_new"
  USING ("status"::text::"OrderStatus_new");

ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";

ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "Order" ADD COLUMN "vendorDeletedAt" TIMESTAMP(3);
CREATE INDEX "Order_vendorId_vendorDeletedAt_idx" ON "Order"("vendorId", "vendorDeletedAt");
