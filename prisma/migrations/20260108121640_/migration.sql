-- DropIndex
DROP INDEX "Admin_email_key";

-- AlterTable
ALTER TABLE "Admin" ALTER COLUMN "email" DROP NOT NULL;
