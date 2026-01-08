/*
  Warnings:

  - You are about to drop the column `alternative_phone` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `company_name` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `first_name` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `password_changed` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `role_name` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `user_auth_id` on the `Admin` table. All the data in the column will be lost.
  - You are about to drop the column `authIdGeneration` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `auth_id_prefix` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `company_term` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `opening_balance` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `opening_balance_date` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `opening_balance_type` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `primary_colour` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `secondary_colour` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `transaction_prefix` on the `Company` table. All the data in the column will be lost.
  - The `modules` column on the `Company` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `company_id` on the `FollowUp` table. All the data in the column will be lost.
  - You are about to drop the column `followup_status` on the `FollowUp` table. All the data in the column will be lost.
  - You are about to drop the column `followup_type` on the `FollowUp` table. All the data in the column will be lost.
  - You are about to drop the column `lead_name` on the `FollowUp` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `FollowUp` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `Gallery` table. All the data in the column will be lost.
  - You are about to drop the column `file_category` on the `Gallery` table. All the data in the column will be lost.
  - You are about to drop the column `file_name` on the `Gallery` table. All the data in the column will be lost.
  - You are about to drop the column `scheduled_at` on the `Gallery` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `Highway` table. All the data in the column will be lost.
  - You are about to drop the column `highway_icon` on the `Highway` table. All the data in the column will be lost.
  - You are about to drop the column `highway_name` on the `Highway` table. All the data in the column will be lost.
  - You are about to drop the column `additional_information` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `assigned_to` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `first_interaction_date` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `follow_up_date` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `lead_age` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `lead_category` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `lead_city` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `lead_company` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `lead_contact` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `lead_email` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `lead_name` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `lead_occupation` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `lead_source` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `lead_status` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `marital_status` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `project_interested_in` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `News` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `note_description` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `note_title` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `Note` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `company_name` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `notification_type` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `time_stamp` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `Phase` table. All the data in the column will be lost.
  - You are about to drop the column `phase_name` on the `Phase` table. All the data in the column will be lost.
  - You are about to drop the column `project_id` on the `Phase` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `Plot` table. All the data in the column will be lost.
  - You are about to drop the column `customer_address` on the `Plot` table. All the data in the column will be lost.
  - You are about to drop the column `customer_contact` on the `Plot` table. All the data in the column will be lost.
  - You are about to drop the column `customer_name` on the `Plot` table. All the data in the column will be lost.
  - You are about to drop the column `payment_status` on the `Plot` table. All the data in the column will be lost.
  - You are about to drop the column `payment_type` on the `Plot` table. All the data in the column will be lost.
  - You are about to drop the column `plot_booing_number` on the `Plot` table. All the data in the column will be lost.
  - You are about to drop the column `plot_booking_plan` on the `Plot` table. All the data in the column will be lost.
  - You are about to drop the column `plot_category` on the `Plot` table. All the data in the column will be lost.
  - You are about to drop the column `plot_number` on the `Plot` table. All the data in the column will be lost.
  - You are about to drop the column `plot_status` on the `Plot` table. All the data in the column will be lost.
  - You are about to drop the column `project_id` on the `Plot` table. All the data in the column will be lost.
  - You are about to drop the column `project_name` on the `Plot` table. All the data in the column will be lost.
  - You are about to drop the column `sqr_yards` on the `Plot` table. All the data in the column will be lost.
  - You are about to drop the column `QR_code` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `approval_copies` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `incentives_level` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `layout_image` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `location_highlights` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `project_address` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `project_descripition` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `project_image` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `project_name` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `project_virtual_view_link` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `project_website_url` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `Reminder` table. All the data in the column will be lost.
  - You are about to drop the column `selected_days` on the `Reminder` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `Reminder` table. All the data in the column will be lost.
  - You are about to drop the column `request_type` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `requested_by` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `requested_name` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `company_name` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `display_name` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `role_name` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `role_no` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `comp_id` on the `Showcase` table. All the data in the column will be lost.
  - You are about to drop the column `file_category` on the `Showcase` table. All the data in the column will be lost.
  - You are about to drop the column `file_name` on the `Showcase` table. All the data in the column will be lost.
  - You are about to drop the column `change_log` on the `SiteVisit` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `SiteVisit` table. All the data in the column will be lost.
  - You are about to drop the column `lead_name` on the `SiteVisit` table. All the data in the column will be lost.
  - You are about to drop the column `site_visit_picture` on the `SiteVisit` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `SiteVisit` table. All the data in the column will be lost.
  - You are about to drop the column `first_name` on the `SuperAdmin` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `SuperAdmin` table. All the data in the column will be lost.
  - You are about to drop the column `password_changed` on the `SuperAdmin` table. All the data in the column will be lost.
  - You are about to drop the column `role_name` on the `SuperAdmin` table. All the data in the column will be lost.
  - You are about to drop the column `temp_pass_token` on the `SuperAdmin` table. All the data in the column will be lost.
  - You are about to drop the column `temp_token_expired_at` on the `SuperAdmin` table. All the data in the column will be lost.
  - You are about to drop the column `user_auth_id` on the `SuperAdmin` table. All the data in the column will be lost.
  - You are about to drop the column `company_id` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `video_link` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `video_name` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `video_title` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the `Event_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Potrait` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Users` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `push_notification` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `companyId` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `authIdType` to the `Company` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `FollowUp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `followUpStatus` to the `FollowUp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `followUpType` to the `FollowUp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leadName` to the `FollowUp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `FollowUp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Gallery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileCategory` to the `Gallery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileName` to the `Gallery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Highway` table without a default value. This is not possible if the table is not empty.
  - Added the required column `highwayName` to the `Highway` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leadContact` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leadName` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leadSource` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leadStatus` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `News` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Note` table without a default value. This is not possible if the table is not empty.
  - Added the required column `noteTitle` to the `Note` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Note` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyName` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `notificationType` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Phase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phaseName` to the `Phase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `Phase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Plot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plotCategory` to the `Plot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plotNumber` to the `Plot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plotStatus` to the `Plot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `Plot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectName` to the `Plot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sqrYards` to the `Plot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectAddress` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectName` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Reminder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Reminder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requestType` to the `Request` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requestedBy` to the `Request` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requestedName` to the `Request` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Request` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyName` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `displayName` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleName` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleNo` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `compId` to the `Showcase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileCategory` to the `Showcase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileName` to the `Showcase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `SiteVisit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leadName` to the `SiteVisit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `SiteVisit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `SuperAdmin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `SuperAdmin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordChanged` to the `SuperAdmin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleName` to the `SuperAdmin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `videoLink` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `videoName` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `videoTitle` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'INACTIVE';

-- DropIndex
DROP INDEX "Admin_email_key";

-- DropIndex
DROP INDEX "Admin_user_auth_id_key";

-- DropIndex
DROP INDEX "Admin_username_key";

-- DropIndex
DROP INDEX "Company_email_key";

-- AlterTable
ALTER TABLE "Admin" DROP COLUMN "alternative_phone",
DROP COLUMN "company_id",
DROP COLUMN "company_name",
DROP COLUMN "first_name",
DROP COLUMN "last_name",
DROP COLUMN "password_changed",
DROP COLUMN "role_name",
DROP COLUMN "user_auth_id",
ADD COLUMN     "alternativePhone" TEXT,
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "passwordChanged" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "authIdGeneration",
DROP COLUMN "auth_id_prefix",
DROP COLUMN "company_term",
DROP COLUMN "opening_balance",
DROP COLUMN "opening_balance_date",
DROP COLUMN "opening_balance_type",
DROP COLUMN "primary_colour",
DROP COLUMN "secondary_colour",
DROP COLUMN "transaction_prefix",
ADD COLUMN     "authIdPrefix" TEXT,
ADD COLUMN     "authIdType" "AuthIdGenerationType" NOT NULL,
ADD COLUMN     "companyTerm" TEXT,
ADD COLUMN     "openingBalance" INTEGER,
ADD COLUMN     "openingBalanceDate" TIMESTAMP(3),
ADD COLUMN     "openingBalanceType" "BalanceType",
ADD COLUMN     "primaryColour" TEXT,
ADD COLUMN     "secondaryColour" TEXT,
ADD COLUMN     "transactionPrefix" TEXT,
DROP COLUMN "modules",
ADD COLUMN     "modules" TEXT[];

-- AlterTable
ALTER TABLE "FollowUp" DROP COLUMN "company_id",
DROP COLUMN "followup_status",
DROP COLUMN "followup_type",
DROP COLUMN "lead_name",
DROP COLUMN "user_id",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "followUpStatus" "FollowUpStatus" NOT NULL,
ADD COLUMN     "followUpType" TEXT NOT NULL,
ADD COLUMN     "leadName" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Gallery" DROP COLUMN "company_id",
DROP COLUMN "file_category",
DROP COLUMN "file_name",
DROP COLUMN "scheduled_at",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "fileCategory" TEXT NOT NULL,
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "scheduledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Highway" DROP COLUMN "company_id",
DROP COLUMN "highway_icon",
DROP COLUMN "highway_name",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "highwayIcon" TEXT,
ADD COLUMN     "highwayName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "additional_information",
DROP COLUMN "assigned_to",
DROP COLUMN "company_id",
DROP COLUMN "first_interaction_date",
DROP COLUMN "follow_up_date",
DROP COLUMN "lead_age",
DROP COLUMN "lead_category",
DROP COLUMN "lead_city",
DROP COLUMN "lead_company",
DROP COLUMN "lead_contact",
DROP COLUMN "lead_email",
DROP COLUMN "lead_name",
DROP COLUMN "lead_occupation",
DROP COLUMN "lead_source",
DROP COLUMN "lead_status",
DROP COLUMN "marital_status",
DROP COLUMN "project_interested_in",
DROP COLUMN "user_id",
ADD COLUMN     "additionalInformation" TEXT,
ADD COLUMN     "assignedTo" TEXT,
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "firstInteractionDate" TIMESTAMP(3),
ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "leadAge" INTEGER,
ADD COLUMN     "leadCategory" TEXT,
ADD COLUMN     "leadCity" TEXT,
ADD COLUMN     "leadCompany" TEXT,
ADD COLUMN     "leadContact" TEXT NOT NULL,
ADD COLUMN     "leadEmail" TEXT,
ADD COLUMN     "leadName" TEXT NOT NULL,
ADD COLUMN     "leadOccupation" TEXT,
ADD COLUMN     "leadSource" TEXT NOT NULL,
ADD COLUMN     "leadStatus" TEXT NOT NULL,
ADD COLUMN     "maritalStatus" "MaritalStatus",
ADD COLUMN     "projectInterestedIn" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "News" DROP COLUMN "company_id",
ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Note" DROP COLUMN "company_id",
DROP COLUMN "note_description",
DROP COLUMN "note_title",
DROP COLUMN "user_id",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "noteDescription" TEXT,
ADD COLUMN     "noteTitle" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "company_id",
DROP COLUMN "company_name",
DROP COLUMN "notification_type",
DROP COLUMN "time_stamp",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "companyName" TEXT NOT NULL,
ADD COLUMN     "notificationType" TEXT NOT NULL,
ADD COLUMN     "timeStamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Phase" DROP COLUMN "company_id",
DROP COLUMN "phase_name",
DROP COLUMN "project_id",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "phaseName" TEXT NOT NULL,
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Plot" DROP COLUMN "company_id",
DROP COLUMN "customer_address",
DROP COLUMN "customer_contact",
DROP COLUMN "customer_name",
DROP COLUMN "payment_status",
DROP COLUMN "payment_type",
DROP COLUMN "plot_booing_number",
DROP COLUMN "plot_booking_plan",
DROP COLUMN "plot_category",
DROP COLUMN "plot_number",
DROP COLUMN "plot_status",
DROP COLUMN "project_id",
DROP COLUMN "project_name",
DROP COLUMN "sqr_yards",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "customerAddress" TEXT,
ADD COLUMN     "customerContact" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "paymentStatus" TEXT,
ADD COLUMN     "paymentType" TEXT,
ADD COLUMN     "plotBookingNumber" TEXT,
ADD COLUMN     "plotBookingPlan" TEXT,
ADD COLUMN     "plotCategory" TEXT NOT NULL,
ADD COLUMN     "plotNumber" TEXT NOT NULL,
ADD COLUMN     "plotStatus" TEXT NOT NULL,
ADD COLUMN     "projectId" TEXT NOT NULL,
ADD COLUMN     "projectName" TEXT NOT NULL,
ADD COLUMN     "sqrYards" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "QR_code",
DROP COLUMN "approval_copies",
DROP COLUMN "company_id",
DROP COLUMN "incentives_level",
DROP COLUMN "layout_image",
DROP COLUMN "location_highlights",
DROP COLUMN "project_address",
DROP COLUMN "project_descripition",
DROP COLUMN "project_image",
DROP COLUMN "project_name",
DROP COLUMN "project_virtual_view_link",
DROP COLUMN "project_website_url",
ADD COLUMN     "approvalCopies" TEXT,
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "incentivesLevel" TEXT,
ADD COLUMN     "layoutImage" TEXT,
ADD COLUMN     "locationHighlights" TEXT,
ADD COLUMN     "projectAddress" TEXT NOT NULL,
ADD COLUMN     "projectDescription" TEXT,
ADD COLUMN     "projectImage" TEXT,
ADD COLUMN     "projectName" TEXT NOT NULL,
ADD COLUMN     "projectVirtualViewLink" TEXT,
ADD COLUMN     "projectWebsiteUrl" TEXT,
ADD COLUMN     "qrCode" TEXT;

-- AlterTable
ALTER TABLE "Reminder" DROP COLUMN "company_id",
DROP COLUMN "selected_days",
DROP COLUMN "user_id",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "selectedDays" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Request" DROP COLUMN "request_type",
DROP COLUMN "requested_by",
DROP COLUMN "requested_name",
DROP COLUMN "user_id",
ADD COLUMN     "requestType" TEXT NOT NULL,
ADD COLUMN     "requestedBy" TEXT NOT NULL,
ADD COLUMN     "requestedName" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "company_id",
DROP COLUMN "company_name",
DROP COLUMN "display_name",
DROP COLUMN "role_name",
DROP COLUMN "role_no",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "companyName" TEXT NOT NULL,
ADD COLUMN     "displayName" TEXT NOT NULL,
ADD COLUMN     "roleName" TEXT NOT NULL,
ADD COLUMN     "roleNo" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Showcase" DROP COLUMN "comp_id",
DROP COLUMN "file_category",
DROP COLUMN "file_name",
ADD COLUMN     "compId" TEXT NOT NULL,
ADD COLUMN     "fileCategory" TEXT NOT NULL,
ADD COLUMN     "fileName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SiteVisit" DROP COLUMN "change_log",
DROP COLUMN "company_id",
DROP COLUMN "lead_name",
DROP COLUMN "site_visit_picture",
DROP COLUMN "user_id",
ADD COLUMN     "changeLog" TEXT,
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "leadName" TEXT NOT NULL,
ADD COLUMN     "siteVisitPicture" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SuperAdmin" DROP COLUMN "first_name",
DROP COLUMN "last_name",
DROP COLUMN "password_changed",
DROP COLUMN "role_name",
DROP COLUMN "temp_pass_token",
DROP COLUMN "temp_token_expired_at",
DROP COLUMN "user_auth_id",
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "passwordChanged" BOOLEAN NOT NULL,
ADD COLUMN     "roleName" TEXT NOT NULL,
ADD COLUMN     "tempPassToken" TEXT,
ADD COLUMN     "tempTokenExpiredAt" TIMESTAMP(3),
ADD COLUMN     "userAuthId" TEXT;

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "company_id",
DROP COLUMN "video_link",
DROP COLUMN "video_name",
DROP COLUMN "video_title",
ADD COLUMN     "companyId" TEXT NOT NULL,
ADD COLUMN     "videoLink" TEXT NOT NULL,
ADD COLUMN     "videoName" TEXT NOT NULL,
ADD COLUMN     "videoTitle" TEXT NOT NULL;

-- DropTable
DROP TABLE "Event_logs";

-- DropTable
DROP TABLE "Potrait";

-- DropTable
DROP TABLE "Users";

-- DropTable
DROP TABLE "push_notification";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "fatherOrHusband" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "bloodGroup" "BloodGroup",
    "position" TEXT,
    "income" INTEGER,
    "academicQual" TEXT,
    "languages" TEXT[],
    "maritalStatus" "MaritalStatus",
    "spouseName" TEXT,
    "spousePhone" TEXT,
    "image" TEXT,
    "dob" TIMESTAMP(3) NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "aadharCard" TEXT,
    "aadharNo" TEXT,
    "panCard" TEXT,
    "panNo" TEXT,
    "nomineeName" TEXT,
    "nomineePhone" TEXT,
    "nomineeAltPhone" TEXT,
    "nomineeRelation" TEXT,
    "nomineeAge" INTEGER,
    "nomineePanNo" TEXT,
    "nomineeAadhar" TEXT,
    "addressLine" TEXT,
    "landmark" TEXT,
    "pinCode" TEXT,
    "bankName" TEXT,
    "branch" TEXT,
    "accountHolder" TEXT,
    "bankAccountNo" TEXT,
    "ifsc" TEXT,
    "referId" TEXT,
    "createdById" TEXT,
    "companyId" TEXT,
    "companyAddress" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "userAuthId" TEXT,
    "teamHeadId" TEXT,
    "reasonForReject" TEXT,
    "status" "UserStatus" NOT NULL,
    "passwordChanged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portrait" (
    "id" TEXT NOT NULL,
    "videoTitle" TEXT NOT NULL,
    "videoName" TEXT,
    "videoLink" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portrait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "lastRequest" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeStamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "actionBy" TEXT NOT NULL,
    "actionDescription" TEXT NOT NULL,
    "timeStamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_aadharCard_key" ON "User"("aadharCard");

-- CreateIndex
CREATE UNIQUE INDEX "User_aadharNo_key" ON "User"("aadharNo");

-- CreateIndex
CREATE UNIQUE INDEX "User_panCard_key" ON "User"("panCard");

-- CreateIndex
CREATE UNIQUE INDEX "User_panNo_key" ON "User"("panNo");
