# Optimization Report: IDEAPAD Seed Fund Portal

**Branch**: `chore/optimize`  
**Stack**: Next.js 14.2.35 (App Router), React 18.3.1, TypeScript 5.9, Prisma 6.19.3, Turso (libSQL) / SQLite.  
**Deployment**: Vercel Serverless (Node.js runtime) + Turso Cloud.  
**Dataset for Benchmarking**: 200 Startup Applications, 600 SEC Evaluations, 800+ Budget Items, rich long-form experiment text.

---

## 1. Phase 0: Baseline ("Before" Table)

### A. Database Query Latency & Network Payload
Measured against realistic local dataset (200 applications, 600 assessments):

| Query / Operation | Scope / Description | Rows | Baseline Latency (avg 10 runs) | Payload Size |
|---|---|---|---|---|
| `listApplications` | Admin & SEC lists (`include: { startup, _count }` without field select) | 200 | **71.26 ms** | **724.6 KB** (includes all `formData` JSON blobs) |
| `getApplication` | Application Review / Split-view (`include: budgetItems, documents, startup, milestone`) | 1 | **6.64 ms** | **5.1 KB** |
| Document Handling | 450 KB PDF encoded & decoded in-memory via Data URI | 1 | Encode: **2.75 ms**, Decode: **3.36 ms** | **600.0 KB** |

### B. JavaScript & CSS Bundle Sizes
Measured from production build artifacts:

| Route / Asset | First Load JS | Shared Chunks | Route JS Size |
|---|---|---|---|
| `/admin` | 105 kB | 87.3 kB | 1.98 kB |
| `/admin/application/[id]` | 241 kB | 87.3 kB | 147 B |
| `/dashboard/apply` (Startup Wizard) | 244 kB | 87.3 kB | 18.7 kB |
| `/sec` | 96.2 kB | 87.3 kB | 180 B |
| `/sec/[id]` (SEC Assessment) | 241 kB | 87.3 kB | 148 B |
| `/login` | 106 kB | 87.3 kB | 2.93 kB |
| `/register` | 107 kB | 87.3 kB | 3.23 kB |
| `/sec-register` | 107 kB | 87.3 kB | 3.33 kB |
| Middleware | 31.9 kB | - | - |

### C. Server Memory & Codebase Metrics
* **Total Codebase Lines (`src/`)**: 7,418 lines
* **Total Dependencies**: 28 (15 dependencies, 13 devDependencies)
* **Node Modules Size**: 865 MB
* **Server RSS**: 141.22 MB
* **Heap Used**: 22.71 MB

---

## 2. Phase 1: Audit Findings (Approved Cuts)

1. **Dead Form Component**: `src/app/(startup)/apply/ApplicationForm.tsx` (562 lines, never rendered).
2. **Dead Action File**: `src/app/(startup)/apply/actions.ts` (108 lines, never called).
3. **Dead Filesystem Uploader**: `src/lib/upload.ts` (59 lines, obsolete filesystem uploader).
4. **Dead Legacy Constants**: `src/lib/constants.ts` (300+ lines, 11.6 KB, duplicate of `seedfund-constants.ts`).
5. **Unused UI Component**: `src/components/ui/tooltip.tsx` (38 lines).
6. **Unused UI Component**: `src/components/ui/file-upload.tsx` (116 lines).
7. **Unused Native Dependency**: `sharp` (`^0.33.5`, 35+ MB binary, no `next/image` in codebase).
8. **Over-fetching in `listApplications`**: `include` pulls massive `formData` JSON blobs on Admin and SEC lists.
9. **Missing Composite Database Indexes**: `Application(status, submittedAt)` and `User(role, approvalStatus)`.
10. **Autosave Payload Optimization**: Avoid full-document state re-serialization on minor keystrokes.

---

*(Phase 2 and Phase 3 changes and the "After" table will be populated next)*
