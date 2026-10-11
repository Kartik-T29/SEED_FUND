-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STARTUP', 'SEC_MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AppStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'REPRESENT', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "GrantType" AS ENUM ('IDEATION', 'VALIDATION', 'PROOF', 'SCALING', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "MilestoneState" AS ENUM ('COMPLETED', 'PENDING', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('AGREEMENT', 'PAN', 'AADHAAR', 'PHOTO', 'DECK', 'QUOTATION', 'UTILIZATION_REPORT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Startup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "enrollmentNo" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "phone" TEXT NOT NULL,

    CONSTRAINT "Startup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "supersedesId" TEXT,
    "status" "AppStatus" NOT NULL DEFAULT 'DRAFT',
    "grantType" "GrantType",
    "requestedTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "formData" JSONB NOT NULL DEFAULT '{}',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" "DocType" NOT NULL,
    "memberLabel" TEXT,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetItem" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "header" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "qty" INTEGER NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "justification" TEXT,

    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "statusForm" JSONB NOT NULL DEFAULT '{}',
    "experimentForm" JSONB NOT NULL DEFAULT '{}',
    "status" "FormStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneAssessment" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "status" "FormStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "MilestoneAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneItem" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" "MilestoneState" NOT NULL DEFAULT 'PENDING',
    "ownerRemark" TEXT,

    CONSTRAINT "MilestoneItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneRemark" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "remark" TEXT NOT NULL,

    CONSTRAINT "MilestoneRemark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneEditLog" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneEditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrantEvaluation" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "approvedTotal" DECIMAL(12,2) NOT NULL,
    "amounts" JSONB NOT NULL,
    "timeline" JSONB NOT NULL,
    "note" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrantEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrantHistory" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "grantType" "GrantType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "waived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GrantHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Startup_userId_key" ON "Startup"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_supersedesId_key" ON "Application"("supersedesId");

-- CreateIndex
CREATE INDEX "Application_startupId_idx" ON "Application"("startupId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Document_applicationId_idx" ON "Document"("applicationId");

-- CreateIndex
CREATE INDEX "BudgetItem_applicationId_idx" ON "BudgetItem"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_applicationId_memberId_key" ON "Assessment"("applicationId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneAssessment_applicationId_key" ON "MilestoneAssessment"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneRemark_itemId_memberId_key" ON "MilestoneRemark"("itemId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "GrantEvaluation_applicationId_key" ON "GrantEvaluation"("applicationId");

-- CreateIndex
CREATE INDEX "GrantHistory_startupId_idx" ON "GrantHistory"("startupId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "Startup" ADD CONSTRAINT "Startup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneAssessment" ADD CONSTRAINT "MilestoneAssessment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneAssessment" ADD CONSTRAINT "MilestoneAssessment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneItem" ADD CONSTRAINT "MilestoneItem_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "MilestoneAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneRemark" ADD CONSTRAINT "MilestoneRemark_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MilestoneItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneRemark" ADD CONSTRAINT "MilestoneRemark_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneEditLog" ADD CONSTRAINT "MilestoneEditLog_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "MilestoneAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantEvaluation" ADD CONSTRAINT "GrantEvaluation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantEvaluation" ADD CONSTRAINT "GrantEvaluation_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrantHistory" ADD CONSTRAINT "GrantHistory_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
