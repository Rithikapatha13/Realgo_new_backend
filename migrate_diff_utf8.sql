-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('RECEIPT', 'PAYMENT', 'JOURNAL', 'CHEQUE_ISSUE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "PartyType" AS ENUM ('VENDOR', 'CUSTOMER', 'EMPLOYEE', 'OTHER');

-- CreateEnum
CREATE TYPE "FinanceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "assignedById" TEXT,
ADD COLUMN     "assocStatus" TEXT,
ADD COLUMN     "associateId" TEXT,
ADD COLUMN     "telecallerId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "availability" TEXT NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;

-- DropTable
DROP TABLE "Project_copy";

-- DropTable
DROP TABLE "project_staging";

-- DropTable
DROP TABLE "user_staging";

-- CreateTable
CREATE TABLE "AccountTree" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "parentId" TEXT,
    "type" "AccountType" NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" "FinanceStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "AccountTree_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ledger" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountTreeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bifurcated" BOOLEAN,
    "status" "FinanceStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubLedger" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" "FinanceStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "SubLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "panNumber" TEXT,
    "gstNumber" TEXT,
    "type" "PartyType" NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "referenceNumber" TEXT,
    "narration" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'ACTIVE',
    "companyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "relatedTransactionId" TEXT,
    "partyId" TEXT,
    "projectId" TEXT,
    "documentUrl" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionEntry" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "subledgerId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "entryType" "EntryType" NOT NULL,
    "narration" TEXT,
    "tdsTaxPercentage" DOUBLE PRECISION,
    "tdsTaxAmount" DOUBLE PRECISION,
    "gstTaxPercentage" DOUBLE PRECISION,
    "gstTaxAmount" DOUBLE PRECISION,
    "isTaxInclusive" BOOLEAN,
    "companyId" TEXT NOT NULL,
    "status" "FinanceStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "TransactionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "paymentQRcode" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_logs" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "telecallerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "callbackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "associateId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3),
    "notes" TEXT,
    "interested" TEXT,
    "bookingStatus" TEXT,
    "followUpDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "text" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountTree_code_companyId_key" ON "AccountTree"("code", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_referenceNumber_key" ON "Transaction"("referenceNumber");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_companyId_idx" ON "Transaction"("companyId");

-- CreateIndex
CREATE INDEX "Transaction_transactionType_idx" ON "Transaction"("transactionType");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_telecallerId_fkey" FOREIGN KEY ("telecallerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_associateId_fkey" FOREIGN KEY ("associateId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTree" ADD CONSTRAINT "AccountTree_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTree" ADD CONSTRAINT "AccountTree_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AccountTree"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_accountTreeId_fkey" FOREIGN KEY ("accountTreeId") REFERENCES "AccountTree"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ledger" ADD CONSTRAINT "Ledger_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubLedger" ADD CONSTRAINT "SubLedger_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubLedger" ADD CONSTRAINT "SubLedger_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_relatedTransactionId_fkey" FOREIGN KEY ("relatedTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionEntry" ADD CONSTRAINT "TransactionEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionEntry" ADD CONSTRAINT "TransactionEntry_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionEntry" ADD CONSTRAINT "TransactionEntry_subledgerId_fkey" FOREIGN KEY ("subledgerId") REFERENCES "SubLedger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionEntry" ADD CONSTRAINT "TransactionEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_telecallerId_fkey" FOREIGN KEY ("telecallerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_associateId_fkey" FOREIGN KEY ("associateId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


