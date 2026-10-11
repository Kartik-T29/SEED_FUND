import { createHash } from "crypto";

export const AGREEMENT_VERSION = "v1";
export const AGREEMENT_TITLE = "IDEAPAD Seed Grant: Terms and Conditions";
export const AGREEMENT_INTRO =
  "By submitting this application, the team agrees to the following terms of the IDEAPAD Grant Policy of ITM University.";
export const AGREEMENT_TERMS = [
  "Disbursement: Approved funds are paid directly to the vendor or service provider for purchases, or through prepaid cards for managed or sundry expenditure. No cash will be provided, and sanctioned amounts will not be transferred to a personal account.",
  "Ownership: All purchases and prototypes developed with the grant are the property of ITM University.",
  "Utilization and reporting: The team will submit an expense report with copies of supporting bills and invoices, provide all original bills and invoices to IDEAPAD, and submit a final report and utilization report before the next stage or exit.",
  "Sale vouchers: The team will submit all sale vouchers to the incubator.",
  "Registration and equity: The team will aim to register its startup within six months and accept the equity sharing agreement with the incubator.",
  "Grant limit: A team may receive a maximum of 3 grants unless the limit is waived.",
  "Compliance: Non-compliance with these terms will lead to termination of the grant and future ineligibility.",
  "Accuracy: All information and documents submitted in this application are true, and the requested amount will be used strictly for the stated purpose.",
];

export function getAgreementTextHash(): string {
  const fullText = AGREEMENT_TITLE + AGREEMENT_INTRO + AGREEMENT_TERMS.join("");
  return createHash("sha256").update(fullText).digest("hex");
}
