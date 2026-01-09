/*
  Warnings:

  - The values [ACTIVE,INACTIVE] on the enum `AdminStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AdminStatus_new" AS ENUM ('VERIFIED', 'PENDING', 'NONE');
ALTER TABLE "Admin" ALTER COLUMN "status" TYPE "AdminStatus_new" USING ("status"::text::"AdminStatus_new");
ALTER TYPE "AdminStatus" RENAME TO "AdminStatus_old";
ALTER TYPE "AdminStatus_new" RENAME TO "AdminStatus";
DROP TYPE "AdminStatus_old";
COMMIT;
