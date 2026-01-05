-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'O_POS', 'O_NEG', 'AB_POS', 'AB_NEG');

-- CreateEnum
CREATE TYPE "StatusType" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('PERMANENT', 'CONTRACT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AdminStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BalanceType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "AuthIdGenerationType" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "NewsType" AS ENUM ('GENERAL', 'ANNOUNCEMENT', 'ALERT');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "FollowUpPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "GalleryStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RepeatType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "Users" (
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
    "language" TEXT,
    "maritalStatus" "MaritalStatus",
    "spouseName" TEXT,
    "spousePhone" TEXT,
    "image" TEXT,
    "dob" TIMESTAMP(3) NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "empDate" TIMESTAMP(3) NOT NULL,
    "empDateType" "EmploymentType" NOT NULL,
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
    "refId" TEXT,
    "createdById" TEXT,
    "companyName" TEXT NOT NULL,
    "companyId" TEXT,
    "companyAddress" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "userAuthId" TEXT,
    "reasonForReject" TEXT,
    "passwordRequest" BOOLEAN NOT NULL DEFAULT false,
    "deleteRequest" BOOLEAN NOT NULL DEFAULT false,
    "messageRequest" BOOLEAN NOT NULL DEFAULT false,
    "requesterName" TEXT,
    "requesterId" TEXT,
    "teamName" TEXT,
    "teamHeadName" TEXT,
    "teamHeadId" TEXT,
    "status" "UserStatus" NOT NULL,
    "passwordChanged" BOOLEAN NOT NULL DEFAULT false,
    "tempPasswordToken" TEXT,
    "tempPasswordExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "address" TEXT,
    "img" TEXT,
    "phone" TEXT NOT NULL,
    "alternative_phone" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "user_auth_id" TEXT,
    "status" "AdminStatus" NOT NULL,
    "password_changed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "address" TEXT,
    "img" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "opening_balance" INTEGER,
    "opening_balance_type" "BalanceType",
    "opening_balance_date" TIMESTAMP(3),
    "status" "CompanyStatus" NOT NULL,
    "modules" TEXT,
    "domain" TEXT,
    "primary_colour" TEXT,
    "secondary_colour" TEXT,
    "authIdGeneration" "AuthIdGenerationType" NOT NULL,
    "auth_id_prefix" TEXT,
    "company_term" TEXT,
    "transaction_prefix" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "News" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "newsPicture" TEXT,
    "type" "NewsType" NOT NULL,
    "company_id" TEXT NOT NULL,
    "source" TEXT,
    "heading" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lead_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "followup_type" TEXT NOT NULL,
    "project" TEXT,
    "followup_status" "FollowUpStatus" NOT NULL,
    "priority" "FollowUpPriority" NOT NULL,
    "comment" TEXT,
    "company_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gallery" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_category" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "status" "GalleryStatus" NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "notification_type" TEXT NOT NULL,
    "time_stamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Potrait" (
    "id" TEXT NOT NULL,
    "video_title" TEXT NOT NULL,
    "video_name" TEXT,
    "video_link" TEXT NOT NULL,
    "Company_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Potrait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phase" (
    "id" TEXT NOT NULL,
    "phase_name" TEXT NOT NULL,
    "phases" TEXT,
    "project_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "project_name" TEXT NOT NULL,
    "project_descripition" TEXT,
    "project_address" TEXT NOT NULL,
    "project_image" TEXT,
    "project_website_url" TEXT,
    "project_virtual_view_link" TEXT,
    "layout_image" TEXT,
    "brochures" TEXT,
    "QR_code" TEXT,
    "images" TEXT,
    "highlights" TEXT,
    "approvals" TEXT,
    "approval_copies" TEXT,
    "sliders" TEXT,
    "flyers" TEXT,
    "videos" TEXT,
    "location_highlights" TEXT,
    "company_id" TEXT NOT NULL,
    "latitude" TEXT,
    "longitude" TEXT,
    "incentives_level" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plot" (
    "id" TEXT NOT NULL,
    "phases" TEXT,
    "plot_category" TEXT NOT NULL,
    "facing" TEXT,
    "sqr_yards" DOUBLE PRECISION NOT NULL,
    "plot_number" TEXT NOT NULL,
    "project_name" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "plot_status" TEXT NOT NULL,
    "customer_name" TEXT,
    "customer_contact" TEXT,
    "customer_address" TEXT,
    "latitude" TEXT,
    "longitude" TEXT,
    "plot_booing_number" TEXT,
    "plot_booking_plan" TEXT,
    "status" TEXT NOT NULL,
    "payment_type" TEXT,
    "payment_status" TEXT,
    "company_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Highway" (
    "id" TEXT NOT NULL,
    "highway_name" TEXT NOT NULL,
    "highway_icon" TEXT,
    "company_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Highway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "note_title" TEXT NOT NULL,
    "note_description" TEXT,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lead_name" TEXT NOT NULL,
    "lead_contact" TEXT NOT NULL,
    "lead_email" TEXT,
    "lead_city" TEXT,
    "lead_occupation" TEXT,
    "lead_company" TEXT,
    "lead_age" INTEGER,
    "gender" "Gender",
    "marital_status" "MaritalStatus",
    "additional_information" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "lead_source" TEXT NOT NULL,
    "lead_status" TEXT NOT NULL,
    "first_interaction_date" TIMESTAMP(3),
    "lead_category" TEXT,
    "project_interested_in" TEXT,
    "observations" TEXT,
    "follow_up_date" TIMESTAMP(3),
    "assigned_to" TEXT,
    "notes" TEXT,
    "company_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "repeat" "RepeatType" NOT NULL,
    "selected_days" TEXT,
    "company_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "request_type" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "requested_name" TEXT NOT NULL,
    "message" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "status" "RequestStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuperAdmin" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "address" TEXT,
    "img" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "user_auth_id" TEXT,
    "status" "StatusType" NOT NULL,
    "password_changed" BOOLEAN NOT NULL,
    "temp_pass_token" TEXT,
    "temp_token_expired_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "role_no" INTEGER NOT NULL,
    "display_name" TEXT NOT NULL,
    "status" "StatusType" NOT NULL,
    "company_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "modules" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Showcase" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_category" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "comp_id" TEXT NOT NULL,
    "status" "StatusType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Showcase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteVisit" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lead_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "site_visit_picture" TEXT,
    "company_id" TEXT NOT NULL,
    "change_log" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_notification" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fcm_token" TEXT NOT NULL,
    "last_request" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkactivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "video_title" TEXT NOT NULL,
    "video_name" TEXT NOT NULL,
    "video_link" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event_logs" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "action_by" TEXT NOT NULL,
    "action_description" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_username_key" ON "Users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Users_phone_key" ON "Users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Users_aadharCard_key" ON "Users"("aadharCard");

-- CreateIndex
CREATE UNIQUE INDEX "Users_aadharNo_key" ON "Users"("aadharNo");

-- CreateIndex
CREATE UNIQUE INDEX "Users_panCard_key" ON "Users"("panCard");

-- CreateIndex
CREATE UNIQUE INDEX "Users_panNo_key" ON "Users"("panNo");

-- CreateIndex
CREATE UNIQUE INDEX "Users_bankAccountNo_key" ON "Users"("bankAccountNo");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_user_auth_id_key" ON "Admin"("user_auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "Company_email_key" ON "Company"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_username_key" ON "SuperAdmin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_email_key" ON "SuperAdmin"("email");
