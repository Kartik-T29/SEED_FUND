# IDEAPAD Seed Fund: Policy Alignment & Gap Analysis

This document provides a comprehensive clause-by-clause audit comparing the official Seed Fund Policy documents (`Grant_policy-260226.docx` and `Seed_Grant_Application_ITMU-ITMGOI-240226.docx`) against the portal implementation.

---

## 1. Policy Clause Audit Table

| Policy Clause | Description | Portal Location | Status | Implementation Notes |
| :--- | :--- | :--- | :--- | :--- |
| **P1** | Innovation Fund purpose: Reach TRL 3, validate assumptions (TRL 2), arrange professional services. Audited half-yearly. | `src/lib/agreement.ts`, `src/lib/seedfund-constants.ts` | **Matches** | Included in Agreement terms, dashboard banners, and policy documentation. |
| **P2.1** | Ideation Reward (TRL 1 / MRL 1, ₹1,000–₹5,000) | `src/lib/seedfund-constants.ts`, `ApplicationWizard.tsx` | **Matches** | Configured as `IDEATION` in `GRANT_RANGES`. |
| **P2.2** | Validation Grant (TRL 2 / MRL 2, ₹5,000–₹20,000) | `src/lib/seedfund-constants.ts`, `ApplicationWizard.tsx` | **Matches** | Configured as `VALIDATION` in `GRANT_RANGES`. Label aligned to "Validation Grant". |
| **P2.3** | Proof Grant (TRL 3 / MRL 3, ₹25,000–₹50,000) | `src/lib/seedfund-constants.ts`, `ApplicationWizard.tsx` | **Matches** | Replaced legacy label "Proof of Concept" with official policy term "Proof Grant". |
| **P2.4** | Scaling Grant (TRL 4–5 / MRL 4–5, ₹50,000–₹5,00,000) | `src/lib/seedfund-constants.ts`, `ApplicationWizard.tsx` | **Matches** | Configured as `SCALING` in `GRANT_RANGES`. |
| **P2.5** | Emergency Support Grant (Variable, case-by-case) | `src/lib/seedfund-constants.ts`, `ApplicationWizard.tsx` | **Matches** | Configured as `EMERGENCY`. |
| **P2.6** | Fund Limits: Maximum 3 grants per team unless waived by SEC | `src/lib/access.ts`, `schema.prisma` (`GrantHistory`) | **Differs** | `GrantHistory` model exists with `waived` flag, but hard limit enforcement is listed under Needs Approval (see item d). |
| **P3** | SEC composition: 3 experts (Innovation, Finance, Market Access). Names & designations from approved profiles, not hardcoded. | `src/lib/access.ts`, `src/lib/signatories.ts`, Form A/B templates | **Differs per instruction** | Panel rule uses first 3 to start; signatories are dynamically loaded from admin settings. |
| **P4** | SEC SOP Checklist (Presentation, Deck review 2 days prior, shared Form A, paperwork, prior funding, TRL/MRL/IRL, milestones, budget moderation, approve/disapprove/re-present, rubric notes, forward to Director). | `src/app/(sec)/sec/[id]/`, `SecEvaluationForm.tsx` | **Matches** | All SOP checklist items mapped into SEC Pre-checks, Status Levels, Shared Milestones, 12 Questions, and Evaluation & Budget sections. |
| **P5** | Startup Application SOP (Documents before request, Annexure 1 headers breakup, prior grant utilization report, pitch deck 2 days prior, presentation). | `ApplicationWizard.tsx`, `src/lib/seedfund-schema.ts` | **Matches** | Startup application wizard enforces legal agreement, 10 experiment fields, Annexure 1 budget with justifications, KYC & pitch deck uploads. |
| **P6.1** | Applicant & Startup Details (Applicant name, enrollment no, program & department, team name, phone, email). | `schema.prisma`, `ApplicationWizard.tsx`, `ApplicationViewSection.tsx` | **Matches** | Added additive `department` field to `Startup` model alongside `program` and `enrollmentNo`. |
| **P6.2** | Problem you are solving (max 600 characters). | `src/lib/seedfund-schema.ts`, `ApplicationWizard.tsx` | **Matches** | Strictly validated with helper text and character counter (600 limit). |
| **P6.3** | Proposed solution (max 600 characters). | `src/lib/seedfund-schema.ts`, `ApplicationWizard.tsx` | **Matches** | Strictly validated with helper text and character counter (600 limit). |
| **P6.4** | Effort and traction so far (max 800 characters). | `src/lib/seedfund-schema.ts`, `ApplicationWizard.tsx` | **Matches** | Strictly validated with helper text and character counter (800 limit). |
| **P6.5** | Experiment Definition (10 headings, max 800 characters each): Objective, Problem Statement, Expected Outcome, Methodology, Experimental Setup, Data to be Collected, Validation Criteria, Risks & Assumptions, Timeline, Deliverables. | `src/lib/seedfund-schema.ts`, `ApplicationWizard.tsx`, `ApplicationViewSection.tsx` | **Matches** | Fully validated and mapped to 10 distinct policy headings with example guidance. |
| **P6.6** | Detailed Requirement Table (9 Annexure 1 headers: S.no, Name & Description, Vendor/Source, Unit Cost ₹, Quantity, Total Cost ₹, Contingency row, Grand Total, Product details reference). | `ApplicationWizard.tsx`, `src/lib/seedfund-constants.ts`, `schema.prisma` (`BudgetItem`) | **Matches** | Itemized table grouped by header with auto-calculated row totals and contingency calculation. |
| **P6.7** | Justification for each item by S.no. | `ApplicationWizard.tsx`, `BudgetItem.justification` | **Matches** | Per-item justification step linking each budget line item by serial number. |
| **P6.8** | Self-assessment of Project Status: TRL 1–9, MRL 1–9, IRL 1–9. | `ApplicationWizard.tsx`, `src/lib/seedfund-constants.ts` | **Matches** | Full 9-level scale descriptions from policy implemented for all three scales (including IRL 3: Interface proof of concept). |
| **P6.9** | Self-assessment of Milestones (Status Completed/Pending, remarks, track selection for Set A or Set B). | `ApplicationWizard.tsx`, `schema.prisma` (`MilestoneAssessment`) | **Matches** | Startup selects relevant track (Idea Prototyping vs Professional Practice) and marks Completed/Pending with remarks. |
| **P6.10** | Declaration: "I hereby declare that all information provided is true and the requested grant amount will be used strictly for the stated purpose." Signature & date. | `ApplicationWizard.tsx`, `src/lib/seedfund-schema.ts` | **Matches** | Exact declaration text with applicant name and timestamp sign-off. |
| **P7** | Annexure 1: 9 Major Grant Headers (Equipment, Consumables, Software & Cloud, Manpower, Travel, Testing, Professional Services, Outreach, Contingency). Equipment requires quotation. Contingency 5–10%. | `src/lib/seedfund-constants.ts`, `ApplicationWizard.tsx` | **Matches** | All 9 headers aligned with full example descriptions as helper text. Equipment explicitly displays "Requires quotation". |
| **P8.1** | Form A Header: Applicant/team/startup, assessment date. Status assessment: 3 members mark achieved level on TRL 1–9, MRL 1–9, IRL 1–9. | `src/app/(sec)/sec/[id]/`, `SecEvaluationForm.tsx`, Printable Form A | **Matches** | All 3 scales available with level descriptions. Source doc mislabel of IRL 3 as "TRL 3" corrected to "IRL 3: Interface proof of concept". |
| **P8.2** | Milestone assessment: ONE shared form, filled by starting SEC member; Set A (Idea Prototyping, 9 items) & Set B (Professional Practice, 10 items); Status (Completed/Pending) and remarks per member. Concurrency handled, edit log preserved for printed signature. | `src/app/(sec)/sec/[id]/`, `src/lib/access.ts`, `schema.prisma` (`MilestoneEditLog`) | **Matches** | Shared milestone model with track selection, real-time edit logging, peer remarks, and printable audit trail. |
| **P8.3** | TRL 2/TRL 3 Experiment Assessment: 12 Questions (A. Technical Soundness 1–7, B. Market Worthiness 8–10, C. Execution Readiness 11–12) with Yes/No radio buttons, member notes box referencing question numbers, and decision guide banner. | `SecEvaluationForm.tsx`, Printable Form A | **Matches** | Implemented in Form A section 4 with 12 distinct questions, radio toggles, question notes textarea, and live decision helper. |
| **P8.4** | Recommendation note from each member. | `SecEvaluationForm.tsx`, `Assessment.experimentForm` | **Matches** | Member enters recommendation rationale in Evaluation & Budget section. |
| **P8.5** | Grant evaluation by each member (Validation Grant / Proof Grant / Scaling Grant / None-Application Rejected). | `SecEvaluationForm.tsx`, `Assessment.experimentForm` | **Matches** | Selection dropdown aligned with official grant categories. |
| **P8.6** | Grant suggested by each member under the 9 Annexure 1 headers with total. | `SecEvaluationForm.tsx`, `Assessment.experimentForm` | **Matches** | Evaluator enters suggested amount per header; total auto-computed. |
| **P8.7** | Assessed by 3 SEC members (names, designations, signatures). | Printable Form A (`/sec/[id]/print`) | **Matches** | Dynamic signature blocks populated from approved SEC member profiles. |
| **P9.1** | Form B Header: Applicant/team/startup, assessment date, approved grant type, approved amount under 9 headers with total. | `src/app/(admin)/admin/application/[id]/`, `AdminFormB.tsx`, Printable Form B | **Matches** | Form B captures approved grant type, 9-header budget breakdown, and calculates approved total. |
| **P9.2** | Form B Approved Timeline (8 dates: Grant Approval Date, Fund Release Date, Experiment Duration, Mid-Review Date, Grant Utilization Deadline, Experiment Completion Date, Final Submission Date, Closure Date). | `AdminFormB.tsx`, `GrantEvaluation.timeline`, Printable Form B | **Matches** | All 8 calendar dates captured and formatted in IST without UTC date shifts. |
| **P9.3** | Form B Final Recommendation Note from SEC & Institute Terms & Conditions. | `AdminFormB.tsx`, Printable Form B | **Matches** | Admin includes SEC summary recommendation and institution T&C agreement. |
| **P9.4** | Form B Approval Block: Signatories from settings (Head Incubation, Director IDEAPAD, Vice Chancellor). | `AdminFormB.tsx`, Printable Form B (`/admin/application/[id]/print`) | **Differs per instruction** | Rendered with 3 signatories configured from settings; not hardcoded. |
| **P10** | Terms & Conditions: No personal transfer, institute purchases, 6-month startup registration & equity sharing, sales vouchers submission. | `src/lib/agreement.ts`, Form B | **Matches** | Fully incorporated into Startup agreement and Form B sign-off. |
| **P11** | Disbursement & Accountability: Vendor direct / prepaid cards; university property; bills & final report before next-stage funding; half-yearly reports published. | `src/lib/agreement.ts`, `docs/LOGIC.md` | **Matches** | Stated in portal terms and logic manual. |

