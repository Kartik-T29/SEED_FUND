# Printable Forms & Official PDF Generation Architecture

This document describes the design, implementation, data contracts, and security controls for printable application forms and downloadable submission PDFs in the IDEAPAD Seed Fund portal.

---

## 1. Overview & Policy Requirements

Under the ITM University IDEAPAD Seed Fund Policy (Section P6), startups must have access to download an official, immutable copy of their submitted application for official record-keeping, board presentations, and audit trails.

### Core Principles
1. **Server-Enforced Access**: Only the startup that owns the application can download it. Draft applications cannot be downloaded (`HTTP 403`).
2. **Session-Derived Routing (Zero IDOR)**: The download route (`GET /dashboard/application/download`) takes **NO application ID** from the client. The application is strictly derived from the authenticated session (`s.userId`).
3. **Immutable Snapshots**: On final submission, a canonical JSON snapshot and its SHA-256 data hash are persisted in the database in the exact same transaction as the status update. The PDF is rendered from this snapshot, ensuring subsequent admin updates or revision drafts never mutate previously submitted versions.
4. **Devanagari (Hindi) Support**: Render English text with standard high-contrast Helvetica and Devanagari text with the bundled `NotoSansDevanagari-Regular.ttf` and `NotoSansDevanagari-Bold.ttf` fonts.
5. **Strict Privacy**: PAN and Aadhaar identity documents are listed by category and filename only; raw document paths, binary images, and ID numbers are completely excluded. Internal SEC evaluation scores, evaluator notes, and panel remarks are strictly prohibited from appearing in the startup's copy.

---

## 2. Architecture & Data Flow

```
[Startup Client UI]
       │
       ▼  (GET /dashboard/application/download?version=1)
[Route Handler: /download/route.ts]
       │
       ├─► 1. Authenticate Session (`getSession()`) -> must be Role.STARTUP
       ├─► 2. Rate Limiter: Max 10 downloads / minute per user (HTTP 429)
       ├─► 3. Access Query: `getStartupSubmissionForDownload(session, { version })`
       │       │
       │       ├─► Check Application Status !== DRAFT (throws DRAFT_NOT_DOWNLOADABLE if draft)
       │       ├─► Locate ApplicationSnapshot for requested version
       │       └─► If legacy submitted app without snapshot: Auto-reconstruct & mark `reconstructed: true`
       │
       ├─► 4. PDF Generation: `generateApplicationPdf(canonicalData, dataHash)`
       │       │
       │       ├─► Stream vector PDF via PDFKit with 15s safety timeout
       │       ├─► Embed IDEAPAD logo & 10 policy sections in strict P6 order
       │       ├─► Dynamic font switching (Helvetica <-> Devanagari)
       │       └─► Running footers: Page x of y, IST timestamp, 12-char SHA-256 hash
       │
       ├─► 5. Audit Logging: Record `DOWNLOAD_APPLICATION_PDF_v{version}` in `AuditLog`
       └─► 6. Response: Stream PDF with `Cache-Control: no-store` & sanitized filename
```

---

## 3. Data Model: `ApplicationSnapshot`

Added to Prisma Schema (`prisma/schema.prisma`):

```prisma
model ApplicationSnapshot {
  id            String      @id @default(cuid())
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  version       Int
  data          Json        // Canonical JSON snapshot of submitted application
  dataHash      String      // SHA-256 hash of canonicalized JSON
  reconstructed Boolean     @default(false)
  createdAt     DateTime    @default(now())

  @@unique([applicationId, version])
  @@index([applicationId])
}
```

### Migration & Rollback Notes
- **Additive Migration**: Added the `ApplicationSnapshot` table with a foreign key to `Application(id)`. No existing tables or columns were dropped or modified.
- **Rollback Procedure**: To roll back without data loss to existing applications, drop the `ApplicationSnapshot` table (`DROP TABLE "ApplicationSnapshot" CASCADE;`).

---

## 4. Canonical Data Normalizer (`src/lib/application-data.ts`)

`buildApplicationData(app)` standardizes and sanitizes the application state into a deterministic structure:
- **Policy Order**:
  1. Official Brand Header & Overview Box (Target Grant Category, Requested Total, IST Submission Date, Hash)
  2. Applicant & Startup Details (Team Name, Applicant Name, Enrollment No, Program, Dept, Phone, Email)
  3. Grant Policy Agreement Acceptance (Terms version, Accepted By Name, IST Timestamp, Agreement Text Hash)
  4. Basic Information & Concept (Problem Statement, Solution, Traction, Prior Grant History)
  5. 10 Experiment Headings (Objective, Problem Statement, Expected Outcome, Methodology, Experimental Setup, Data to be Collected, Validation Criteria, Risks & Assumptions, Timeline, Deliverables)
  6. Itemized Budget Breakdown (Annexure 1 table with S.No, Category, Name, Vendor, Unit Cost, Qty, Total)
  7. Budget Justifications (By Item S.No)
  8. Technology & Readiness Levels (TRL, MRL, IRL self-assessment and milestone tracking)
  9. Team & Uploaded Documents (Document registry with categories and file names only; no file URLs or images)
  10. Final Declaration & Electronic Signature (Applicant Declaration, Declared By Name, IST Timestamp)

`canonicalizeApplicationData(data)` creates a canonical string by recursively sorting all JSON object keys and generates a SHA-256 hex digest (`fullHash`), whose first 12 characters are printed on every page footer.

---

## 5. Security & Privacy Controls

1. **IDOR & Role Tampering Immunity**:
   - The route handler completely ignores client query parameters like `?id=...` or `?applicationId=...`.
   - The application is retrieved solely through `prisma.startup.findUnique({ where: { userId: session.userId } })`.
   - Admin and SEC users attempting to access the startup download endpoint receive `HTTP 403 Forbidden`. Admin and SEC retain their dedicated read/print endpoints (`/admin/application/[id]/print` and `/sec/[id]/print`).
2. **Draft Lock**:
   - If an application is in `DRAFT` status, `getStartupSubmissionForDownload` throws `DRAFT_NOT_DOWNLOADABLE`, which returns `HTTP 403` with `{ error: "You can download your application after you submit it." }`.
   - The UI disables the download button with this explanatory tooltip.
3. **Identity & Evaluation Privacy**:
   - No PAN or Aadhaar identification numbers appear in the PDF text.
   - No binary files, image uploads, or raw server paths (e.g. `/var/lib/seedfund/uploads/...`) are exposed.
   - Evaluator scores, SEC notes, committee recommendations, and Form A/B data are strictly omitted.
4. **Rate Limiting & Denial of Service Protection**:
   - Enforces a rate limit of 10 downloads per minute per user (`HTTP 429 Retry-After: 60`).
   - A 15-second generation safety timeout prevents stuck processes on small server instances.
   - PDFKit streams vector output directly into memory (~50KB per document), avoiding temporary file I/O overhead.
5. **Audit Trail**:
   - Every download generates an immutable `AuditLog` row:
     - `actorId`: User ID
     - `action`: `DOWNLOAD_APPLICATION_PDF_v{version}`
     - `entity`: `ApplicationSnapshot`
     - `entityId`: Snapshot ID
     - `at`: Timestamp

---

## 6. Sample Artifact

A complete 5-page sample application generated from realistic seed data is available for inspection at:
[`docs/samples/sample-application.pdf`](file:///home/ec2-user/SEED_FUND/docs/samples/sample-application.pdf)
