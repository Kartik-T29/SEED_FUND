-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "designation" TEXT,
    "department" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Startup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "enrollmentNo" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    CONSTRAINT "Startup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startupId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "supersedesId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "grantType" TEXT,
    "requestedTotal" DECIMAL NOT NULL DEFAULT 0,
    "formData" JSONB NOT NULL DEFAULT '{}',
    "submittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "memberLabel" TEXT,
    "path" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BudgetItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "header" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT,
    "unitCost" DECIMAL NOT NULL,
    "qty" INTEGER NOT NULL,
    "total" DECIMAL NOT NULL,
    "justification" TEXT,
    CONSTRAINT "BudgetItem_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "statusForm" JSONB NOT NULL DEFAULT '{}',
    "experimentForm" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" DATETIME,
    CONSTRAINT "Assessment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Assessment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MilestoneAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    CONSTRAINT "MilestoneAssessment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MilestoneAssessment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MilestoneItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "milestoneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "ownerRemark" TEXT,
    CONSTRAINT "MilestoneItem_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "MilestoneAssessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MilestoneRemark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "remark" TEXT NOT NULL,
    CONSTRAINT "MilestoneRemark_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MilestoneItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MilestoneRemark_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MilestoneEditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "milestoneId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MilestoneEditLog_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "MilestoneAssessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GrantEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "approvedTotal" DECIMAL NOT NULL,
    "amounts" JSONB NOT NULL,
    "timeline" JSONB NOT NULL,
    "note" TEXT,
    "decidedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GrantEvaluation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GrantEvaluation_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GrantHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startupId" TEXT NOT NULL,
    "grantType" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "closedAt" DATETIME,
    "waived" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "GrantHistory_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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