---

## 2. Items Needing Approval ("Needs approval")

The following behavioral rules and design decisions are documented below with current behavior, recommendations, and impact analysis, awaiting administrative confirmation:

### a) SEC Panel Slot Release & Replacement Rules
- **Current Behavior:** An assigned SEC panel member cannot leave or give up their slot voluntarily. An Administrator can release a panel slot only with an audited written reason (`RELEASE_PANEL_SLOT`). Once released, the slot opens for the next approved SEC member who clicks "Start assessment".
- **Policy Gap:** The policy does not specify what happens if an assigned SEC member is subsequently deactivated, falls ill, or fails to submit within the review window.
- **Recommendation:**
  1. If a panel member is deactivated by Admin or inactive for > 14 days, the Admin console displays an advisory banner: *"Position X evaluator is inactive/deactivated"*.
  2. The Admin can click "Release Slot" (with audited reason). Any draft assessment by that member is detached, and the slot is made available for another evaluator.
  3. Form A draft prints mark that position as `"(deactivated)"` until replaced.

### b) Committee Expertise Coverage (Innovation, Finance, Market Access)
- **Current Behavior:** Panel assignment is strictly **first-to-start** (the first 3 approved evaluators to click "Start assessment" claim positions 1, 2, 3).
- **Policy Gap:** Policy P3 states that the committee consists of 3 experts with complementary domain coverage: (1) Innovation and Product Development, (2) Business and Finance, and (3) Market Access and Go-To-Market. First-to-start does not guarantee that all three domains are represented.
- **Recommendation:**
  1. Add an optional `expertiseDomain` field (`INNOVATION_PRODUCT`, `BUSINESS_FINANCE`, `MARKET_ACCESS`) to SEC profiles (editable by evaluator and admin).
  2. On the Admin application review screen, show a non-blocking advisory tag if the 3 assigned evaluators share the same domain (e.g. *"Advisory: Panel lacks a Finance & Business specialist"*), allowing the Admin to rebalance slots if institutional protocol requires it.

