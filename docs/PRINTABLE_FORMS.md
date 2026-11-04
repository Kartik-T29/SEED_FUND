# Printable Forms, Panel Formation & Official PDF Generation Architecture

This document provides a comprehensive operational and technical guide to the printable forms, evaluation panel formation, and downloadable PDF system in the IDEAPAD Seed Fund Portal.

---

## 1. Executive Summary & Plain-Language Guide (For Non-Developers)

The IDEAPAD Seed Fund Portal provides three official printable documents. Access to these documents is governed by role-based server access controls and strict workflow milestones.

### Who Can Print What, and When?

| Document | Who Can View / Print / Download? | When is it "DRAFT"? | When is it "FINAL"? |
| :--- | :--- | :--- | :--- |
| **SEC Form A**<br>(Committee Assessment) | • Portal Administrator<br>• The 3 assigned SEC Panel Members of this application | When 0, 1, or 2 panel members have started, or before all 3 have submitted their assessment. Marked: **"DRAFT - NOT FOR SIGNATURE"** with notes listing unstarted/unsubmitted members. | When **all 3 assigned SEC panel members** have submitted and locked their individual assessments. Ready for physical signatures. |
| **Admin Form B**<br>(Grant Evaluation & Sanction) | • Portal Administrator **ONLY**<br>*(Strictly inaccessible to Startups and SEC members)* | Before the Administrator issues and records the official executive sanction decision. Marked: **"DRAFT - NOT FOR SIGNATURE"**. | Only **after** the Administrator records the sanction decision (Approved/Rejected/Represent), budget amounts, and approved timeline. |
| **Startup Application Printout** | • The Startup (for their own application)<br>• Portal Administrator<br>• The 3 assigned SEC Panel Members | In draft status, it cannot be downloaded (`HTTP 403`). | Once submitted, it is permanent and immutable. Reflects exact submission time, declarations, and canonical hash. Excludes internal SEC scores. |

---

## 2. Committee Panel Formation Rule: First Three to Start

In accordance with institutional incubator governance:

1. **First-to-Start Assignment**:
   - Each submitted startup application is evaluated by an official Seed Evaluation Committee (SEC) panel of exactly **3 members**.
   - The panel is formed dynamically by the **first three approved SEC evaluators** who click **"Start assessment"** on the application.
2. **Fixed Positions (1, 2, 3)**:
   - Evaluator order of starting assigns permanent positions: **SEC Member 1**, **SEC Member 2**, and **SEC Member 3**.
   - These positions map directly to the three member columns throughout **Form A** (Section 1 status scales, Section 2 milestones, Section 3 experiment questions, Section 5 grant evaluations, and Section 6 budget recommendations).
   - **Lead Evaluator (SEC Member 1)**: The evaluator who starts first takes Position 1 and is exclusively authorized to claim and edit the shared Milestone Assessment form (Form 2 / Form A Section 2).
3. **Atomic Concurrency Protection**:
   - Enforced on the database layer in a single database transaction with unique constraints on `(applicationId, position)` and `(applicationId, memberId)`.
   - If two evaluators click "Start assessment" for the 3rd slot at the exact same instant, the database transaction ensures exactly one succeeds; the second receives an immediate notification: *"The panel for this application is complete"*.
   - A single evaluator cannot claim two slots. A fourth or subsequent evaluator is blocked.
4. **Minimal Card Privacy Barrier**:
   - Prior to clicking "Start assessment", an approved SEC evaluator sees only a minimal card: Startup Team Name, Grant Tier, Submitted Date, and a "Start assessment" button.
   - The full startup application details, pitch deck, KYC documents, and evaluation forms are strictly hidden until the slot is claimed.
   - Pending, rejected, or deactivated evaluators see zero applications.
5. **Audited Panel Slot Release**:
   - Evaluators cannot voluntarily abandon or swap slots.
   - A panel slot can **only be released by the Administrator with an audited written reason** (e.g. evaluator declared a conflict of interest). Releasing a slot logs `RELEASE_PANEL_SLOT` and reopens the slot for another approved evaluator.

---

## 3. Official Signatories from Settings (Admin-Editable)

