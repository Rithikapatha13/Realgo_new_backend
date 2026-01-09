/*
  Warnings:

  - The values [ACTIVE,INACTIVE] on the enum `StatusType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StatusType_new" AS ENUM ('VERIFIED', 'PENDING', 'NONE');
ALTER TABLE "SuperAdmin" ALTER COLUMN "status" TYPE "StatusType_new" USING ("status"::text::"StatusType_new");
ALTER TABLE "Role" ALTER COLUMN "status" TYPE "StatusType_new" USING ("status"::text::"StatusType_new");
ALTER TABLE "Showcase" ALTER COLUMN "status" TYPE "StatusType_new" USING ("status"::text::"StatusType_new");
ALTER TYPE "StatusType" RENAME TO "StatusType_old";
ALTER TYPE "StatusType_new" RENAME TO "StatusType";
DROP TYPE "StatusType_old";
COMMIT;
