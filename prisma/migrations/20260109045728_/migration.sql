/*
  Warnings:

  - The values [APPROVED,REJECTED,INACTIVE] on the enum `UserStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserStatus_new" AS ENUM ('VERIFIED', 'PENDING', 'NONE');
ALTER TABLE "User" ALTER COLUMN "status" TYPE "UserStatus_new" USING ("status"::text::"UserStatus_new");
ALTER TYPE "UserStatus" RENAME TO "UserStatus_old";
ALTER TYPE "UserStatus_new" RENAME TO "UserStatus";
DROP TYPE "UserStatus_old";
COMMIT;

-- DropIndex
DROP INDEX "User_email_key";

-- DropIndex
DROP INDEX "User_phone_key";

-- DropIndex
DROP INDEX "User_username_key";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "fatherOrHusband" DROP NOT NULL,
ALTER COLUMN "income" SET DATA TYPE DOUBLE PRECISION;