### c) Milestone Combined Set A & Set B Cell Layout on Form A
- **Current Behavior:** The official Word template (`Grant_policy-260226.docx`) has a single status column per member for each row, while listing Prototyping (Set A) and Professional Practice (Set B) side by side across 10 rows. The portal prints both statuses in that single member cell, labeled `A:` and `B:` (e.g. `A: Completed - Verified bench test; B: Pending - In progress`). If only one set applies or was assessed, it prints that status without a prefix.
- **Recommendation:** Confirm this combined `A:` / `B:` layout for the printed Form A table. It preserves the exact row and column structure of the Word template while ensuring zero evaluation data loss.

### d) Form A "Reviewed by" Label Wording
- **Current Behavior:** Form A final signature section contains two distinct blocks:
  1. **"Assessed by"**: 3 columns for SEC Panel Members 1, 2, 3 (names and designations from profiles).
  2. **"Reviewed by"**: 2 columns for Mr. Aakash Kumar Shukla (Head, Incubation and Startups) and Ashish sir (Director, IDEAPAD).
- **Policy Context:** Policy SOP step 12 states: *"Forward the form to the IDEAPAD director"*. In the Word template, the block is headed "Reviewed by:".
- **Recommendation:** Retain the template heading "Reviewed by" with both Head of Incubation and Director IDEAPAD, matching the template structure and SOP forward step.

