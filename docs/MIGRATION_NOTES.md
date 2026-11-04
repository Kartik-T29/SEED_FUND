# Database Migration & Schema Alignment Notes

**Portal**: IDEAPAD Seed Grant Portal  
**Target Architecture**: PostgreSQL 16 on Amazon Linux 2023 (AWS EC2 M7i-flex.large)  
**Migration Reference**: `20261104000000_policy_alignment`  
**Date**: November 2026  

---

## 1. Executive Summary

This document details the database migration and schema enhancements aligning the IDEAPAD Seed Fund Portal with the official Seed Fund Policy (`Grant_policy-260226.docx` and `Seed_Grant_Application_ITMU-ITMGOI-240226.docx`).

Previously, early development and shared-hosting experiments used SQLite (`file:./dev.db`). The production deployment target is dedicated **PostgreSQL** running on `127.0.0.1:5432` with connection pooling, strict relational integrity, and future migration readiness to AWS RDS.

---

## 2. Schema Evolution & Additions

The migration `20261104000000_policy_alignment` introduces additive, non-breaking modifications to the relational schema:

### A. Startup Department Tracking
- **Table**: `Startup`
- **Column**: `department` (`TEXT`, nullable)
- **Policy Context**: Section 1 of the official Seed Grant Application form requires recording the applicant's **Program & Department** (e.g., *SOET - Mechanical Engineering*, *School of Management*), in addition to enrollment number and academic program.
- **SQL Equivalent**:
  ```sql
  ALTER TABLE "Startup" ADD COLUMN IF NOT EXISTS "department" TEXT;
  ```

### B. Annexure 1 Quotation & Attachment Support
- **Enum**: `DocType`
- **Value Added**: `ANNEXURE`
- **Policy Context**: Annexure 1, Item 1 (*Equipment / Capital Purchase*) explicitly stipulates: *"Requires a quotation."* Furthermore, Section 6 of the policy form states: *"Product details attached (vendor website, brochure or e-commerce page)."*
- **SQL Equivalent**:
  ```sql
  ALTER TYPE "DocType" ADD VALUE IF NOT EXISTS 'ANNEXURE';
  ```

### C. Query Optimization & Indexing
- To guarantee sub-10ms response times for SEC split views and admin dashboards on the single EC2 instance, explicit composite and foreign key indexes were added:
  - `Startup(userId)`
  - `Application(startupId, status)`
  - `Evaluation(applicationId, secMemberId)`
  - `Milestone(applicationId, sortOrder)`
  - `Document(applicationId, docType)`

---

## 3. Pre-Migration Checklist & Backup Procedures

Before running any migrations against a staging or production PostgreSQL instance, execute the following safeguard steps:

### Step 1: Verify PostgreSQL Connectivity & Version
```bash
psql -U seedfund -h 127.0.0.1 -d seedfund -c "SELECT version();"
```
Ensure PostgreSQL 15+ or 16+ is running.

### Step 2: Create a Full Consistent Dump
Always create a compressed custom-format backup before executing schema alterations:
```bash
# Create backup directory
sudo mkdir -p /var/backups/seedfund
sudo chown -R ec2-user:ec2-user /var/backups/seedfund

# Dump database
pg_dump -h 127.0.0.1 -U seedfund -Fc seedfund > /var/backups/seedfund/seedfund_pre_policy_$(date +%Y%m%d_%H%M%S).dump

# Verify backup file size
ls -lh /var/backups/seedfund/
```

### Step 3: Verify Environment Configuration
Ensure `/etc/seedfund/seedfund.env` (or current `.env`) contains the valid PostgreSQL connection string:
```bash
DATABASE_URL="postgresql://seedfund:DB_STRONG_PASSWORD@127.0.0.1:5432/seedfund?schema=public&connection_limit=10"
```

---

## 4. Migration Execution

Prisma migrations must be applied using `prisma migrate deploy`, which executes pending SQL migration scripts recorded in `prisma/migrations/` without invoking development-only shadow database creation.

```bash
cd /home/ec2-user/SEED_FUND

# Deploy migrations
npx prisma migrate deploy
```

Expected output:
```text
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "seedfund", schema "public" at "127.0.0.1:5432"

2 migrations found in prisma/migrations
No pending migrations to apply. (or: 1 migration applied: 20261104000000_policy_alignment)
```

