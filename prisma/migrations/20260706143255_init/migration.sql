-- CreateEnum
CREATE TYPE "ExposureType" AS ENUM ('SEARCH', 'FYP', 'AFFILIATE');

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "product_id" TEXT NOT NULL,
    "shop_id" TEXT,
    "name" TEXT,
    "niche" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creators" (
    "id" SERIAL NOT NULL,
    "creator_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "follower_count" INTEGER,

    CONSTRAINT "creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_exposures" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "creator_id" INTEGER,
    "exposure_type" "ExposureType" NOT NULL,
    "keyword" TEXT,
    "is_paid_ad" BOOLEAN NOT NULL DEFAULT false,
    "affiliate_count" INTEGER NOT NULL DEFAULT 0,
    "fyp_detected" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'SAVED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_exposures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_product_id_key" ON "products"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "creators_creator_id_key" ON "creators"("creator_id");

-- AddForeignKey
ALTER TABLE "ad_exposures" ADD CONSTRAINT "ad_exposures_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_exposures" ADD CONSTRAINT "ad_exposures_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE SET NULL ON UPDATE CASCADE;
