-- Update 001: Composite indexes for high-concurrency listing, sorting, and SEC evaluator checks
-- Compatible with SQLite, Turso libSQL, and phpMyAdmin / SQLite Admin tools

-- 1. Index for listApplications (Status filtering and submittedAt reverse sorting without temp B-Tree)
CREATE INDEX IF NOT EXISTS Application_status_submittedAt_idx ON Application(status, submittedAt DESC);

-- 2. Index for SEC evaluator pending verification checks
CREATE INDEX IF NOT EXISTS User_role_approvalStatus_idx ON User(role, approvalStatus);

-- 3. Composite index for assessment status counts per application
CREATE INDEX IF NOT EXISTS Assessment_applicationId_status_idx ON Assessment(applicationId, status);
