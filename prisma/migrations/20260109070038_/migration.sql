/*
  Warnings:

  - The `maritalStatus` column on the `Lead` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `maritalStatus` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "maritalStatus",
ADD COLUMN     "maritalStatus" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "maritalStatus",
ADD COLUMN     "maritalStatus" TEXT;

-- DropEnum
DROP TYPE "MaritalStatus";
