import { GrantType } from '@prisma/client';

// ─── Grant type ranges ──────────────────────────────────────────────
export const GRANT_RANGES: Record<GrantType, { min: number; max: number; label: string }> = {
  IDEATION: { min: 1000, max: 5000, label: 'Ideation (₹1,000–5,000)' },
  VALIDATION: { min: 5000, max: 20000, label: 'Validation (₹5,000–20,000)' },
  PROOF: { min: 25000, max: 50000, label: 'Proof (₹25,000–50,000)' },
  SCALING: { min: 50000, max: 500000, label: 'Scaling (₹50,000–5,00,000)' },
  EMERGENCY: { min: 0, max: Infinity, label: 'Emergency (variable, case-by-case)' },
};

// ─── Budget headers ─────────────────────────────────────────────────
export const BUDGET_HEADER_LABELS: Record<string, string> = {
  EQUIPMENT: 'Equipment / Capital Purchase',
  CONSUMABLES: 'Consumables / Prototyping Materials',
  SOFTWARE_CLOUD: 'Software and Cloud Services',
  MANPOWER: 'Manpower Assistance',
  TRAVEL: 'Travel and Field Work',
  TESTING: 'Testing / Certification / Validation',
  PROFESSIONAL_SERVICES: 'Professional Services / Consultancy',
  OUTREACH: 'Outreach / Events / Dissemination',
  CONTINGENCY: 'Contingency / Miscellaneous',
};

export const BUDGET_HEADER_DESCRIPTIONS: Record<string, string> = {
  EQUIPMENT: 'Purchase of equipment, instruments, hardware, and capital assets essential for the experiment. Quotation upload required.',
  CONSUMABLES: 'Raw materials, chemicals, components, 3D printing filaments, PCBs, and other items consumed during prototyping.',
  SOFTWARE_CLOUD: 'Licenses, SaaS subscriptions, cloud computing (AWS/GCP/Azure), APIs, and development tools.',
  MANPOWER: 'Hiring of technical assistants, student interns, or skilled labor for the experiment duration.',
  TRAVEL: 'Travel to field sites, industry visits, supplier meetings, conferences, and exhibition participation.',
  TESTING: 'Testing fees at NABL/BIS labs, product certification, safety validation, and calibration charges.',
  PROFESSIONAL_SERVICES: 'Expert consultancy, legal/IP services, design agencies, and external technical advisory.',
  OUTREACH: 'Demo days, pilot launches, marketing collateral, trade show booths, and community workshops.',
  CONTINGENCY: 'Unforeseen expenses. Recommended to keep under 10% of the total grant.',
};

export const BUDGET_HEADERS_ORDER: string[] = [
  'EQUIPMENT',
  'CONSUMABLES',
  'SOFTWARE_CLOUD',
  'MANPOWER',
  'TRAVEL',
  'TESTING',
  'PROFESSIONAL_SERVICES',
  'OUTREACH',
  'CONTINGENCY',
];

// ─── TRL Levels ─────────────────────────────────────────────────────
export const TRL_LABELS: Record<number, string> = {
  1: 'TRL 1 – Basic principles observed',
  2: 'TRL 2 – Technology concept formulated',
  3: 'TRL 3 – Experimental proof of concept',
  4: 'TRL 4 – Technology validated in lab',
  5: 'TRL 5 – Technology validated in relevant environment',
  6: 'TRL 6 – Technology demonstrated in relevant environment',
  7: 'TRL 7 – System prototype demonstration in operational environment',
  8: 'TRL 8 – System complete and qualified',
  9: 'TRL 9 – Actual system proven in operational environment',
};

// ─── MRL Levels ─────────────────────────────────────────────────────
export const MRL_LABELS: Record<number, string> = {
  1: 'MRL 1 – Market opportunity identified',
  2: 'MRL 2 – Market research conducted',
  3: 'MRL 3 – Target market defined',
  4: 'MRL 4 – Value proposition validated',
  5: 'MRL 5 – Business model validated',
  6: 'MRL 6 – Market entry strategy defined',
  7: 'MRL 7 – Go-to-market plan executed',
  8: 'MRL 8 – Market traction demonstrated',
  9: 'MRL 9 – Market dominance or scale achieved',
};

// ─── IRL Levels ─────────────────────────────────────────────────────
export const IRL_LABELS: Record<number, string> = {
  1: 'IRL 1 – IP landscape assessed',
  2: 'IRL 2 – Preliminary IP strategy defined',
  3: 'IRL 3 – Invention disclosure filed',
  4: 'IRL 4 – Patent application drafted',
  5: 'IRL 5 – Patent application filed',
  6: 'IRL 6 – Patent prosecution in progress',
  7: 'IRL 7 – Patent granted',
  8: 'IRL 8 – IP portfolio managed',
  9: 'IRL 9 – IP commercialized or licensed',
};

// ─── Experiment Assessment Questions ────────────────────────────────
export interface ExperimentQuestion {
  id: string;
  group: 'A' | 'B' | 'C';
  text: string;
}