### e) Startup Copy of SEC Assessment (Policy P5.7)
- **Current Behavior:** Startups **cannot** see internal SEC member evaluations, individual rubric scores, or Form A printouts. They see only their final sanction status, approved grant amount, and administrative decision notice.
- **Policy Context:** Policy P5(7) mentions that the startup receives a copy of the evaluation, but does not specify when, through what route, or whether evaluator names are redacted.
- **Recommendation:** Do not expose raw Form A or individual peer remarks. When the Admin issues the final Form B sanction order, provide an option for Admin to release an official, aggregated "Evaluation Summary" (or read-only Form B summary) to the startup dashboard.

### f) Budget Total vs. Selected Tier Range
- **Current Behavior:** Informational notice displays the expected tier range (e.g. ₹25,000 to ₹50,000 for Proof Grant), but permits the startup to submit a budget outside the range.
- **Recommendation:** Warn (Soft validation). Display an amber advisory banner if outside range, but allow submission with an explanatory note.

### g) Contingency Percentage (5% to 10%)
- **Current Behavior:** Startups enter a contingency amount in the budget table; portal computes the percentage and displays it.
- **Recommendation:** Warn if < 5% or > 10%. Display an advisory alert ("Policy recommends contingency between 5% and 10%").

### h) Maximum 3 Grants Per Team
- **Current Behavior:** `GrantHistory` tracks prior grants with a `waived` flag. No automated block is placed on draft applications.
- **Recommendation:** If a startup has 3 closed grants where `waived = false`, require Admin to check a "Waive 3-grant limit" checkbox before Form B sanction can be finalized.

---

## 3. Differs from Policy (Per Owner Instruction)

Where owner instructions explicitly supersede or adapt the wording of the policy documents, they are documented below:

1. **Form B Approval Block (3 Signatories vs. 5 in Policy)**:
   - *Policy P9.4:* Lists a 5-member approval table: (1) Vice Chancellor, (2) Dean/HoD of applicant department, (3) Director IDEAPAD, (4) Assistant Director Startups, and (5) SEC Member Ambar Agarwal.
   - *Owner Instruction:* Configure the Form B approval block with **3 signatories loaded from settings**:
     1. `head_incubation`: Mr. Aakash Kumar Shukla, Head, Incubation and Startups, IDEAPAD
     2. `director_ideapad`: Ashish Chandel, Professor of Practice and Director, IDEAPAD
     3. `vice_chancellor`: [Blank Name], Vice Chancellor, ITM University, Gwalior
   - *Implementation:* Form B renders these 3 signatories dynamically from `SignatorySetting`. No names or designations are hardcoded in code, HTML, or PDFs.

2. **SEC Panel Formation via "First Three to Start"**:
   - *Policy P3:* Specifies a standing committee of 3 domain experts appointed by the incubator.
   - *Owner Instruction:* Each application's panel is dynamically formed by the **first three approved SEC members who click "Start assessment"**. Positions 1, 2, 3 are fixed by start order and govern all columns on Form A.
   - *Implementation:* Server-enforced database transaction with unique constraints on `(applicationId, position)` and `(applicationId, memberId)`. Subsequent members receive *"The panel for this application is complete"*.

3. **Milestone Form Ownership by SEC Member 1**:
   - *Policy P8.2:* States that milestone assessment is done by the SEC member who starts the assessment process.
   - *Owner Instruction:* SEC Member 1 (first to start) is designated as the sole editor of the shared milestone form. Non-lead evaluators (Positions 2 and 3) can view and add peer remarks. All edits are logged in an audit table with physical signature lines on Form A.

---

## 4. Manual Steps for Portal Administrator

The following administrative data items require confirmation or input in the portal:

1. **Vice Chancellor Official Name**:
   - The Vice Chancellor designation is seeded with a blank name line per instruction.
   - **Action Required:** When the Vice Chancellor's appointment is officially notified, the Administrator should navigate to Portal Settings (or the Signatories management card on any application page) and enter the Vice Chancellor's official name (e.g. `Prof. Yogesh Upadhyay`). Until entered, the printout renders the designation with an open signature line.
2. **Director IDEAPAD Name and Designation Spelling**:
   - Policy P3 lists: `Ashish Chandel`, `Professor of Practice and Director, IDEAPAD`.
   - Form A template Section 7 lists: `Ashish Singh Chandel`, `Director, Ideapad`.
   - **Current Setting:** Pre-seeded with P3 specification (`Ashish Chandel`, `Professor of Practice and Director, IDEAPAD`).
   - **Action Required:** Confirm preferred spelling with Director's office; can be updated at any time in Signatories settings.
