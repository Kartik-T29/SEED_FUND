-- Additive Migration: Policy Alignment & Production Readiness
-- Safe, backward-compatible migration for PostgreSQL

-- 1. Add ANNEXURE to DocType enum if not exists
ALTER TYPE "DocType" ADD VALUE IF NOT EXISTS 'ANNEXURE';

-- 2. Add evaluator verification and profile fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "designation" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "department" TEXT;

-- 3. Add department to Startup table for Section 1 Applicant & Startup Details
ALTER TABLE "Startup" ADD COLUMN IF NOT EXISTS "department" TEXT;

-- 4. Composite indexes for high-throughput listing and evaluator checks
CREATE INDEX IF NOT EXISTS "Application_status_submittedAt_idx" ON "Application"("status", "submittedAt" DESC);
CREATE INDEX IF NOT EXISTS "User_role_approvalStatus_idx" ON "User"("role", "approvalStatus");
CREATE INDEX IF NOT EXISTS "Assessment_applicationId_status_idx" ON "Assessment"("applicationId", "status");
