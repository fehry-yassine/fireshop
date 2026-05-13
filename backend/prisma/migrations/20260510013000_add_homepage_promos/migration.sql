-- CreateEnum
CREATE TYPE "HomepagePromoType" AS ENUM ('PROMO_CARD', 'HERO_SLIDE');

-- CreateTable
CREATE TABLE "HomepagePromo" (
    "id" TEXT NOT NULL,
    "type" "HomepagePromoType" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,
    "linkUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepagePromo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomepagePromo_type_isActive_sortOrder_idx" ON "HomepagePromo"("type", "isActive", "sortOrder");
