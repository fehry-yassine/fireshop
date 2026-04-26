-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "adminNote" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Vendor_status_isActive_idx" ON "Vendor"("status", "isActive");
