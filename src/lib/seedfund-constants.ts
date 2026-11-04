export const BUDGET_HEADERS = [
  {
    key: "equipment",
    name: "Equipment / Capital Purchase",
    desc: "Used for one-time asset creation for IDEAPAD. Requires quotation.",
    typical: [
      "Sensors, electronics, GPUs, servers",
      "Lab instruments",
      "Robotics kits, drones, fabrication tools",
      "3D printers, testing rigs",
    ],
    needsQuotation: true,
  },
  {
    key: "consumables",
    name: "Consumables / Prototyping Materials",
    desc: "For items that get used up during development.",
    typical: [
      "Electronic components",
      "PCB fabrication",
      "Mechanical parts",
      "Chemicals, raw materials",
      "Batteries, cables, connectors",
    ],
  },
  {
    key: "software",
    name: "Software & Cloud Services",
    desc: "Important for AI and CS startups.",
    typical: [
      "SaaS subscriptions",
      "Cloud compute credits (AWS, Azure, GCP)",
      "Dataset purchase",
      "API usage",
      "Software licenses",
    ],
  },
  {
    key: "manpower",
    name: "Manpower Assistance",
    desc: "Limited stipends allowed under many university grants.",
    typical: [
      "Student interns",
      "Research assistants",
      "Prototype developers",
      "Designers or annotators (AI datasets)",
    ],
  },
  {
    key: "travel",
    name: "Travel & Field Work",
    desc: "For validation and ecosystem exposure.",
    typical: [
      "Travel for competitions/hackathons",
      "Customer discovery visits",
      "Industry meetings",
      "Pilot deployment visits",
      "Conference participation",
    ],
  },
  {
    key: "testing",
    name: "Testing, Certification & Validation",
    desc: "Very important but often overlooked.",
    typical: [
      "Product testing labs",
      "Safety certification",
      "EMI/EMC testing",
      "AI model benchmarking",
      "Regulatory approvals",
    ],
  },
  {
    key: "services",
    name: "Professional Services / Consultancy",
    desc: "External expertise startups cannot build internally.",
    typical: [
      "Legal consultation",
      "Patent filing support",
      "CA/accounting services",
      "UI/UX consulting",
      "Product design mentorship",
    ],
  },
  {
    key: "outreach",
    name: "Outreach, Events & Dissemination",
    desc: "Used for visibility and ecosystem engagement.",
    typical: [
      "Demo day setup",
      "Posters & branding",
      "Website development",
      "Promotional videos",
      "Exhibition participation",
    ],
  },
  {
    key: "contingency",
    name: "Contingency / Miscellaneous",
    desc: "Usually 5–10% of total grant.",
    typical: [
      "Unplanned small purchases",
      "Repair & maintenance",
      "Logistics",
    ],
  },
] as const;

export type BudgetHeaderKey = typeof BUDGET_HEADERS[number]["key"];

export const GRANT_TYPES = [
  {
    id: "IDEATION",
    label: "Ideation Reward",
    targetTRL: "TRL 1: Idea/principle",
    targetMRL: "MRL 1: Basic Manufacturing concept",
    minAmount: 1000,
    maxAmount: 5000,
    eligibility: "Award winners from IDEAPAD competitions or prestigious competitions",
    purpose: "To explore the idea, conduct surveys, understand business canvas",
  },
  {
    id: "VALIDATION",
    label: "Validation Grant",
    targetTRL: "TRL 2: Concept formulated",
    targetMRL: "MRL 2: Manufacturing concept defined",
    minAmount: 5000,
    maxAmount: 20000,
    eligibility: "Business canvas, empathy sketch of potential customers, well-defined experiment with desired outcomes",
    purpose: "To test and evaluate the idea using various evaluation techniques and simulations",
  },
  {
    id: "PROOF",
    label: "Proof Grant",
    targetTRL: "TRL 3: Experimental proof",
    targetMRL: "MRL 3: Materials & process identified",
    minAmount: 25000,
    maxAmount: 50000,
    eligibility: "Complete prototype (hard/soft), schematics with material/process definition, pitch deck, facility agreement",
    purpose: "For assessing market response, showcasing idea to potential customers and investors",
  },
  {
    id: "SCALING",
    label: "Scaling Grant",
    targetTRL: "TRL 4: Lab testing & TRL 5: Prototype validated",
    targetMRL: "MRL 4–5: Lab/prototype manufacturing",
    minAmount: 50000,
    maxAmount: 500000,
    eligibility: "Startups with early traction and equity agreement with IDEAPAD",
    purpose: "For production, marketing, or operations",
  },
  {
    id: "EMERGENCY",
    label: "Emergency Support Grant",
    targetTRL: "Variable",
    targetMRL: "Variable",
    minAmount: null,
    maxAmount: null,
    eligibility: "Case-by-case basis",
    purpose: "For continuity and support (to prevent drop-out)",
  },
] as const;

export const GRANT_RANGES: Record<string, [number, number] | null> = {
  IDEATION: [1000, 5000],
  VALIDATION: [5000, 20000],
  PROOF: [25000, 50000],
  SCALING: [50000, 500000],
  EMERGENCY: null,
};