export const EXPERIMENT_QUESTIONS: ExperimentQuestion[] = [
  // A. Technical Soundness (7)
  { id: 'A1', group: 'A', text: 'Is the problem statement clearly defined and technically sound?' },
  { id: 'A2', group: 'A', text: 'Is the proposed methodology appropriate for the stated objective?' },
  { id: 'A3', group: 'A', text: 'Is the experimental setup feasible within the proposed budget and timeline?' },
  { id: 'A4', group: 'A', text: 'Are the expected outcomes measurable and aligned with TRL-3 proof?' },
  { id: 'A5', group: 'A', text: 'Are the validation criteria well-defined and achievable?' },
  { id: 'A6', group: 'A', text: 'Are the risks and assumptions reasonable and properly mitigated?' },
  { id: 'A7', group: 'A', text: 'Are the deliverables clearly defined and time-bound?' },
  // B. Market Worthiness (3)
  { id: 'B1', group: 'B', text: 'Does the solution address a real market need or customer pain point?' },
  { id: 'B2', group: 'B', text: 'Is there evidence of market research or customer validation?' },
  { id: 'B3', group: 'B', text: 'Is the business model viable and scalable?' },
  // C. Execution Readiness (2)
  { id: 'C1', group: 'C', text: 'Does the team have the necessary skills and commitment to execute?' },
  { id: 'C2', group: 'C', text: 'Is the budget allocation reasonable and justified for each line item?' },
];

export const EXPERIMENT_QUESTION_GROUPS = {
  A: 'Technical Soundness',
  B: 'Market Worthiness',
  C: 'Execution Readiness',
} as const;

// ─── Milestone Items ────────────────────────────────────────────────
export const MILESTONE_ITEMS: Record<string, string[]> = {
  IDEA_PROTOTYPING: [
    'Problem identification and validation',
    'Literature review and prior art analysis',
    'Solution ideation and concept design',
    'Feasibility study completed',
    'Prototype design finalized',
    'Prototype development (Version 1)',
    'Prototype testing and iteration',
    'Proof of concept demonstration',
    'Technical documentation completed',
    'Final prototype ready for deployment',
  ],
  PROFESSIONAL_PRACTICE: [
    'Industry problem identified through engagement',
    'Stakeholder requirements documented',
    'Professional network and mentors established',
    'Market analysis and competitive study',
    'Business plan drafted',
    'Startup registered or entity formed',
    'Minimum viable product (MVP) launched',
    'Customer acquisition and pilot deployment',
    'Revenue model validated',
    'Scale-up and growth plan finalized',
  ],
};

// ─── Application form section labels ────────────────────────────────
export const APPLICATION_SECTIONS = [
  { step: 0, label: 'Prerequisites', description: 'Documents & team member details' },
  { step: 1, label: 'Grant Type', description: 'Select your grant category' },
  { step: 2, label: 'Applicant Details', description: 'Your personal & team information' },
  { step: 3, label: 'Problem Statement', description: 'Define the problem you are solving' },
  { step: 4, label: 'Proposed Solution', description: 'Your proposed approach' },
  { step: 5, label: 'Effort & Traction', description: 'Work done so far' },
  { step: 6, label: 'Experiment Design', description: '10 experiment definition fields' },
  { step: 7, label: 'Budget', description: 'Itemized budget breakdown' },
  { step: 8, label: 'Readiness Levels', description: 'TRL, MRL & IRL self-assessment' },
  { step: 9, label: 'Milestones', description: 'Milestone self-assessment' },
  { step: 10, label: 'Declaration', description: 'Review & submit' },
] as const;

// ─── Max grants per team ────────────────────────────────────────────
export const MAX_GRANTS_PER_TEAM = 3;

// ─── File upload constraints ────────────────────────────────────────
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_FILE_TYPES = {
  document: ['application/pdf'],
  image: ['image/jpeg', 'image/jpg', 'image/png'],
};

// ─── Form B Timeline Fields ─────────────────────────────────────────
export const FORM_B_TIMELINE_FIELDS = [
  { key: 'grantApprovalDate', label: 'Grant Approval Date' },
  { key: 'fundReleaseDate', label: 'Fund Release Date' },
  { key: 'experimentDuration', label: 'Experiment Duration' },
  { key: 'midReviewDate', label: 'Mid-Review Date' },
  { key: 'grantUtilizationDeadline', label: 'Grant Utilization Deadline' },
  { key: 'experimentCompletionDate', label: 'Experiment Completion Date' },
  { key: 'finalSubmissionDate', label: 'Final Submission Date' },
  { key: 'closureDate', label: 'Closure Date' },
] as const;

// ─── Form B Terms & Conditions ──────────────────────────────────────
export const FORM_B_TERMS = [
  'No transfer of grant funds to personal bank accounts.',
  'All purchases shall be made by the institute and treated as university property.',
  'The startup must be registered within 6 months of grant approval and accept an equity-sharing agreement with the institution.',
  'All sale vouchers, invoices, and receipts must be submitted for audit and reconciliation.',
  'Funds shall be disbursed to vendors or via prepaid cards only. No cash disbursements permitted.',
];

// ─── Form B Signature blocks ────────────────────────────────────────
export const FORM_B_SIGNATORIES = [
  'Vice Chancellor',
  'Dean / Head of Department',
  'Director, IDEAPAD',
  'Assistant Director – Startups',
  'School of Management Representative',
];

export const FORM_A_SIGNATORIES = [
  'SEC Member 1',
  'SEC Member 2',
  'SEC Member 3',
];

// ─── Decision guide hints ───────────────────────────────────────────
export const DECISION_GUIDE = {
  fundingHint: 'Mostly YES across all members → Recommend funding at the suggested level.',
  revisionHint: 'Multiple NO responses → Consider requesting revision or re-presentation.',
  rejectionHint: 'Majority NO on Technical Soundness → Strong case for rejection.',
};
