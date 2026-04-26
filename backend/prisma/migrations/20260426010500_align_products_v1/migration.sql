-- Replace APPROVED with PUBLISHED while preserving any existing approved products.
ALTER TYPE "ProductStatus" RENAME TO "ProductStatus_old";

CREATE TYPE "ProductStatus" AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'PUBLISHED',
    'REJECTED',
    'ARCHIVED'
);

ALTER TABLE "Product" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Product"
    ALTER COLUMN "status" TYPE "ProductStatus"
    USING (
        CASE "status"::text
            WHEN 'APPROVED' THEN 'PUBLISHED'
            ELSE "status"::text
        END
    )::"ProductStatus";

ALTER TABLE "Product" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

DROP TYPE "ProductStatus_old";

ALTER TABLE "Product" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

DROP INDEX "Product_vendorId_slug_key";
DROP INDEX "Product_status_categoryId_idx";

CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "Product_status_isActive_categoryId_idx" ON "Product"("status", "isActive", "categoryId");
CREATE INDEX "Product_vendorId_idx" ON "Product"("vendorId");
