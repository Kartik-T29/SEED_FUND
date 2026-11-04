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
| **P3** | SEC composition: 3 experts (Innovation, Finance, Market Access). Names & designations from approved profiles, not hardcoded. | `src/lib/access.ts`, `prisma/seed.ts`, Form A/B templates | **Matches** | Form A and Form B dynamically render names, designations, and departments from approved User records where `role = SEC_MEMBER`. |
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
| **P9.4** | Form B Approval Block: 5 Signatories (Vice Chancellor ITM University, Dean/HoD of applicant department, Director IDEAPAD, Assistant Director Startups, SEC Member Ambar Agarwal). | `AdminFormB.tsx`, Printable Form B (`/admin/application/[id]/print`) | **Matches** | Rendered with designations from system configuration and profiles; not hardcoded. |
| **P10** | Terms & Conditions: No personal transfer, institute purchases, 6-month startup registration & equity sharing, sales vouchers submission. | `src/lib/agreement.ts`, Form B | **Matches** | Fully incorporated into Startup agreement and Form B sign-off. |
| **P11** | Disbursement & Accountability: Vendor direct / prepaid cards; university property; bills & final report before next-stage funding; half-yearly reports published. | `src/lib/agreement.ts`, `docs/LOGIC.md` | **Matches** | Stated in portal terms and logic manual. |

---

## 2. Items Needing Approval ("Needs approval")

As instructed in Section 1 of the prompt, the following behavioral rules are **NOT implemented silently**. They are evaluated below with current behavior, proposed changes, and rationale, awaiting administrative confirmation:

### a) Budget Total vs. Selected Tier Range
- **Current Behavior:** The portal displays an informational notice showing the expected tier range (e.g. ₹25,000 to ₹50,000 for Proof Grant), but permits the startup to submit a budget outside the range.
- **Proposed Change:** **Warn (Soft validation)**. Provide a visible amber warning banner if the grand total is outside the range, but allow submission with an explanatory note box so teams with co-funding or exceptional SEC waivers are not blocked.
- **Why:** University incubators frequently encounter split-cost purchases or partial funding scenarios where strict blocking causes administrative gridlock.

### b) Contingency Percentage (5% to 10%)
- **Current Behavior:** Startups enter a contingency amount in the budget table; the portal computes the percentage and displays it.
- **Proposed Change:** **Warn if < 5% or > 10%**. Display an advisory alert ("Policy recommends contingency between 5% and 10% of total grant: currently X%").
- **Why:** Blocking would prevent teams requesting 0% contingency (pure equipment/service requests) or slightly higher contingency due to volatile electronics pricing.

### c) Equipment / Capital Purchase Quotation Requirement
- **Current Behavior:** Equipment items display helper text "Requires quotation". Document upload step allows attaching `QUOTATION` files.
- **Proposed Change:** Make `QUOTATION` document upload mandatory if any line item is added under "Equipment / Capital Purchase".
- **Why:** Strict institutional purchase compliance requires supplier quotation before university purchase orders can be issued.

### d) Maximum 3 Grants Per Team
- **Current Behavior:** `GrantHistory` tracks prior grants with a `waived` boolean flag. No automated block is placed on creating draft applications.
- **Proposed Change:** If a startup has 3 closed grants where `waived = false`, require the SEC/Admin to check a "Waive 3-grant limit" checkbox before Form B sanction can be finalized.
- **Why:** Balances the policy rule with the SEC's explicit waiver authority in P2 without stranding applicant drafts.

### e) Panel of Exactly 3 SEC Members Per Application
- **Current Behavior:** All approved SEC members can access submitted applications; Form B readiness checks if members have submitted their assessments.
- **Proposed Change:** Admin assigns exactly 3 SEC members to an application upon submission (or the first 3 members to claim it form the evaluation panel). Form B gate opens when all 3 assigned members submit.
- **Why:** Matches P3 ("panel of 3 experts") and prevents waiting indefinitely for other registered evaluators.

