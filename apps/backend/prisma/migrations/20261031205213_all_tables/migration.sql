-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_rates" (
    "id" TEXT NOT NULL,
    "shippingService" TEXT NOT NULL,
    "shippingFeePerItem" DOUBLE PRECISION NOT NULL,
    "shippingFeeForAdditionalItem" DOUBLE PRECISION NOT NULL,
    "shippingFeePerKg" DOUBLE PRECISION NOT NULL,
    "shippingFeeFixed" DOUBLE PRECISION NOT NULL,
    "deliveryTimeMin" INTEGER NOT NULL,
    "deliveryTimeMax" INTEGER NOT NULL,
    "returnPolicy" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "free_shippings" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "free_shippings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "free_shipping_countries" (
    "id" TEXT NOT NULL,
    "freeShippingId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "free_shipping_countries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_name_key" ON "countries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE INDEX "shipping_rates_countryId_idx" ON "shipping_rates"("countryId");

-- CreateIndex
CREATE INDEX "shipping_rates_storeId_idx" ON "shipping_rates"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "free_shippings_productId_key" ON "free_shippings"("productId");

-- CreateIndex
CREATE INDEX "free_shipping_countries_countryId_idx" ON "free_shipping_countries"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "free_shipping_countries_freeShippingId_countryId_key" ON "free_shipping_countries"("freeShippingId", "countryId");

-- AddForeignKey
ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_shippings" ADD CONSTRAINT "free_shippings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_shipping_countries" ADD CONSTRAINT "free_shipping_countries_freeShippingId_fkey" FOREIGN KEY ("freeShippingId") REFERENCES "free_shippings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "free_shipping_countries" ADD CONSTRAINT "free_shipping_countries_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
