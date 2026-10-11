import { z } from "zod";
import { AGREEMENT_VERSION } from "./agreement";

export const agreementSchema = z.object({
  version: z.literal(AGREEMENT_VERSION),
  textHash: z.string().min(1, "Text hash is required"),
  acceptedByName: z.string().trim().min(2, "Full name must be entered"),
  acceptedByUserId: z.string().optional(),
  acceptedAt: z.string().optional(),
});

export const basicInfoSchema = z.object({
  grantType: z.enum(["IDEATION", "VALIDATION", "PROOF", "SCALING", "EMERGENCY"]),
  problemStatement: z.string().trim().min(10, "Problem statement is required (at least 10 chars)").max(600, "Maximum 600 characters"),
  proposedSolution: z.string().trim().min(10, "Proposed solution is required (at least 10 chars)").max(600, "Maximum 600 characters"),
  effortAndTraction: z.string().trim().min(10, "Effort and traction is required (at least 10 chars)").max(800, "Maximum 800 characters"),
  hasReceivedGrantBefore: z.boolean().default(false),
});

export const experimentSchema = z.object({
  objective: z.string().trim().min(5, "Objective is required").max(800, "Maximum 800 characters"),
  problemStatement: z.string().trim().min(5, "Problem statement is required").max(800, "Maximum 800 characters"),
  expectedOutcome: z.string().trim().min(5, "Expected outcome is required").max(800, "Maximum 800 characters"),
  methodology: z.string().trim().min(5, "Methodology is required").max(800, "Maximum 800 characters"),
  experimentalSetup: z.string().trim().min(5, "Experimental setup is required").max(800, "Maximum 800 characters"),
  dataToBeCollected: z.string().trim().min(5, "Data to be collected is required").max(800, "Maximum 800 characters"),
  validationCriteria: z.string().trim().min(5, "Validation criteria is required").max(800, "Maximum 800 characters"),
  risksAndAssumptions: z.string().trim().min(5, "Risks and assumptions are required").max(800, "Maximum 800 characters"),
  timeline: z.string().trim().min(5, "Timeline is required").max(800, "Maximum 800 characters"),
  deliverables: z.string().trim().min(5, "Deliverables are required").max(800, "Maximum 800 characters"),
});

export const budgetItemInputSchema = z.object({
  id: z.string().optional(),
  header: z.string().min(1, "Header is required"),
  name: z.string().trim().min(2, "Item name is required"),
  vendor: z.string().trim().min(1, "Vendor / Source is required"),
  unitCost: z.number().min(0, "Unit cost must be non-negative"),
  qty: z.number().int().min(1, "Quantity must be at least 1"),
  total: z.number().min(0),
  justification: z.string().trim().max(300, "Maximum 300 characters").optional(),
});

export const selfAssessmentSchema = z.object({
  trl: z.number().int().min(1).max(9),
  mrl: z.number().int().min(1).max(9),
  irl: z.number().int().min(1).max(9),
  track: z.enum(["PROTOTYPING", "PROFESSIONAL"]),
  milestones: z.array(
    z.object({
      name: z.string(),
      status: z.enum(["COMPLETED", "PENDING"]),
      remarks: z.string().max(300).optional(),
    })
  ).min(1, "At least one milestone required"),
});

export const teamMemberSchema = z.object({
  name: z.string().trim().min(2, "Member name is required"),
});

export const declarationSchema = z.object({
  accepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the declaration to submit" }),
  }),
  declaredByName: z.string().trim().min(2, "Full name must be entered"),
  declaredAt: z.string().optional(),
});

export const applicationFormDataSchema = z.object({
  agreement: agreementSchema.optional(),
  problemStatement: z.string().max(600).optional(),
  proposedSolution: z.string().max(600).optional(),
  effortAndTraction: z.string().max(800).optional(),
  hasReceivedGrantBefore: z.boolean().optional(),
  experiment: experimentSchema.optional(),
  selfAssessment: selfAssessmentSchema.optional(),
  teamMembers: z.array(teamMemberSchema).optional(),
  declaration: declarationSchema.optional(),
});

export type ApplicationFormData = z.infer<typeof applicationFormDataSchema>;
export type AgreementData = z.infer<typeof agreementSchema>;
export type BasicInfoData = z.infer<typeof basicInfoSchema>;
export type ExperimentData = z.infer<typeof experimentSchema>;
export type BudgetItemInput = z.infer<typeof budgetItemInputSchema>;
export type SelfAssessmentData = z.infer<typeof selfAssessmentSchema>;
export type TeamMemberData = z.infer<typeof teamMemberSchema>;
export type DeclarationData = z.infer<typeof declarationSchema>;
