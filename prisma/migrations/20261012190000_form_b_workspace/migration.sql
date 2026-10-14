-- AlterTable GrantEvaluation
ALTER TABLE "GrantEvaluation" ADD COLUMN IF NOT EXISTS "status" "FormStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "GrantEvaluation" ADD COLUMN IF NOT EXISTS "secDecisionNote" TEXT;
ALTER TABLE "GrantEvaluation" ADD COLUMN IF NOT EXISTS "termsAcknowledged" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "GrantEvaluation" ADD COLUMN IF NOT EXISTS "signedCopyPath" TEXT;
