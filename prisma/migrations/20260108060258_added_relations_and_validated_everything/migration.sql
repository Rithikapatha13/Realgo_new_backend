/*
  Warnings:

  - You are about to drop the column `role` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `FollowUp` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `FollowUp` table. All the data in the column will be lost.
  - You are about to drop the column `project` on the `FollowUp` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Phase` table. All the data in the column will be lost.
  - You are about to drop the column `phases` on the `Phase` table. All the data in the column will be lost.
  - You are about to drop the column `phases` on the `Plot` table. All the data in the column will be lost.
  - The `brochures` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `images` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `highlights` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `approvals` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `sliders` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `flyers` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `videos` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `approvalCopies` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `layoutImage` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `locationHighlights` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `qrCode` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `companyId` on the `Reminder` table. All the data in the column will be lost.
  - You are about to drop the column `requestedBy` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `compId` on the `Showcase` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `SiteVisit` table. All the data in the column will be lost.
  - You are about to drop the column `companyAddress` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `nomineeAadhar` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `nomineeAge` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `nomineeAltPhone` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `nomineePanNo` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `Admin` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[domain]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `roleId` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leadPhone` to the `FollowUp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `highwayId` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `incentivesLevel` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requestedById` to the `Request` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Showcase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleId` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `createdById` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `companyId` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userAuthId` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "User_aadharCard_key";

-- DropIndex
DROP INDEX "User_panCard_key";

-- AlterTable
ALTER TABLE "Admin" DROP COLUMN "role",
ADD COLUMN     "roleId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FollowUp" DROP COLUMN "email",
DROP COLUMN "phone",
DROP COLUMN "project",
ADD COLUMN     "leadEmail" TEXT,
ADD COLUMN     "leadPhone" TEXT NOT NULL,
ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "Phase" DROP COLUMN "companyId",
DROP COLUMN "phases";

-- AlterTable
ALTER TABLE "Plot" DROP COLUMN "phases",
ADD COLUMN     "phaseId" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "highwayId" TEXT NOT NULL,
DROP COLUMN "brochures",
ADD COLUMN     "brochures" TEXT[],
DROP COLUMN "images",
ADD COLUMN     "images" TEXT[],
DROP COLUMN "highlights",
ADD COLUMN     "highlights" TEXT[],
DROP COLUMN "approvals",
ADD COLUMN     "approvals" TEXT[],
DROP COLUMN "sliders",
ADD COLUMN     "sliders" TEXT[],
DROP COLUMN "flyers",
ADD COLUMN     "flyers" TEXT[],
DROP COLUMN "videos",
ADD COLUMN     "videos" TEXT[],
DROP COLUMN "approvalCopies",
ADD COLUMN     "approvalCopies" TEXT[],
DROP COLUMN "incentivesLevel",
ADD COLUMN     "incentivesLevel" JSONB NOT NULL,
DROP COLUMN "layoutImage",
ADD COLUMN     "layoutImage" TEXT[],
DROP COLUMN "locationHighlights",
ADD COLUMN     "locationHighlights" TEXT[],
DROP COLUMN "qrCode",
ADD COLUMN     "qrCode" TEXT[];

-- AlterTable
ALTER TABLE "Reminder" DROP COLUMN "companyId";

-- AlterTable
ALTER TABLE "Request" DROP COLUMN "requestedBy",
ADD COLUMN     "requestedById" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Showcase" DROP COLUMN "compId",
ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SiteVisit" DROP COLUMN "companyId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "companyAddress",
DROP COLUMN "nomineeAadhar",
DROP COLUMN "nomineeAge",
DROP COLUMN "nomineeAltPhone",
DROP COLUMN "nomineePanNo",
DROP COLUMN "role",
ADD COLUMN     "roleId" TEXT NOT NULL,
ALTER COLUMN "createdById" SET NOT NULL,
ALTER COLUMN "companyId" SET NOT NULL,
ALTER COLUMN "userAuthId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Admin_companyId_idx" ON "Admin"("companyId");

-- CreateIndex
CREATE INDEX "Admin_roleId_idx" ON "Admin"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_email_key" ON "Company"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_domain_key" ON "Company"("domain");

-- CreateIndex
CREATE INDEX "Company_status_idx" ON "Company"("status");

-- CreateIndex
CREATE INDEX "EventLog_companyId_idx" ON "EventLog"("companyId");

-- CreateIndex
CREATE INDEX "EventLog_timeStamp_idx" ON "EventLog"("timeStamp");

-- CreateIndex
CREATE INDEX "FollowUp_userId_idx" ON "FollowUp"("userId");

-- CreateIndex
CREATE INDEX "FollowUp_companyId_idx" ON "FollowUp"("companyId");

-- CreateIndex
CREATE INDEX "FollowUp_projectId_idx" ON "FollowUp"("projectId");

-- CreateIndex
CREATE INDEX "FollowUp_date_idx" ON "FollowUp"("date");

-- CreateIndex
CREATE INDEX "Gallery_companyId_idx" ON "Gallery"("companyId");

-- CreateIndex
CREATE INDEX "Gallery_status_idx" ON "Gallery"("status");

-- CreateIndex
CREATE INDEX "Highway_companyId_idx" ON "Highway"("companyId");

-- CreateIndex
CREATE INDEX "Lead_userId_idx" ON "Lead"("userId");

-- CreateIndex
CREATE INDEX "Lead_projectInterestedIn_idx" ON "Lead"("projectInterestedIn");

-- CreateIndex
CREATE INDEX "Lead_leadStatus_idx" ON "Lead"("leadStatus");

-- CreateIndex
CREATE INDEX "Lead_date_idx" ON "Lead"("date");

-- CreateIndex
CREATE INDEX "News_companyId_idx" ON "News"("companyId");

-- CreateIndex
CREATE INDEX "News_date_idx" ON "News"("date");

-- CreateIndex
CREATE INDEX "Note_userId_idx" ON "Note"("userId");

-- CreateIndex
CREATE INDEX "Note_companyId_idx" ON "Note"("companyId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_companyId_idx" ON "Notification"("companyId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_timeStamp_idx" ON "Notification"("timeStamp");

-- CreateIndex
CREATE INDEX "Phase_projectId_idx" ON "Phase"("projectId");

-- CreateIndex
CREATE INDEX "Plot_projectId_idx" ON "Plot"("projectId");

-- CreateIndex
CREATE INDEX "Plot_phaseId_idx" ON "Plot"("phaseId");

-- CreateIndex
CREATE INDEX "Plot_companyId_idx" ON "Plot"("companyId");

-- CreateIndex
CREATE INDEX "Plot_plotStatus_idx" ON "Plot"("plotStatus");

-- CreateIndex
CREATE INDEX "Portrait_companyId_idx" ON "Portrait"("companyId");

-- CreateIndex
CREATE INDEX "Project_companyId_idx" ON "Project"("companyId");

-- CreateIndex
CREATE INDEX "Project_highwayId_idx" ON "Project"("highwayId");

-- CreateIndex
CREATE INDEX "PushNotification_userId_idx" ON "PushNotification"("userId");

-- CreateIndex
CREATE INDEX "PushNotification_companyId_idx" ON "PushNotification"("companyId");

-- CreateIndex
CREATE INDEX "Reminder_userId_idx" ON "Reminder"("userId");

-- CreateIndex
CREATE INDEX "Reminder_date_idx" ON "Reminder"("date");

-- CreateIndex
CREATE INDEX "Request_userId_idx" ON "Request"("userId");

-- CreateIndex
CREATE INDEX "Request_requestedById_idx" ON "Request"("requestedById");

-- CreateIndex
CREATE INDEX "Request_status_idx" ON "Request"("status");

-- CreateIndex
CREATE INDEX "Role_companyId_idx" ON "Role"("companyId");

-- CreateIndex
CREATE INDEX "Role_status_idx" ON "Role"("status");

-- CreateIndex
CREATE INDEX "Showcase_companyId_idx" ON "Showcase"("companyId");

-- CreateIndex
CREATE INDEX "SiteVisit_userId_idx" ON "SiteVisit"("userId");

-- CreateIndex
CREATE INDEX "SiteVisit_date_idx" ON "SiteVisit"("date");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_referId_idx" ON "User"("referId");

-- CreateIndex
CREATE INDEX "User_teamHeadId_idx" ON "User"("teamHeadId");

-- CreateIndex
CREATE INDEX "Video_companyId_idx" ON "Video"("companyId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referId_fkey" FOREIGN KEY ("referId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamHeadId_fkey" FOREIGN KEY ("teamHeadId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "News" ADD CONSTRAINT "News_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gallery" ADD CONSTRAINT "Gallery_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portrait" ADD CONSTRAINT "Portrait_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Phase" ADD CONSTRAINT "Phase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_highwayId_fkey" FOREIGN KEY ("highwayId") REFERENCES "Highway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plot" ADD CONSTRAINT "Plot_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plot" ADD CONSTRAINT "Plot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plot" ADD CONSTRAINT "Plot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Highway" ADD CONSTRAINT "Highway_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_projectInterestedIn_fkey" FOREIGN KEY ("projectInterestedIn") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Showcase" ADD CONSTRAINT "Showcase_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushNotification" ADD CONSTRAINT "PushNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushNotification" ADD CONSTRAINT "PushNotification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
