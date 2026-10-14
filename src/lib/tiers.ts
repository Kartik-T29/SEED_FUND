export const TIERS = [
  { key: "IDEATION",   label: "Ideation",         range: [1000, 5000],   order: 1 },
  { key: "VALIDATION", label: "Validation",       range: [5000, 20000],  order: 2 },
  { key: "PROOF",      label: "Proof of Concept", range: [25000, 50000], order: 3 },
  { key: "SCALING",    label: "Scaling",          range: [50000, 500000], order: 4 },
  { key: "EMERGENCY",  label: "Emergency",        range: null,           order: 5 },
] as const;

export type TierKey = typeof TIERS[number]["key"];

export function getTier(key: string | null | undefined) {
  return TIERS.find((t) => t.key === key) || null;
}

export function getTierBadgeVariant(key: string | null | undefined): "default" | "success" | "warning" | "danger" | "info" {
  switch (key) {
    case "IDEATION":
      return "info";
    case "VALIDATION":
      return "warning";
    case "PROOF":
      return "success";
    case "SCALING":
      return "default";
    case "EMERGENCY":
      return "danger";
    default:
      return "default";
  }
}

export function getTierBadgeClasses(key: string | null | undefined): string {
  switch (key) {
    case "IDEATION":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "VALIDATION":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "PROOF":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "SCALING":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "EMERGENCY":
      return "bg-rose-100 text-rose-800 border-rose-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

