-- Product lifecycle cleanup: remove unused APPROVED state.
-- Any legacy APPROVED products are kept public as PUBLISHED.

UPDATE "Product"
SET "status" = 'PUBLISHED'
WHERE "status" = 'APPROVED';

ALTER TYPE "ProductStatus" RENAME TO "ProductStatus_old";

CREATE TYPE "ProductStatus" AS ENUM (
    'DRAFT',
    'PENDING_REVIEW',
    'PUBLISHED',
    'REJECTED',
    'ARCHIVED'
);

ALTER TABLE "Product" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Product"
    ALTER COLUMN "status" TYPE "ProductStatus"
    USING ("status"::text::"ProductStatus");

ALTER TABLE "Product" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

DROP TYPE "ProductStatus_old";
