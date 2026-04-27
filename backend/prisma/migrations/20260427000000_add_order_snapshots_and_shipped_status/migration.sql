-- Add V1 shipment status for the COD order flow.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'SHIPPED';

-- Store product URL identity as an immutable order item snapshot.
ALTER TABLE "OrderItem" ADD COLUMN "productSlug" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OrderItem" ALTER COLUMN "productSlug" DROP DEFAULT;
