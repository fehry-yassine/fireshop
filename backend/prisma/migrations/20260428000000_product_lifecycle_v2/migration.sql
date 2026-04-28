-- Remove the legacy draft state from the marketplace product lifecycle.
-- Existing draft products become pending products so they require admin review.
ALTER TYPE "ProductStatus" RENAME TO "ProductStatus_old";

CREATE TYPE "ProductStatus" AS ENUM (
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
            WHEN 'DRAFT' THEN 'PENDING_APPROVAL'
            ELSE "status"::text
        END
    )::"ProductStatus";

ALTER TABLE "Product" ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL';

DROP TYPE "ProductStatus_old";
