/*
  Warnings:

  - Added the required column `imagePublicId` to the `SubCategory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SubCategory" ADD COLUMN     "imagePublicId" TEXT NOT NULL;
