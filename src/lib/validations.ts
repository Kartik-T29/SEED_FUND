import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(100).email('Invalid email address'),
  password: z.string().min(1, 'Password is required').max(128),
});

export const registerSchema = z.object({
  name: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(2, 'Name must be at least 2 characters').max(100)
  ),
  enrollmentNo: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(1, 'Enrollment number is required').max(50)
  ),
  program: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(1, 'Program is required').max(100)
  ),
  email: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
    z.string().max(100).email('Invalid email address')
  ),
  phone: z.preprocess(
    (val) =>
      typeof val === 'string'
        ? val.trim().replace(/^(\+91[\s-]?|0)/, '').replace(/[\s-]/g, '')
        : val,
    z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number (e.g. 9876543210)')
  ),
  teamName: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(2, 'Team / Startup name must be at least 2 characters').max(100)
  ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character (e.g. !@#$%^&*)'),
  confirmPassword: z.string().min(1, 'Please confirm your password').max(128),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const secRegisterSchema = z.object({
  name: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().min(2, 'Name must be at least 2 characters').max(100)
  ),
  email: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
    z.string().max(100).email('Invalid email address')
  ),
  designation: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().max(100).optional()
  ),
  department: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().max(100).optional()
  ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character (e.g. !@#$%^&*)'),
  confirmPassword: z.string().min(1, 'Please confirm your password').max(128),
  inviteCode: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().max(100).optional()
  ),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  confirmNewPassword: z.string().max(128),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match',
  path: ['confirmNewPassword'],
});

export const grantTypeSchema = z.enum(['IDEATION', 'VALIDATION', 'PROOF', 'SCALING', 'EMERGENCY']);

export const applicationFormSection2Schema = z.object({
  applicantName: z.string().min(1, 'Name is required').max(100),
  enrollmentNo: z.string().min(1, 'Enrollment number is required').max(50),
  program: z.string().min(1, 'Program is required').max(100),
  teamName: z.string().min(1, 'Team/startup name is required').max(100),
  phone: z.string().min(1, 'Phone is required').max(20),
  email: z.string().max(100).email('Valid email is required'),
});

export const applicationFormSection3Schema = z.object({
  problemStatement: z.string().min(10, 'Problem statement must be at least 10 characters').max(5000),
});

export const applicationFormSection4Schema = z.object({
  proposedSolution: z.string().min(10, 'Proposed solution must be at least 10 characters').max(5000),
});

export const applicationFormSection5Schema = z.object({
  effortAndTraction: z.string().min(10, 'Please describe your effort and traction so far').max(5000),
});

export const experimentFieldsSchema = z.object({
  objective: z.string().min(1, 'Objective is required').max(2000),
  problemStatement: z.string().min(1, 'Problem statement is required').max(2000),
  expectedOutcome: z.string().min(1, 'Expected outcome is required').max(2000),
  methodology: z.string().min(1, 'Methodology is required').max(2000),
  experimentalSetup: z.string().min(1, 'Experimental setup is required').max(2000),
  dataToBeCollected: z.string().min(1, 'Data collection plan is required').max(2000),
  validationCriteria: z.string().min(1, 'Validation criteria is required').max(2000),
  risksAndAssumptions: z.string().min(1, 'Risks and assumptions are required').max(2000),
  timeline: z.string().min(1, 'Timeline is required').max(2000),
  deliverables: z.string().min(1, 'Deliverables are required').max(2000),
});

export const budgetItemSchema = z.object({
  header: z.enum(['EQUIPMENT', 'CONSUMABLES', 'SOFTWARE_CLOUD', 'MANPOWER', 'TRAVEL', 'TESTING', 'PROFESSIONAL_SERVICES', 'OUTREACH', 'CONTINGENCY']),
  name: z.string().min(1, 'Item name is required').max(200),
  description: z.string().max(1000).optional(),
  vendorSource: z.string().max(200).optional(),
  unitCost: z.number().positive('Unit cost must be positive'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  total: z.number().nonnegative(),
  justification: z.string().max(1000).optional(),
});

export const readinessLevelSchema = z.object({
  trl: z.number().int().min(1).max(9),
  mrl: z.number().int().min(1).max(9),
  irl: z.number().int().min(1).max(9),
});

export const milestoneItemSchema = z.object({
  name: z.string(),
  status: z.enum(['COMPLETED', 'PENDING']),
  remarks: z.string().optional(),
});

export const declarationSchema = z.object({
  accepted: z.literal(true, { errorMap: () => ({ message: 'You must accept the declaration' }) }),
  name: z.string().min(1, 'Name is required'),
  date: z.string().min(1, 'Date is required'),
});

export const statusAssessmentSchema = z.object({
  trlLevel: z.number().int().min(1, 'TRL must be 1-9').max(9, 'TRL must be 1-9'),
  mrlLevel: z.number().int().min(1, 'MRL must be 1-9').max(9, 'MRL must be 1-9'),
  irlLevel: z.number().int().min(1, 'IRL must be 1-9').max(9, 'IRL must be 1-9'),
});

export const experimentQuestionAnswerSchema = z.object({
  questionId: z.string(),
  answer: z.boolean(),
  note: z.string().optional(),
});

export const experimentAssessmentSchema = z.object({
  questions: z.array(experimentQuestionAnswerSchema).length(12, 'All 12 questions must be answered'),
  recommendationNote: z.string().optional(),
  suggestedGrantType: z.enum(['VALIDATION', 'PROOF', 'SCALING', 'REJECTED']).nullable().optional(),
  suggestedAmounts: z.record(z.number().nonnegative()).optional(),
  suggestedTotal: z.number().nonnegative().optional(),
});

export const grantEvaluationSchema = z.object({
  decision: z.enum(['VALIDATION', 'PROOF', 'SCALING', 'REJECTED', 'RE_PRESENTATION']),
  approvedAmounts: z.record(z.number().nonnegative()),
  approvedTotal: z.number().nonnegative(),
  recommendationNote: z.string().optional(),
  termsAcknowledged: z.literal(true, { errorMap: () => ({ message: 'You must acknowledge the terms' }) }),
  timeline: z.object({
    grantApprovalDate: z.string().min(1),
    fundReleaseDate: z.string().min(1),
    experimentDuration: z.string().min(1),
    midReviewDate: z.string().min(1),
    grantUtilizationDeadline: z.string().min(1),
    experimentCompletionDate: z.string().min(1),
    finalSubmissionDate: z.string().min(1),
    closureDate: z.string().min(1),
  }),
  rePresentationDate: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type BudgetItemInput = z.infer<typeof budgetItemSchema>;
export type StatusAssessmentInput = z.infer<typeof statusAssessmentSchema>;
export type ExperimentAssessmentInput = z.infer<typeof experimentAssessmentSchema>;
export type GrantEvaluationInput = z.infer<typeof grantEvaluationSchema>;
