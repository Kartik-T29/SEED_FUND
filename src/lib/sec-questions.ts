export const SEC_QUESTIONS = [
  { group: "A. Technical Soundness", items: [
    "Is the problem clearly defined?",
    "Is the hypothesis/objective of the experiment clear?",
    "Does the experiment logically test the core technology?",
    "Is the methodology realistic and technically feasible?",
    "Are required tools/resources identified?",
    "Will experiment provide a validation of your idea? (TRL 2)",
    "Will results provide proof-of-concept (TRL-3 evidence)?",
  ]},
  { group: "B. Market Worthiness", items: [
    "Is there a clearly identified user/customer need?",
    "Does the experiment reduce a key market or product risk?",
    "Is there a plausible application/use case after TRL-3?",
  ]},
  { group: "C. Execution Readiness", items: [
    "Is timeline realistic?",
    "Does the team show adequate technical understanding?",
  ]},
]; // 12 questions, numbered 1-12 in order

export const NO_THRESHOLD_HINT = 3; // NO count at which "Multiple NO" hint appears

// Flattened helper with 1-based index
export const FLAT_SEC_QUESTIONS = SEC_QUESTIONS.flatMap((group, gIdx) =>
  group.items.map((text, iIdx) => ({
    group: group.group,
    text,
  }))
).map((q, index) => ({
  number: index + 1,
  ...q,
}));