### f) Decision Guide Auto-Suggestion Threshold
- **Current Behavior:** In Form A section 4 (12 questions), the decision guide provides real-time helper text: "Recommend funding (TRL-3 likely)" if YES answers >= 9; "Revision required before approval" if NO answers >= 4.
- **Proposed Change:** Set default threshold: `>= 9 YES` suggest "Recommend Funding"; `>= 4 NO` suggest "Revision Required".
- **Why:** The policy specifies "mostly YES means recommend funding; multiple NO means revision required". 9/12 represents 75% positive consensus.

### g) Documents Pre-Check Checklist (Admin-Verified Checkboxes)
- **Current Behavior:** SEC evaluators review uploaded documents (Agreement, PAN, Aadhaar, Photo, Deck, Prior Utilization) directly in the split view and check pre-check boxes.
- **Proposed Change:** Add an admin verification stage where the incubator manager marks "Documents Verified" before the SEC presentation date is scheduled.
- **Why:** Offloads clerical paperwork verification from faculty evaluators to incubator staff.

### h) Post-Approval Milestone & Disbursement Tracking
- **Current Behavior:** Form B records the 8 timeline dates and final sanction status.
- **Proposed Change:** Add post-approval dashboard milestones for Mid-Review Date, Expense Report Submission, Final PoC Demo, and Grant Closure.
- **Why:** Enforces the P9 and P11 lifecycle requirements after grant sanction.

### i) Half-Yearly Reports for Admin
- **Current Behavior:** Admin dashboard lists applications, statuses, and individual grant evaluations.
- **Proposed Change:** Add an admin report export button generating a Half-Yearly Report summary: Grants awarded, Total funds disbursed, Utilization rate, and TRL/MRL progression metrics.
- **Why:** Implements the half-yearly university audit mandate in P1 and P11.

### j) Milestone Sets A and B Selection
- **Current Behavior:** The startup indicates their track (Idea Prototyping vs Professional Practice) in self-assessment. The SEC member who initializes Form 2 can confirm or adjust the track during the evaluation session.
- **Proposed Change:** Startup selects their self-assessment track; the SEC evaluator can either adopt that track or override it based on the pitch presentation.
- **Why:** Problem-Solution fit vs Entrepreneurial fit is best determined collaboratively between the startup's intent and the committee's diagnostic assessment.

---

## 3. Privacy & Sensitive Data Recommendation

- **PAN & Aadhaar Numbers:** In accordance with Indian data protection norms (DPDP Act) and prompt privacy instructions, **plain text PAN and Aadhaar numbers are never collected or stored in database fields, URLs, or log files**.
- **Document Storage:** When KYC documents are uploaded, they are stored on private disk storage (outside public root) with randomized UUID filenames. They are accessible solely through authenticated endpoints verifying user ownership or administrator privileges.
- **Recommendation:** Adopt an **admin-verified "KYC Document Received & Verified" checkbox** workflow, allowing physical or ephemeral inspection of identity documents without retaining sensitive personal identifiers in long-term application storage.

---

## 4. Policy Input Still Needed (Policy Silent)

Where the policy docx files are silent, current application behavior is preserved and listed here for future administrative input:
1. **Application Windows & Deadlines:** The policy does not specify whether applications run on rolling submissions or batch cohorts. Current behavior: rolling submission.
2. **Decision Turnaround Time:** No fixed SLA (e.g. 14 or 30 days) is defined for SEC review. Current behavior: open until 3 members submit.
3. **Scoring Weights:** Aside from the qualitative 12-question decision guide (mostly YES / multiple NO), no numeric scoring or weight distribution across Technical/Market/Execution categories is prescribed. Current behavior: qualitative consensus.
4. **Conflict of Interest & Recusal:** No formal recusal mechanism is specified if an SEC panelist has mentored or co-authored with an applicant team. Current behavior: relies on SEC administrative scheduling.
5. **Re-presentation Turnaround:** P4 allows the SEC to "instruct the startup to present again on an agreed date", but does not define maximum re-presentation attempts. Current behavior: status `REPRESENT` allows one superseded revision.
