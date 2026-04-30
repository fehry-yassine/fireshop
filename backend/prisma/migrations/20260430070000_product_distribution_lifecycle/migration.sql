-- Restore a full product lifecycle while preserving existing marketplace data.
ALTER TYPE "ProductStatus" RENAME TO "ProductStatus_old";

CREATE TYPE "ProductStatus" AS ENUM (
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'PUBLISHED',
  'ARCHIVED'
);

ALTER TABLE "Product" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Product"
  ALTER COLUMN "status" TYPE "ProductStatus"
  USING (
    CASE "status"::text
      WHEN 'PENDING_APPROVAL' THEN 'PENDING_REVIEW'
      ELSE "status"::text
    END
  )::"ProductStatus";

ALTER TABLE "Product" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

DROP TYPE "ProductStatus_old";
