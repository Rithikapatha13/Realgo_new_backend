/*
  Warnings:

  - The `modules` column on the `Role` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Role" DROP COLUMN "modules",
ADD COLUMN     "modules" TEXT[];
