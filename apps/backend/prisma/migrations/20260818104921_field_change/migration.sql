/*
  Warnings:

  - You are about to drop the column `imagePublicId` on the `SubCategory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SubCategory" DROP COLUMN "imagePublicId",
ADD COLUMN     "imageId" TEXT;
