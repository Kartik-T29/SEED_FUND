export const BUDGET_HEADERS = [
  { key: "equipment", name: "Equipment / Capital Purchase", desc: "One-time asset creation for IDEAPAD.", typical: ["Sensors, electronics, GPUs, servers", "Lab instruments", "Robotics kits, drones, fabrication tools", "3D printers, testing rigs"], needsQuotation: true },
  { key: "consumables", name: "Consumables / Prototyping Materials", desc: "Items that get used up during development.", typical: ["Electronic components", "PCB fabrication", "Mechanical parts", "Chemicals, raw materials", "Batteries, cables, connectors"] },
  { key: "software", name: "Software & Cloud Services", desc: "Important for AI and CS startups.", typical: ["SaaS subscriptions", "Cloud compute credits (AWS, Azure, GCP)", "Dataset purchase", "API usage", "Software licenses"] },
  { key: "manpower", name: "Manpower Assistance", desc: "Limited stipends allowed under many university grants.", typical: ["Student interns", "Research assistants", "Prototype developers", "Designers or annotators (AI datasets)"] },
  { key: "travel", name: "Travel & Field Work", desc: "For validation and ecosystem exposure.", typical: ["Travel for competitions/hackathons", "Customer discovery visits", "Industry meetings", "Pilot deployment visits", "Conference participation"] },
  { key: "testing", name: "Testing, Certification & Validation", desc: "Very important but often overlooked.", typical: ["Product testing labs", "Safety certification", "EMI/EMC testing", "AI model benchmarking", "Regulatory approvals"] },
  { key: "services", name: "Professional Services / Consultancy", desc: "External expertise startups cannot build internally.", typical: ["Legal consultation", "Patent filing support", "CA/accounting services", "UI/UX consulting", "Product design mentorship"] },
  { key: "outreach", name: "Outreach, Events & Dissemination", desc: "Visibility and ecosystem engagement.", typical: ["Demo day setup", "Posters & branding", "Website development", "Promotional videos", "Exhibition participation"] },
  { key: "contingency", name: "Contingency / Miscellaneous", desc: "Usually 5–10% of total grant.", typical: ["Unplanned small purchases", "Repair & maintenance", "Logistics"] },
] as const;

export type BudgetHeaderKey = typeof BUDGET_HEADERS[number]["key"];

export const GRANT_RANGES = {
  IDEATION: [1000, 5000], VALIDATION: [5000, 20000], PROOF: [25000, 50000],
  SCALING: [50000, 500000], EMERGENCY: null,
} as const;

export const LEVELS = {
  TRL: ["Idea/principle", "Concept formulated", "Experimental proof", "Lab testing", "Prototype validated", "Prototype demonstrated", "System level prototype tested", "Final product ready", "Market launch & scaling"],
  MRL: ["Basic Manufacturing concept", "Manufacturing concept defined", "Materials & process identified", "Lab-level manufacturing", "Prototype manufacturing", "Pilot manufacturing", "Low-rate production", "Stable manufacturing", "Mass production"],
  IRL: ["Integration concept identified", "Integration assumptions defined", "Interface proof of concept", "Subsystem integration validated", "System integration in relevant environment", "Integrated system demonstrated", "Integration in operational environment", "Integration proven and stable", "Fully integrated and sustained"],
}; // render as "TRL 1: Idea/principle", "IRL 3: Interface proof of concept", etc.

export const MILESTONES = {
  PROTOTYPING: ["Customer interviews", "Empathy map and root cause analysis", "Problem framing and validation", "Ideation sprint", "MVP sketching and hypothesis", "Early user feedback and target market clarity", "No cost/low cost product/idea/service development and field testing", "Present findings to mentors/incubator team", "MVP revision"],
  PROFESSIONAL: ["Customer interviews", "Competitive landscape", "Analyze case studies in same field", "Target market clarity", "Mentor assignment", "Run a pilot with faculty/students with mock negotiation & pricing", "Present findings to mentors/incubator team", "Build & test Business Model Canvas (BMC)", "Calculate service economics and breakeven plan", "Pitch deck / Pitch to panel"],
};

export const TRACK_LABELS = {
  PROTOTYPING: "Idea Prototyping and proof of concept",
  PROFESSIONAL: "Professional Practice and Entrepreneurship Development",
} as const;
