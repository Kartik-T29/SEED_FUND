import crypto from 'crypto';
import {
  BUDGET_HEADERS,
  GRANT_TYPES,
  GRANT_RANGES,
  LEVELS,
  TRACK_LABELS,
} from './seedfund-constants';
import { formatISTDate, formatISTDateTime } from './dates';

export interface CanonicalBudgetItem {
  sno: number;
  headerKey: string;
  headerName: string;
  name: string;
  vendor: string;
  unitCost: number;
  qty: number;
  total: number;
  justification: string;
}

export interface CanonicalApplicationData {
  applicationId: string;
  version: number;
  submittedAt: string | null;
  submittedAtIST: string;
  status: string;
  grantType: string;
  grantTierName: string;
  requestedTotal: number;

  startup: {
    teamName: string;
    enrollmentNo: string;
    program: string;
    department: string;
    phone: string;
    applicantName: string;
    applicantEmail: string;
  };

  agreement: {
    version: string;
    textHash: string;
    acceptedByName: string;
    acceptedAt: string;
    acceptedAtIST: string;
  } | null;

  concept: {
    problemStatement: string;
    proposedSolution: string;
    effortAndTraction: string;
    hasReceivedGrantBefore: boolean;
  };

  experiment: {
    objective: string;
    problemStatement: string;
    expectedOutcome: string;
    methodology: string;
    experimentalSetup: string;
    dataToBeCollected: string;
    validationCriteria: string;
    risksAndAssumptions: string;
    timeline: string;
    deliverables: string;
  };

  budget: {
    items: CanonicalBudgetItem[];
    nonContingencyTotal: number;
    contingencyTotal: number;
    contingencyPercentage: number;
    grandTotal: number;
  };

  selfAssessment: {
    trl: number;
    trlLabel: string;
    mrl: number;
    mrlLabel: string;
    irl: number;
    irlLabel: string;
    track: string;
    trackLabel: string;
    milestones: Array<{
      name: string;
      status: string;
      remarks: string;
    }>;
  };

  team: Array<{
    name: string;
  }>;

  documents: Array<{
    type: string;
    typeName: string;
    fileName: string;
    memberLabel?: string | null;
  }>;

  declaration: {
    declaredByName: string;
    declaredAt: string;
    declaredAtIST: string;
  } | null;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  DECK: 'Pitch Deck',
  PAN: 'PAN Card',
  AADHAAR: 'Aadhaar Card',
  PHOTO: 'Passport Photo',
  QUOTATION: 'Vendor Quotation',
  UTILIZATION_REPORT: 'Prior Grant Utilization Report',
  ANNEXURE: 'Supporting Evidence / Annexure',
  AGREEMENT: 'Signed Grant Policy Agreement',
};