To ensure template fidelity and operational flexibility without hardcoding names or designations in code or PDF generators:
- An administrative table (`SignatorySetting`) stores official executive signatories.
- Seeded via additive database migration with:
  1. `head_incubation`: **Mr. Aakash Kumar Shukla**, Head, Incubation and Startups, IDEAPAD
  2. `director_ideapad`: **Ashish Chandel**, Professor of Practice and Director, IDEAPAD (exact name and designation from Policy P3)
  3. `vice_chancellor`: **[Blank Name]**, Vice Chancellor, ITM University, Gwalior (the designation is pre-filled; Administrator enters the Vice Chancellor's name when appointed)
- Updating a signatory in Portal Settings immediately updates the next printout/PDF rendering and dynamically recomputes the canonical SHA-256 hash.

---

## 4. Single Source of Truth & Cryptographic Integrity

To guarantee that the on-screen browser view and downloadable PDF never diverge:
- **Canonical Data Builders**:
  - `buildFormAData(applicationId, session)`: Resolves all scales, milestones, 12 questions, member notes, suggested budgets, and signatories.
  - `buildFormBData(applicationId, session)`: Resolves approved grant tier, 9 budget categories, 8 timeline dates, statutory T&Cs, and executive approval block.
  - `buildApplicationData(application)`: Resolves startup profile, 10 experiment fields, Annexure 1 items, and electronic signatures.
- **Server-Computed Totals**: Grand totals, contingency percentages, and vote counts are computed strictly on the server from raw stored items; client values are never trusted.
- **Indian Number Grouping & IST Timestamps**: Currency is rendered in ₹ with Indian grouping (`₹1,00,000`). All dates and times are rendered in Indian Standard Time (`Asia/Kolkata`) without date-boundary shifts.
- **Running Footers**: Every page displays `Page x of y`, generation timestamp in IST, and the first 12 characters of the canonical SHA-256 data hash.

---

## 5. Visual Styling & Word Template Replication (Form A)

Form A faithfully replicates the layout and typography of the official Word template (`Grant_policy-260226.docx`):
- **Bilingual Serif Typography**: Uses bundled Google `Noto Serif` (Latin) and `Noto Serif Devanagari` (Hindi), ensuring Devanagari characters render sharply in black and white.
- **Table Structure & Column Counts (Derived from Docx Inspection)**:
  - **Meta Block (Table 1)**: 2 columns (Application ID, Applicant Team, Assessment Date).
  - **Section 1: Status Scales (Tables 2–4)**: 12 columns total (3 side-by-side scale blocks for TRL, MRL, IRL; each block has Scale Description + Member 1, 2, 3 columns). Achieved levels mark `"achieved"` in the member cell.
  - **Section 2: Milestones (Table 5)**: 5 columns (Prototyping Set A, Professional Set B, Status M1, Status M2, Status M3). Displays Set A & Set B statuses side by side.
  - **Corrections Table (Table 6)**: Timestamped audit table of milestone edits with physical signature lines.
  - **Section 3: 12 Experiment Questions (Tables 7–8)**: 4 columns (Question, M1, M2, M3 Yes/No). Questions grouped into Technical Soundness (1–7), Market Worthiness (8–10), and Execution Readiness (11–12), followed by 2-column Member Notes table.
  - **Section 4: Recommendation Notes (Table 9)**: 2 columns (Member, Recommendation Note).
  - **Section 5: Grant Evaluation (Table 10)**: 4 columns (Grant Tier, M1, M2, M3 selection).
  - **Section 6: Suggested Budget (Table 11)**: 4 columns (9 Annexure 1 headers + Grand Total for M1, M2, M3).
  - **Signatures (Assessed by & Reviewed by)**:
    - *Assessed by*: 3 columns for SEC Panel Members 1, 2, 3.
    - *Reviewed by*: 2 columns for Head of Incubation & Director IDEAPAD.

---

## 6. Document Lifecycle Workflow (Mermaid Diagram)

```mermaid
flowchart TD
    subgraph Startup [Startup Workflow]
        S1["Draft Application"] --> S2["Submit Application"]
        S2 --> S3["Submitted (Locked)"]
        S3 --> S4["Download Application PDF<br/>(Immutable Snapshot)"]
    end

    subgraph Panel [Panel Formation (First 3 Rule)]
        S3 -.-> P1["Evaluator 1 Clicks 'Start Assessment'"]
        P1 --> P1_Slot["Assigned SEC Member 1<br/>(Milestone Lead)"]
        S3 -.-> P2["Evaluator 2 Clicks 'Start Assessment'"]
        P2 --> P2_Slot["Assigned SEC Member 2"]
        S3 -.-> P3["Evaluator 3 Clicks 'Start Assessment'"]
        P3 --> P3_Slot["Assigned SEC Member 3"]
        S3 -.-> P4["Evaluator 4 Clicks 'Start Assessment'"]
        P4 --> P4_Block["Blocked: 'Panel is Complete'"]
    end

    subgraph FormA_Life [Form A Lifecycle]
        P1_Slot & P2_Slot & P3_Slot --> FA_Draft["Form A: DRAFT<br/>Watermark: 'DRAFT - NOT FOR SIGNATURE'<br/>Lists unstarted/unsubmitted members"]
        P1_Slot --> FA_M1["Submit Assessment 1 & Milestone Form"]
        P2_Slot --> FA_M2["Submit Assessment 2"]
        P3_Slot --> FA_M3["Submit Assessment 3"]
        FA_M1 & FA_M2 & FA_M3 --> FA_Final["Form A: FINAL<br/>Clean printout for physical signatures"]
    end

    subgraph FormB_Life [Form B Lifecycle]
        FA_Final --> FB_Gate["Form B Readiness Gate Unlocked"]
        FB_Gate --> FB_Draft["Form B: DRAFT<br/>Watermark: 'DRAFT - NOT FOR SIGNATURE'"]
        FB_Draft --> Admin_Decision["Admin Enters Decision, Budget & Timeline"]
        Admin_Decision --> FB_Final["Form B: FINAL Sanction Order<br/>Signed by Head Incubation, Director & VC"]
    end
```

---

## 7. Sample PDFs Generated

Sample dummy PDFs illustrating both draft and final states are located in `docs/samples/`:
- [`sample_form_a_draft.pdf`](file:///home/ec2-user/SEED_FUND/docs/samples/sample_form_a_draft.pdf): SEC Form A in draft state with draft watermark and unsubmitted member notices.
- [`sample_form_a_final.pdf`](file:///home/ec2-user/SEED_FUND/docs/samples/sample_form_a_final.pdf): SEC Form A in final state, formatted identically to the Word template with 3 evaluator evaluations.
- [`sample_form_b_final.pdf`](file:///home/ec2-user/SEED_FUND/docs/samples/sample_form_b_final.pdf): Admin Form B Sanction Order with 9 budget headers, 8 timeline dates, and 3 settings signatories.
- [`sample_application_printout.pdf`](file:///home/ec2-user/SEED_FUND/docs/samples/sample_application_printout.pdf): Startup submission printout with 40 budget rows, Hindi text, and privacy controls.
