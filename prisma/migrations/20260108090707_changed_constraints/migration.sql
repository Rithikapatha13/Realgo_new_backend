-- AlterTable
ALTER TABLE "Admin" ALTER COLUMN "lastName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SuperAdmin" ALTER COLUMN "lastName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "lastName" DROP NOT NULL;