export function buildApplicationData(app: any): CanonicalApplicationData {
  const startup = app.startup || {};
  const user = startup.user || {};
  const formData = (app.formData as any) || {};
  const rawBudgetItems = app.budgetItems || [];
  const rawDocs = app.documents || [];

  const grantType = app.grantType || 'IDEATION';
  const grantTier = GRANT_TYPES.find((g) => g.id === grantType);
  const range = (GRANT_RANGES as any)[grantType];
  const grantTierName = grantTier
    ? `${grantTier.label}${range ? ` (₹${range[0].toLocaleString('en-IN')}–₹${range[1].toLocaleString('en-IN')})` : ''}`
    : grantType;

  // 1. Budget normalization
  let nonContingency = 0;
  let contingency = 0;
  const canonicalBudgetItems: CanonicalBudgetItem[] = rawBudgetItems.map((b: any, index: number) => {
    const isCont = b.header === 'contingency';
    const uCost = Number(b.unitCost) || 0;
    const q = isCont ? 1 : Math.max(1, parseInt(b.qty) || 1);
    const rowTotal = isCont ? uCost : Math.round(uCost * q * 100) / 100;

    if (isCont) {
      contingency += rowTotal;
    } else {
      nonContingency += rowTotal;
    }

    const headerObj = BUDGET_HEADERS.find((h) => h.key === b.header);
    return {
      sno: index + 1,
      headerKey: b.header,
      headerName: headerObj?.name || b.header,
      name: b.name || '',
      vendor: b.vendor || '—',
      unitCost: uCost,
      qty: q,
      total: rowTotal,
      justification: b.justification || '',
    };
  });

  const grandTotal = nonContingency + contingency;
  const contingencyPercentage =
    nonContingency > 0 ? (contingency / nonContingency) * 100 : contingency > 0 ? 100 : 0;

  // 2. Agreement
  const agreement = formData.agreement
    ? {
        version: String(formData.agreement.version || 'v1'),
        textHash: String(formData.agreement.textHash || ''),
        acceptedByName: String(formData.agreement.acceptedByName || ''),
        acceptedAt: String(formData.agreement.acceptedAt || ''),
        acceptedAtIST: formData.agreement.acceptedAt
          ? formatISTDateTime(formData.agreement.acceptedAt)
          : 'N/A',
      }
    : null;

  // 3. Concept
  const concept = {
    problemStatement: String(formData.problemStatement || formData.problem || ''),
    proposedSolution: String(formData.proposedSolution || formData.solution || ''),
    effortAndTraction: String(formData.effortAndTraction || formData.traction || ''),
    hasReceivedGrantBefore: Boolean(formData.hasReceivedGrantBefore),
  };

  // 4. Experiment (10 Headings)
  const exp = formData.experiment || formData.experiments || {};
  const experiment = {
    objective: String(exp.objective || exp.hypothesis || ''),
    problemStatement: String(exp.problemStatement || exp.problem || ''),
    expectedOutcome: String(exp.expectedOutcome || exp.outcome || ''),
    methodology: String(exp.methodology || ''),
    experimentalSetup: String(exp.experimentalSetup || exp.setup || ''),
    dataToBeCollected: String(exp.dataToBeCollected || exp.data || ''),
    validationCriteria: String(exp.validationCriteria || exp.criteria || ''),
    risksAndAssumptions: String(exp.risksAndAssumptions || exp.risks || ''),
    timeline: String(exp.timeline || ''),
    deliverables: String(exp.deliverables || ''),
  };

  // 5. Self-Assessment (TRL, MRL, IRL, Milestones)
  const sa = formData.selfAssessment || {};
  const trlVal = Number(sa.trl) || 1;
  const mrlVal = Number(sa.mrl) || 1;
  const irlVal = Number(sa.irl) || 1;
  const trackKey = (sa.track === 'PROFESSIONAL' ? 'PROFESSIONAL' : 'PROTOTYPING') as 'PROTOTYPING' | 'PROFESSIONAL';

  const rawMilestones: any[] = Array.isArray(sa.milestones) ? sa.milestones : [];
  const milestones = rawMilestones.map((m) => ({
    name: String(m.name || ''),
    status: String(m.status || 'PENDING'),
    remarks: String(m.remarks || ''),
  }));

  const selfAssessment = {
    trl: trlVal,
    trlLabel: (LEVELS.TRL as string[])[trlVal - 1] || `Level ${trlVal}`,
    mrl: mrlVal,
    mrlLabel: (LEVELS.MRL as string[])[mrlVal - 1] || `Level ${mrlVal}`,
    irl: irlVal,
    irlLabel: (LEVELS.IRL as string[])[irlVal - 1] || `Level ${irlVal}`,
    track: trackKey,
    trackLabel: TRACK_LABELS[trackKey] || trackKey,
    milestones,
  };

  // 6. Team Members
  const rawTeam = Array.isArray(formData.teamMembers) ? formData.teamMembers : [{ name: user.name || 'Founder' }];
  const team = rawTeam.map((m: any) => ({
    name: String(m.name || '').trim(),
  }));

  // 7. Documents (File name & type only; NO file contents, NO PAN/Aadhaar numbers or images)
  const canonicalDocs = rawDocs.map((d: any) => {
    let cleanFileName = `${d.type}.pdf`;
    if (d.path) {
      if (d.path.startsWith('data:')) {
        const nameMatch = d.path.match(/name=([^;]+);/);
        if (nameMatch && nameMatch[1]) {
          cleanFileName = decodeURIComponent(nameMatch[1]);
        }
      } else {
        const slashIdx = Math.max(d.path.lastIndexOf('/'), d.path.lastIndexOf('\\'));
        if (slashIdx >= 0) {
          cleanFileName = d.path.substring(slashIdx + 1);
        }
      }
    }
    return {
      type: String(d.type),
      typeName: DOC_TYPE_LABELS[d.type] || d.type,
      fileName: cleanFileName,
      memberLabel: d.memberLabel || null,
    };
  });

  // 8. Declaration
  const decl = formData.declaration || {};
  const declaration = decl.accepted
    ? {
        declaredByName: String(decl.declaredByName || user.name || ''),
        declaredAt: String(decl.declaredAt || app.submittedAt || ''),
        declaredAtIST: decl.declaredAt
          ? formatISTDateTime(decl.declaredAt)
          : app.submittedAt
          ? formatISTDateTime(app.submittedAt)
          : 'N/A',
      }
    : null;

  const submittedAtIso = app.submittedAt ? new Date(app.submittedAt).toISOString() : null;

  return {
    applicationId: app.id,
    version: app.version || 1,
    submittedAt: submittedAtIso,
    submittedAtIST: submittedAtIso ? formatISTDateTime(submittedAtIso) : 'Draft',
    status: app.status || 'SUBMITTED',
    grantType,
    grantTierName,
    requestedTotal: grandTotal,

    startup: {
      teamName: String(startup.teamName || 'N/A'),
      enrollmentNo: String(startup.enrollmentNo || 'N/A'),
      program: String(startup.program || 'N/A'),
      department: String(startup.department || '—'),
      phone: String(startup.phone || 'N/A'),
      applicantName: String(user.name || 'N/A'),
      applicantEmail: String(user.email || 'N/A'),
    },

    agreement,
    concept,
    experiment,

    budget: {
      items: canonicalBudgetItems,
      nonContingencyTotal: nonContingency,
      contingencyTotal: contingency,
      contingencyPercentage,
      grandTotal,
    },

    selfAssessment,
    team,
    documents: canonicalDocs,
    declaration,
  };
}

export function canonicalizeApplicationData(data: CanonicalApplicationData): {
  canonicalJson: string;
  fullHash: string;
  shortHash: string;
} {
  // Deterministic JSON stringify (sorted keys)
  const canonicalJson = JSON.stringify(data, Object.keys(data).sort());
  const fullHash = crypto.createHash('sha256').update(canonicalJson).digest('hex');
  const shortHash = fullHash.substring(0, 12);

  return {
    canonicalJson,
    fullHash,
    shortHash,
  };
}