export const LEVELS = {
  TRL: [
    "Idea/principle",
    "Concept formulated",
    "Experimental proof",
    "Lab testing",
    "Prototype validated",
    "Prototype demonstrated",
    "System-level prototype tested",
    "Final product ready",
    "Market launch & scaling",
  ],
  MRL: [
    "Basic Manufacturing concept",
    "Manufacturing concept defined",
    "Materials & process identified",
    "Lab-level manufacturing",
    "Prototype manufacturing",
    "Pilot manufacturing",
    "Low-rate production",
    "Stable manufacturing",
    "Mass production",
  ],
  IRL: [
    "Integration concept identified",
    "Integration assumptions defined",
    "Interface proof of concept",
    "Subsystem integration validated",
    "System integration in relevant environment",
    "Integrated system demonstrated",
    "Integration in operational environment",
    "Integration proven and stable",
    "Fully integrated and sustained",
  ],
};

export const MILESTONES = {
  PROTOTYPING: [
    "Customer interviews",
    "Empathy map and root cause analysis",
    "Problem framing and validation",
    "Ideation sprint",
    "MVP sketching and hypothesis",
    "Early user feedback and target market clarity",
    "No-cost/low-cost product/idea/service development and field testing",
    "Present findings to mentors/incubator team",
    "MVP revision",
  ],
  PROFESSIONAL: [
    "Customer interviews",
    "Competitive landscape",
    "Analyze case studies in same field",
    "Target market clarity",
    "Mentor assignment",
    "Run a pilot with faculty/students with mock negotiation & pricing",
    "Present findings to mentors/incubator team",
    "Build & test Business Model Canvas (BMC)",
    "Calculate service economics and breakeven plan",
    "Pitch deck / Pitch to panel",
  ],
};

export const TRACK_LABELS = {
  PROTOTYPING: "Idea Prototyping and proof of concept",
  PROFESSIONAL: "Professional Practice and Entrepreneurship Development",
} as const;

export const EXPERIMENT_QUESTIONS = [
  // A. Technical Soundness
  { id: "q1", category: "A. Technical Soundness", num: 1, text: "Is the problem clearly defined?" },
  { id: "q2", category: "A. Technical Soundness", num: 2, text: "Is the hypothesis/objective of the experiment clear?" },
  { id: "q3", category: "A. Technical Soundness", num: 3, text: "Does the experiment logically test the core technology?" },
  { id: "q4", category: "A. Technical Soundness", num: 4, text: "Is the methodology realistic and technically feasible?" },
  { id: "q5", category: "A. Technical Soundness", num: 5, text: "Are required tools/resources identified?" },
  { id: "q6", category: "A. Technical Soundness", num: 6, text: "Will the experiment provide a validation of the idea (TRL 2)?" },
  { id: "q7", category: "A. Technical Soundness", num: 7, text: "Will results provide proof of concept (TRL-3 evidence)?" },
  // B. Market Worthiness
  { id: "q8", category: "B. Market Worthiness", num: 8, text: "Is there a clearly identified user/customer need?" },
  { id: "q9", category: "B. Market Worthiness", num: 9, text: "Does the experiment reduce a key market or product risk?" },
  { id: "q10", category: "B. Market Worthiness", num: 10, text: "Is there a plausible application/use case after TRL-3?" },
  // C. Execution Readiness
  { id: "q11", category: "C. Execution Readiness", num: 11, text: "Is the timeline realistic?" },
  { id: "q12", category: "C. Execution Readiness", num: 12, text: "Does the team show adequate technical understanding?" },
] as const;

export const FORM_B_TIMELINE_FIELDS = [
  { id: "grantApprovalDate", label: "Grant Approval Date", desc: "Date of sanction by committee" },
  { id: "fundReleaseDate", label: "Fund Release Date", desc: "Date funds are transferred to startup" },
  { id: "experimentDuration", label: "Experiment Duration", desc: "Total time allowed to complete TRL-3 experiment (e.g., 4–6 months) from release of funds" },
  { id: "midReviewDate", label: "Mid-Review Date", desc: "Progress check to verify technical work and spending" },
  { id: "grantUtilizationDeadline", label: "Grant Utilization Deadline", desc: "Last date by which funds must be spent" },
  { id: "experimentCompletionDate", label: "Experiment Completion Date", desc: "Deadline for proof-of-concept demonstration" },
  { id: "finalSubmissionDate", label: "Final Submission Date", desc: "Report + utilization certificate + demo evidence" },
  { id: "closureDate", label: "Closure Date", desc: "Final approval / grant closure by committee (to be eligible for next grant)" },
] as const;

export const POLICY_TERMS_AND_CONDITIONS = [
  "The sanctioned amounts will not be transferred to a personal account.",
  "All purchases will be made by the institute.",
  "The startup will aim to register their startup within six months and accept equity sharing agreement with the incubator.",
  "The startup will submit all sale vouchers to the Incubator.",
  "All purchases and prototypes developed herewith will be considered property of ITM University.",
] as const;
