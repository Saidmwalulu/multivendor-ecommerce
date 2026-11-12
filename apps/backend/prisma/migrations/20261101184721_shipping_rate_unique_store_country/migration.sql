/*
  Warnings:

  - A unique constraint covering the columns `[storeId,countryId]` on the table `shipping_rates` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "shipping_rates_storeId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "shipping_rates_storeId_countryId_key" ON "shipping_rates"("storeId", "countryId");
