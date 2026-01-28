/*
  Warnings:

  - You are about to drop the column `img` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `img` on the `SuperAdmin` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Admin" DROP COLUMN "img",
ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "SuperAdmin" DROP COLUMN "img",
ADD COLUMN     "image" TEXT;