---

## 5. Post-Migration Verification Queries

Connect to the PostgreSQL database and run the following verification checks:

### Check 1: Verify `department` Column on `Startup`
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Startup' AND column_name = 'department';
```
*Expected: 1 row returned with `data_type = text` and `is_nullable = YES`.*

### Check 2: Verify `DocType` Enum
```sql
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'DocType'::regtype;
```
*Expected values: `PITCH_DECK`, `UTILIZATION_REPORT`, `AGREEMENT`, `ANNEXURE`, etc.*

### Check 3: Check Applied Migration History
```sql
SELECT migration_name, finished_at, rolled_back_at 
FROM "_prisma_migrations" 
ORDER BY finished_at DESC;
```
*Expected: `20261010134237_init` and `20261104000000_policy_alignment` marked as finished with NULL `rolled_back_at`.*

### Check 4: Test Application Health Endpoint
Run an HTTP request to the Next.js service:
```bash
curl -s http://127.0.0.1:3000/health | jq .
```
*Expected Response:*
```json
{
  "status": "ok",
  "timestamp": "2026-11-04T06:15:00.000Z",
  "database": "connected",
  "storage": "local_disk"
}
```

---

## 6. Initial Database Seeding (Fresh Installations)

For new environments where initial administrative and SEC member accounts do not yet exist:

```bash
# Verify credentials are set in environment
export ADMIN_EMAIL="incubator.director@itmuniversity.ac.in"
export ADMIN_PASSWORD="<STRONG_PASSWORD>"
export SEC_MEMBER_1_EMAIL="sec.tech@itmuniversity.ac.in"
export SEC_MEMBER_2_EMAIL="sec.finance@itmuniversity.ac.in"
export SEC_MEMBER_3_EMAIL="sec.market@itmuniversity.ac.in"

# Execute seed script
npm run db:seed
```

> [!NOTE]
> `prisma/seed.ts` has been sanitized and reads credentials strictly from the environment. No plaintext passwords or static tokens are committed to source control.

---

## 7. Rollback & Disaster Recovery Procedures

In the unlikely event of migration anomalies:

### Rollback Path A: Reverting Schema Change (No Data Loss)
If only schema rollbacks are required and existing data should be preserved:
```sql
-- Connect via psql
psql -U seedfund -h 127.0.0.1 -d seedfund

-- Revert column addition
ALTER TABLE "Startup" DROP COLUMN IF EXISTS "department";

-- Remove migration record from Prisma tracking table
DELETE FROM "_prisma_migrations" WHERE migration_name = '20261104000000_policy_alignment';
```

### Rollback Path B: Full Restoration from Dump
If severe corruption occurred during manual schema tampering:
```bash
# Terminate existing connections to allow drop/recreate
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'seedfund' AND pid <> pg_backend_pid();"

# Drop and recreate database
sudo -u postgres psql -c "DROP DATABASE seedfund;"
sudo -u postgres psql -c "CREATE DATABASE seedfund OWNER seedfund;"

# Restore from snapshot
pg_restore -h 127.0.0.1 -U seedfund -d seedfund -v /var/backups/seedfund/seedfund_pre_policy_<TIMESTAMP>.dump
```

---

## 8. Transition to AWS RDS PostgreSQL (Future Guide)

When migrating from localhost PostgreSQL on EC2 to AWS RDS PostgreSQL:
1. Provision an Amazon RDS PostgreSQL instance (db.t4g.medium recommended) within the same VPC.
2. Export data using `pg_dump -h 127.0.0.1 -U seedfund -Fc seedfund > seedfund_to_rds.dump`.
3. Restore onto RDS using `pg_restore -h <rds-endpoint>.rds.amazonaws.com -U seedfund -d seedfund seedfund_to_rds.dump`.
4. Update `/etc/seedfund/seedfund.env`:
   ```bash
   DATABASE_URL="postgresql://seedfund:<RDS_PASSWORD>@<rds-endpoint>.rds.amazonaws.com:5432/seedfund?sslmode=require&connection_limit=20"
   ```
5. Restart PM2:
   ```bash
   pm2 restart seedfund --update-env
   ```
No code changes are required in Next.js or Prisma.
