-- Additive Migration: SEC Panel Positions & Admin-Editable Signatories
-- Safe, backward-compatible migration for PostgreSQL

-- 1. Create ApplicationPanelMember table with strict unique constraints
CREATE TABLE IF NOT EXISTS "ApplicationPanelMember" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationPanelMember_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ApplicationPanelMember_position_check" CHECK ("position" >= 1 AND "position" <= 3)
);

-- 2. Create SignatorySetting table
CREATE TABLE IF NOT EXISTS "SignatorySetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignatorySetting_pkey" PRIMARY KEY ("id")
);

-- 3. Add details column to AuditLog if not exists
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "details" TEXT;

-- 4. Create unique indexes and foreign keys
CREATE UNIQUE INDEX IF NOT EXISTS "ApplicationPanelMember_applicationId_position_key" ON "ApplicationPanelMember"("applicationId", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "ApplicationPanelMember_applicationId_memberId_key" ON "ApplicationPanelMember"("applicationId", "memberId");
CREATE INDEX IF NOT EXISTS "ApplicationPanelMember_applicationId_idx" ON "ApplicationPanelMember"("applicationId");
CREATE UNIQUE INDEX IF NOT EXISTS "SignatorySetting_key_key" ON "SignatorySetting"("key");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApplicationPanelMember_applicationId_fkey') THEN
        ALTER TABLE "ApplicationPanelMember" ADD CONSTRAINT "ApplicationPanelMember_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApplicationPanelMember_memberId_fkey') THEN
        ALTER TABLE "ApplicationPanelMember" ADD CONSTRAINT "ApplicationPanelMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- 5. Seed initial official signatories per owner instructions and policy P3
INSERT INTO "SignatorySetting" ("id", "key", "name", "designation", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('sig_head_incubation', 'head_incubation', 'Mr. Aakash Kumar Shukla', 'Head, Incubation and Startups, IDEAPAD', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sig_director_ideapad', 'director_ideapad', 'Ashish Chandel', 'Professor of Practice and Director, IDEAPAD', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sig_vice_chancellor', 'vice_chancellor', '', 'Vice Chancellor, ITM University, Gwalior', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- 6. Backfill existing assessments into panel positions (up to 3) for existing seeded applications
INSERT INTO "ApplicationPanelMember" ("id", "applicationId", "memberId", "position", "assignedAt")
SELECT
    'panel_' || a."id",
    a."applicationId",
    a."memberId",
    row_num,
    COALESCE(a."submittedAt", CURRENT_TIMESTAMP)
FROM (
    SELECT
        id,
        "applicationId",
        "memberId",
        "submittedAt",
        ROW_NUMBER() OVER (PARTITION BY "applicationId" ORDER BY "submittedAt" ASC NULLS LAST, "id" ASC) as row_num
    FROM "Assessment"
) a
WHERE a.row_num <= 3
ON CONFLICT DO NOTHING;
