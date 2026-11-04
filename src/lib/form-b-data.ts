import crypto from 'crypto';
import { prisma } from './prisma';
import { requireRole, Session, Forbidden } from './access';
import { formatISTDate, formatISTDateTime, formatDateOnly } from './dates';
import { getSignatories, Signatory } from './signatories';
import {
  BUDGET_HEADERS,
  FORM_B_TIMELINE_FIELDS,
  POLICY_TERMS_AND_CONDITIONS,
  GRANT_RANGES,
} from './seedfund-constants';
import { formatIndianCurrency, deterministicStringify } from './form-a-data';

export interface FormBData {
  applicationId: string;
  isFinal: boolean;
  draftWatermark: string | null;

  startup: {
    teamName: string;
    applicantName: string;
    enrollmentNo: string;
    programAndDept: string;
  };
  sanctionDateIST: string;
  generatedAtIST: string;

  // Grant Evaluation Section
  grantEvaluation: {
    decision: string; // 'VALIDATION', 'PROOF', 'SCALING', 'REJECTED'
    approvedGrantType: string;
    rows: Array<{
      key: string;
      label: string;
      approved: string; // 'Approved' or ''
    }>;
  };

  // 9 Headers Sanctioned Budget
  sanctionedBudget: {
    headers: Array<{
      key: string;
      name: string;
      amount: string; // Formatted ₹
      amountRaw: number;
    }>;
    totalAmount: string; // Formatted ₹
    totalAmountRaw: number;
    rangeNotice: string | null; // Note ONLY if total is outside tier range
  };

  // 8 Timeline Dates
  timeline: Array<{
    key: string;
    label: string;
    description: string;
    dateIST: string;
  }>;

  // Final Recommendation Note from SEC
  secRecommendationNote: string;

  // Terms and Conditions
  termsAndConditions: readonly string[];
  acknowledgement: string;

  // Approval Block (from settings)
  approvalBlock: Array<{
    key: string;
    name: string;
    designation: string;
    hasName: boolean;
  }>;
}

export const FORM_B_GRANT_TYPES = [
  { key: 'VALIDATION', label: 'validation Grant' },
  { key: 'PROOF', label: 'Proof Grant' },
  { key: 'SCALING', label: 'Scaling Grant' },
  { key: 'REJECTED', label: 'None/Application Rejected' },
];

/**
 * Builds canonical Form B data object.
 * Strictly enforced: ADMIN ONLY.
 */
export async function buildFormBData(applicationId: string, s: Session): Promise<FormBData> {
  requireRole(s, 'ADMIN');

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      startup: { include: { user: true } },
      evaluation: true,
    },
  });

  if (!app) throw new Forbidden('NOT_FOUND');

  const evaluation = app.evaluation;
  const isFinal = Boolean(evaluation && evaluation.decision);
  const draftWatermark = isFinal ? null : 'DRAFT - NOT FOR SIGNATURE';

  // Decision & approved amounts
  const decisionKey = evaluation?.decision || app.grantType || 'VALIDATION';
  const rawAmounts = (evaluation?.amounts as any) || {};
  const rawTimeline = (evaluation?.timeline as any) || {};

  // Build 9 headers
  let totalRaw = 0;
  const headers = BUDGET_HEADERS.map((h, idx) => {
    const val = Number(rawAmounts[h.key]) || Number(rawAmounts[String(idx + 1)]) || 0;
    totalRaw += val;
    return {
      key: h.key,
      name: h.name,
      amount: formatIndianCurrency(val),
      amountRaw: val,
    };
  });

  if (totalRaw === 0 && evaluation?.approvedTotal) {
    totalRaw = Number(evaluation.approvedTotal);
  }

  // Range validation note ONLY if total is outside tier range
  let rangeNotice: string | null = null;
  const targetGrantType = evaluation?.decision || app.grantType;
  if (targetGrantType && targetGrantType !== 'EMERGENCY' && targetGrantType !== 'REJECTED') {
    const range = (GRANT_RANGES as any)[targetGrantType];
    if (range && (totalRaw < range[0] || totalRaw > range[1])) {
      rangeNotice = `Note: Sanctioned total (${formatIndianCurrency(
        totalRaw
      )}) departs from standard ${targetGrantType} policy range (${formatIndianCurrency(
        range[0]
      )} to ${formatIndianCurrency(range[1])}).`;
    }
  }

  // Grant type table
  const grantTypeRows = FORM_B_GRANT_TYPES.map((gt) => {
    const isApproved =
      decisionKey.toLowerCase() === gt.key.toLowerCase() ||
      (decisionKey.toLowerCase() === 'approved' && gt.key === 'PROOF');
    return {
      key: gt.key,
      label: gt.label,
      approved: isApproved ? 'Approved' : '',
    };
  });

  // Approved Timeline (8 dates from policy)
  const timeline = FORM_B_TIMELINE_FIELDS.map((f) => {
    const rawVal = rawTimeline[f.id];
    let dateStr = 'Not provided';
    if (rawVal) {
      dateStr = formatDateOnly(rawVal);
    }
    return {
      key: f.id,
      label: f.label,
      description: f.desc,
      dateIST: dateStr,
    };
  });

  // Official Signatories from Settings
  const allSignatories = await getSignatories();
  // Order: Head Incubation, Director IDEAPAD, Vice Chancellor
  const approvalBlock = ['head_incubation', 'director_ideapad', 'vice_chancellor']
    .map((key) => {
      const sig = allSignatories.find((s) => s.key === key);
      return sig
        ? {
            key: sig.key,
            name: sig.name || '',
            designation: sig.designation,
            hasName: Boolean(sig.name && sig.name.trim().length > 0),
          }
        : null;
    })
    .filter(Boolean) as FormBData['approvalBlock'];

  return {
    applicationId: app.id,
    isFinal,
    draftWatermark,
    startup: {
      teamName: app.startup.teamName,
      applicantName: app.startup.user?.name || 'Not provided',
      enrollmentNo: app.startup.enrollmentNo || 'Not provided',
      programAndDept: `${app.startup.program || 'Program'} ${
        app.startup.department ? `· ${app.startup.department}` : ''
      }`,
    },
    sanctionDateIST: formatISTDate(evaluation?.decidedAt || new Date()),
    generatedAtIST: formatISTDateTime(new Date()),
    grantEvaluation: {
      decision: decisionKey,
      approvedGrantType: decisionKey,
      rows: grantTypeRows,
    },
    sanctionedBudget: {
      headers,
      totalAmount: formatIndianCurrency(totalRaw),
      totalAmountRaw: totalRaw,
      rangeNotice,
    },
    timeline,
    secRecommendationNote:
      evaluation?.note ||
      'The Startup Evaluation Committee has reviewed the pitch, milestone achievements, and budget moderation report and recommends this grant sanction under the institutional incubator policy.',
    termsAndConditions: POLICY_TERMS_AND_CONDITIONS,
    acknowledgement: 'I / We hereby agree to adhere strictly to the terms and conditions outlined above.',
    approvalBlock,
  };
}

/**
 * Deterministic SHA-256 canonicalization for Form B.
 */
export function canonicalizeFormBData(data: FormBData): {
  canonicalJson: string;
  fullHash: string;
  shortHash: string;
} {
  const canonicalJson = deterministicStringify(data);
  const fullHash = crypto.createHash('sha256').update(canonicalJson).digest('hex');
  const shortHash = fullHash.substring(0, 12);
  return { canonicalJson, fullHash, shortHash };
}
