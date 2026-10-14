export type Section1Mode = "ALL_MEMBERS_ALL_SCALES" | "ONE_SCALE_PER_MEMBER";

export let SECTION1_MODE: Section1Mode = "ALL_MEMBERS_ALL_SCALES";

export function setSection1Mode(mode: Section1Mode) {
  SECTION1_MODE = mode;
}

export const TRL_LABELS_FORM_A = [
  "TRL 1: Idea/principle",
  "TRL 2: Concept formulated",
  "TRL 3: Experimental proof",
  "TRL 4: Lab testing",
  "TRL 5: Prototype validated",
  "TRL 6: Prototype demonstrated",
  "TRL 7: System level prototype tested",
  "TRL 8: Final product ready",
  "TRL 9: Market launch & scaling",
] as const;

export const MRL_LABELS_FORM_A = [
  "MRL1 : Basic Manufacturing concept",
  "MRL2 : Manufacturing concept defined",
  "MRL3 : Materials & process identified",
  "MRL4 : Lab-level manufacturing",
  "MRL5 : Prototype manufacturing",
  "MRL6 : Pilot manufacturing",
  "MRL7 : Low-rate production",
  "MRL8 : Stable manufacturing",
  "MRL9 : Mass production",
] as const;

export const IRL_LABELS_FORM_A = [
  "IRL 1: Integration concept identified",
  "IRL 2: Integration assumptions defined",
  "IRL 3: Interface proof of concept",
  "IRL 4: Subsystem integration validated",
  "IRL 5: System integration in relevant environment",
  "IRL 6: Integrated system demonstrated",
  "IRL 7: Integration in operational environment",
  "IRL 8: Integration proven and stable",
  "IRL 9: Fully integrated and sustained",
] as const;

export const GRANT_EVALUATION_OPTIONS = [
  { key: "IDEATION", label: "Ideation" },
  { key: "VALIDATION", label: "Validation" },
  { key: "PROOF", label: "Proof of Concept" },
  { key: "SCALING", label: "Scaling" },
  { key: "EMERGENCY", label: "Emergency" },
  { key: "REPRESENT", label: "Present again" },
  { key: "REJECTED", label: "None-Rejected" },
] as const;

export function computeLevelMajority(levels: (number | null | undefined)[], scaleType: 'TRL' | 'MRL' | 'IRL' = 'TRL') {
  const valid = levels.filter((l): l is number => typeof l === 'number' && l >= 1 && l <= 9);
  if (valid.length === 0) {
    return { hasMajority: false, label: "Not assessed" };
  }

  const counts: Record<number, number> = {};
  for (const l of valid) {
    counts[l] = (counts[l] || 0) + 1;
  }

  for (const [lvlStr, count] of Object.entries(counts)) {
    if (count >= 2) {
      const lvl = Number(lvlStr);
      return {
        hasMajority: true,
        level: lvl,
        label: `Level ${lvl}`,
      };
    }
  }

  const distinct = Array.from(new Set(valid)).sort((a, b) => a - b);
  return {
    hasMajority: false,
    level: null,
    label: `No majority (levels: ${distinct.join(" / ")})`,
  };
}

export function computeGrantTypeMajority(grantTypes: (string | null | undefined)[]) {
  const valid = grantTypes.filter((g): g is string => !!g);
  if (valid.length === 0) return null;

  const counts: Record<string, number> = {};
  for (const g of valid) {
    counts[g] = (counts[g] || 0) + 1;
  }

  for (const [type, count] of Object.entries(counts)) {
    if (count >= 2) return type;
  }

  return null;
}

export function computeHeaderAverages(
  budgetItemsPerMember: Record<string, number>[],
  recommendations: (string | null | undefined)[]
): { averages: Record<string, number>; totalAverage: number } {
  // Only count members who recommended funding (not REJECTED or null)
  const fundingMemberIndices = recommendations
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => r && r !== 'REJECTED')
    .map(({ idx }) => idx);

  const averages: Record<string, number> = {};
  let totalAverage = 0;

  if (fundingMemberIndices.length === 0) {
    return { averages, totalAverage: 0 };
  }

  const allKeys = new Set<string>();
  for (const b of budgetItemsPerMember) {
    Object.keys(b).forEach((k) => allKeys.add(k));
  }

  for (const key of allKeys) {
    let sum = 0;
    for (const idx of fundingMemberIndices) {
      sum += Number(budgetItemsPerMember[idx]?.[key]) || 0;
    }
    const rawAvg = sum / fundingMemberIndices.length;
    // Rounded to nearest ₹10
    const rounded = Math.round(rawAvg / 10) * 10;
    averages[key] = rounded;
    totalAverage += rounded;
  }

  return { averages, totalAverage };
}
