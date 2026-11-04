import crypto from 'crypto';
import { prisma } from './prisma';
import { requireRole, Session, Forbidden } from './access';
import { formatISTDate, formatISTDateTime } from './dates';
import { getSignatories } from './signatories';
import {
  BUDGET_HEADERS,
  EXPERIMENT_QUESTIONS,
  MILESTONES,
} from './seedfund-constants';

export const SET_A_MILESTONES = MILESTONES.PROTOTYPING;
export const SET_B_MILESTONES = MILESTONES.PROFESSIONAL;

export interface FormAPanelMemberInfo {
  position: 1 | 2 | 3;
  memberId: string | null;
  name: string;
  designation: string;
  department: string;
  status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED';
  isStarted: boolean;
  isSubmitted: boolean;
  isDeactivated: boolean;
  submittedAtIST: string | null;
}

export interface FormACorrectionItem {
  field: string;
  oldValue: string;
  newValue: string;
  changedByName: string;
  changedAtIST: string;
}

export interface FormAQuestionRow {
  num: number;
  id: string;
  category: string;
  text: string;
  votes: [string, string, string]; // M1, M2, M3
}

export interface FormAData {
  applicationId: string;
  isFinal: boolean;
  draftWatermark: string | null;
  unstartedList: string[];
  unsubmittedList: string[];

  startup: {
    teamName: string;
    applicantName: string;
    enrollmentNo: string;
    programAndDept: string;
  };
  assessmentDateIST: string;
  generatedAtIST: string;

  panelMembers: [FormAPanelMemberInfo, FormAPanelMemberInfo, FormAPanelMemberInfo];

  // Section 1: Scales
  statusAssessment: {
    trl: Array<{
      level: number;
      label: string;
      achieved: [boolean, boolean, boolean];
    }>;
    mrl: Array<{
      level: number;
      label: string;
      achieved: [boolean, boolean, boolean];
    }>;
    irl: Array<{
      level: number;
      label: string;
      achieved: [boolean, boolean, boolean];
    }>;
  };

  // Section 2: Milestones
  milestoneAssessment: {
    note: string;
    rows: Array<{
      rowNum: number;
      setAText: string;
      setBText: string;
      memberRemarks: [string, string, string]; // M1, M2, M3
    }>;
    corrections: FormACorrectionItem[];
  };

  // Section 3: 12 Questions
  experimentAssessment: {
    questions: FormAQuestionRow[];
    memberVoteTotals: [
      { yes: number; no: number },
      { yes: number; no: number },
      { yes: number; no: number }
    ];
    decisionGuide: string;
    memberNotes: [
      { memberName: string; notes: string },
      { memberName: string; notes: string },
      { memberName: string; notes: string }
    ];
  };

  // Section 4: Recommendation Notes
  recommendationNotes: [
    { memberName: string; recommendation: string },
    { memberName: string; recommendation: string },
    { memberName: string; recommendation: string }
  ];

  // Section 5: Grant Evaluation
  grantEvaluation: {
    rows: Array<{
      key: string;
      label: string;
      approved: [string, string, string]; // 'approved' or ''
    }>;
  };

  // Section 6: Budget Moderation
  suggestedBudgets: {
    headers: Array<{
      key: string;
      name: string;
      amounts: [string, string, string]; // Formatted ₹
    }>;
    totals: [string, string, string]; // Formatted ₹
  };

  // Final Signatories
  signatories: {
    reviewedBy: Array<{
      key: string;
      name: string;
      designation: string;
    }>;
  };
}

export const TRL_LEVEL_LABELS = [
  'TRL 1: Idea/principle',
  'TRL 2: Concept formulated',
  'TRL 3: Experimental proof',
  'TRL 4: Lab testing',
  'TRL 5: Prototype validated',
  'TRL 6: Prototype demonstrated',
  'TRL 7: System level prototype tested',
  'TRL 8: Final product ready',
  'TRL 9: Market launch & scaling',
];

export const MRL_LEVEL_LABELS = [
  'MRL1 : Basic Manufacturing concept',
  'MRL2 : Manufacturing concept defined',
  'MRL3 : Materials & process identified',
  'MRL4 : Lab-level manufacturing',
  'MRL5 : Prototype manufacturing',
  'MRL6 : Pilot manufacturing',
  'MRL7 : Low-rate production',
  'MRL8 : Stable manufacturing',
  'MRL9 : Mass production',
];

export const IRL_LEVEL_LABELS = [
  'IRL 1: Integration concept identified',
  'IRL 2: Integration assumptions defined',
  'IRL 3: Interface proof of concept',
  'IRL 4: Subsystem integration validated',
  'IRL 5: System integration in relevant environment',
  'IRL 6: Integrated system demonstrated',
  'IRL 7: Integration in operational environment',
  'IRL 8: Integration proven and stable',
  'IRL 9: Fully integrated and sustained',
];

export const GRANT_EVALUATION_TYPES = [
  { key: 'VALIDATION', label: 'validation Grant' },
  { key: 'PROOF', label: 'Proof Grant' },
  { key: 'SCALING', label: 'Scaling Grant' },
  { key: 'NONE', label: 'None/Application Rejected' },
];

export function formatIndianCurrency(amount: number): string {
  if (isNaN(amount) || amount === 0) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

/**
 * Builds canonical Form A data object.
 * Enforces server authorization: admin or the three panel members only.
 */
export async function buildFormAData(applicationId: string, s: Session): Promise<FormAData> {
  // Authorization check
  if (s.role !== 'ADMIN' && s.role !== 'SEC_MEMBER') {
    throw new Forbidden('FORBIDDEN');
  }

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      startup: { include: { user: true } },
      milestone: {
        include: {
          items: { include: { remarks: { include: { member: true } } } },
          editLog: { orderBy: { at: 'asc' } },
        },
      },
    },
  });

  if (!app) throw new Forbidden('NOT_FOUND');

  // Load panel members ordered by fixed position 1, 2, 3
  const panelRecords = await prisma.applicationPanelMember.findMany({
    where: { applicationId },
    orderBy: { position: 'asc' },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          designation: true,
          department: true,
          active: true,
          approvalStatus: true,
        },
      },
    },
  });

  // If SEC member: verify they are one of the assigned panel members
  if (s.role === 'SEC_MEMBER') {
    const isPanelist = panelRecords.some((pm) => pm.memberId === s.userId);
    if (!isPanelist) {
      throw new Forbidden('NOT_A_PANEL_MEMBER');
    }
  }

  // Load assessments for these panel members
  const memberIds = panelRecords.map((pm) => pm.memberId);
  const assessments = await prisma.assessment.findMany({
    where: {
      applicationId,
      memberId: { in: memberIds },
    },
  });

  // Build panel members array for fixed positions 1, 2, 3
  const unstartedList: string[] = [];
  const unsubmittedList: string[] = [];

  const panelMembers: [FormAPanelMemberInfo, FormAPanelMemberInfo, FormAPanelMemberInfo] = [
    { position: 1 } as any,
    { position: 2 } as any,
    { position: 3 } as any,
  ];

  for (let pos = 1; pos <= 3; pos++) {
    const idx = pos - 1;
    const pm = panelRecords.find((p) => p.position === pos);
    if (!pm) {
      unstartedList.push(`SEC Member ${pos}`);
      panelMembers[idx] = {
        position: pos as 1 | 2 | 3,
        memberId: null,
        name: 'Not yet started',
        designation: '—',
        department: '—',
        status: 'NOT_STARTED',
        isStarted: false,
        isSubmitted: false,
        isDeactivated: false,
        submittedAtIST: null,
      };
      continue;
    }

    const assessment = assessments.find((a) => a.memberId === pm.memberId);
    const isSubmitted = assessment?.status === 'SUBMITTED';
    const isDeactivated = !pm.member.active || pm.member.approvalStatus !== 'APPROVED';
    const memberName = isDeactivated
      ? `${pm.member.name} (deactivated)`
      : pm.member.name || `SEC Member ${pos}`;

    if (!isSubmitted) {
      unsubmittedList.push(memberName);
    }

    panelMembers[idx] = {
      position: pos as 1 | 2 | 3,
      memberId: pm.memberId,
      name: memberName,
      designation: pm.member.designation || 'Panel Member',
      department: pm.member.department || 'ITM University',
      status: isSubmitted ? 'SUBMITTED' : 'DRAFT',
      isStarted: true,
      isSubmitted,
      isDeactivated,
      submittedAtIST: assessment?.submittedAt ? formatISTDateTime(assessment.submittedAt) : null,
    };
  }

  const isFinal =
    panelRecords.length === 3 &&
    panelMembers.every((m) => m.isSubmitted);

  const draftWatermark = isFinal ? null : 'DRAFT - NOT FOR SIGNATURE';

  // 1. Status Assessment (TRL, MRL, IRL)
  const buildScaleAchieved = (scaleKey: 'trl' | 'mrl' | 'irl') => {
    return Array.from({ length: 9 }, (_, lvlIdx) => {
      const level = lvlIdx + 1;
      const labels =
        scaleKey === 'trl'
          ? TRL_LEVEL_LABELS
          : scaleKey === 'mrl'
          ? MRL_LEVEL_LABELS
          : IRL_LEVEL_LABELS;

      const achieved: [boolean, boolean, boolean] = [false, false, false];
      for (let i = 0; i < 3; i++) {
        const pm = panelMembers[i];
        if (pm.memberId) {
          const a = assessments.find((ass) => ass.memberId === pm.memberId);
          const sf = (a?.statusForm as any) || {};
          if (Number(sf[scaleKey]) === level) {
            achieved[i] = true;
          }
        }
      }
      return {
        level,
        label: labels[lvlIdx],
        achieved,
      };
    });
  };

  const statusAssessment = {
    trl: buildScaleAchieved('trl'),
    mrl: buildScaleAchieved('mrl'),
    irl: buildScaleAchieved('irl'),
  };

  // 2. Milestone Assessment (Side-by-side Set A & Set B, 10 rows)
  const milestoneRows: Array<{
    rowNum: number;
    setAText: string;
    setBText: string;
    memberRemarks: [string, string, string];
  }> = [];

  const msItems = app.milestone?.items || [];
  const track = app.milestone?.track || 'PROTOTYPING';

  for (let r = 0; r < 10; r++) {
    const rowNum = r + 1;
    const setAText = SET_A_MILESTONES[r] || '';
    const setBText = SET_B_MILESTONES[r] || '';

    const memberRemarks: [string, string, string] = ['', '', ''];

    for (let m = 0; m < 3; m++) {
      const pm = panelMembers[m];
      if (!pm.memberId) {
        memberRemarks[m] = '—';
        continue;
      }

      // Check item corresponding to this row
      // We look up items by matching name with setA or setB
      const itemA = msItems.find((it) => it.name.trim().toLowerCase() === setAText.trim().toLowerCase());
      const itemB = msItems.find((it) => it.name.trim().toLowerCase() === setBText.trim().toLowerCase());

      const notes: string[] = [];

      if (itemA) {
        let remark = itemA.ownerRemark || '';
        if (pm.position !== 1) {
          const peerRemark = itemA.remarks.find((rem: any) => rem.memberId === pm.memberId)?.remark;
          if (peerRemark) remark = peerRemark;
        }
        const stateStr = itemA.state === 'COMPLETED' ? 'Completed' : itemA.state === 'IN_PROGRESS' ? 'In Progress' : 'Pending';
        const labelA = track === 'BOTH' ? 'A: ' : '';
        notes.push(`${labelA}${stateStr}${remark ? ` — ${remark}` : ''}`);
      }

      if (itemB && itemB.name !== itemA?.name) {
        let remark = itemB.ownerRemark || '';
        if (pm.position !== 1) {
          const peerRemark = itemB.remarks.find((rem: any) => rem.memberId === pm.memberId)?.remark;
          if (peerRemark) remark = peerRemark;
        }
        const stateStr = itemB.state === 'COMPLETED' ? 'Completed' : itemB.state === 'IN_PROGRESS' ? 'In Progress' : 'Pending';
        const labelB = track === 'BOTH' ? 'B: ' : '';
        notes.push(`${labelB}${stateStr}${remark ? ` — ${remark}` : ''}`);
      }

      memberRemarks[m] = notes.length > 0 ? notes.join('; ') : '—';
    }

    milestoneRows.push({
      rowNum,
      setAText,
      setBText,
      memberRemarks,
    });
  }

  // Milestone edit logs for signed correction table
  const rawLogs = app.milestone?.editLog || [];
  const logUsers = await prisma.user.findMany({
    where: { id: { in: rawLogs.map((l: any) => l.memberId) } },
    select: { id: true, name: true },
  });

  const corrections: FormACorrectionItem[] = rawLogs.map((log: any) => {
    const user = logUsers.find((u) => u.id === log.memberId);
    return {
      field: log.field,
      oldValue: log.oldValue || 'None',
      newValue: log.newValue || 'None',
      changedByName: user?.name || 'SEC Panelist',
      changedAtIST: formatISTDateTime(log.at),
    };
  });

  // 3. 12 Questions (TRL 2 / TRL 3 Experiment Assessment)
  const memberVoteTotals: [
    { yes: number; no: number },
    { yes: number; no: number },
    { yes: number; no: number }
  ] = [
    { yes: 0, no: 0 },
    { yes: 0, no: 0 },
    { yes: 0, no: 0 },
  ];

  const questions: FormAQuestionRow[] = EXPERIMENT_QUESTIONS.map((q) => {
    const votes: [string, string, string] = ['—', '—', '—'];
    for (let i = 0; i < 3; i++) {
      const pm = panelMembers[i];
      if (pm.memberId) {
        const a = assessments.find((ass) => ass.memberId === pm.memberId);
        const ans = (a?.experimentForm as any)?.questions?.[q.id];
        if (ans === true) {
          votes[i] = 'YES';
          memberVoteTotals[i].yes++;
        } else if (ans === false) {
          votes[i] = 'NO';
          memberVoteTotals[i].no++;
        }
      }
    }
    return {
      num: q.num,
      id: q.id,
      category: q.category,
      text: q.text,
      votes,
    };
  });

  const memberNotes: [
    { memberName: string; notes: string },
    { memberName: string; notes: string },
    { memberName: string; notes: string }
  ] = [
    { memberName: panelMembers[0].name, notes: '—' },
    { memberName: panelMembers[1].name, notes: '—' },
    { memberName: panelMembers[2].name, notes: '—' },
  ];

  for (let i = 0; i < 3; i++) {
    const pm = panelMembers[i];
    if (pm.memberId) {
      const a = assessments.find((ass) => ass.memberId === pm.memberId);
      const notes = (a?.experimentForm as any)?.questionNotes;
      if (notes && String(notes).trim().length > 0) {
        memberNotes[i].notes = String(notes).trim();
      }
    }
  }

  // 4. Recommendation Notes
  const recommendationNotes: [
    { memberName: string; recommendation: string },
    { memberName: string; recommendation: string },
    { memberName: string; recommendation: string }
  ] = [
    { memberName: panelMembers[0].name, recommendation: '—' },
    { memberName: panelMembers[1].name, recommendation: '—' },
    { memberName: panelMembers[2].name, recommendation: '—' },
  ];

  for (let i = 0; i < 3; i++) {
    const pm = panelMembers[i];
    if (pm.memberId) {
      const a = assessments.find((ass) => ass.memberId === pm.memberId);
      const rec = (a?.experimentForm as any)?.recommendationNote;
      if (rec && String(rec).trim().length > 0) {
        recommendationNotes[i].recommendation = String(rec).trim();
      }
    }
  }

  // 5. Grant Evaluation
  const grantEvaluationRows = GRANT_EVALUATION_TYPES.map((gt) => {
    const approved: [string, string, string] = ['', '', ''];
    for (let i = 0; i < 3; i++) {
      const pm = panelMembers[i];
      if (pm.memberId) {
        const a = assessments.find((ass) => ass.memberId === pm.memberId);
        const evalChoice = (a?.experimentForm as any)?.grantEvaluation;
        if (evalChoice && evalChoice.toLowerCase() === gt.key.toLowerCase()) {
          approved[i] = 'approved';
        }
      }
    }
    return {
      key: gt.key,
      label: gt.label,
      approved,
    };
  });

  // 6. Suggested Budgets
  const memberSums = [0, 0, 0];
  const budgetHeaders = BUDGET_HEADERS.map((h) => {
    const amounts: [string, string, string] = ['₹0', '₹0', '₹0'];
    for (let i = 0; i < 3; i++) {
      const pm = panelMembers[i];
      if (pm.memberId) {
        const a = assessments.find((ass) => ass.memberId === pm.memberId);
        const val = Number((a?.experimentForm as any)?.suggestedAmounts?.[h.key]) || 0;
        amounts[i] = formatIndianCurrency(val);
        memberSums[i] += val;
      } else {
        amounts[i] = '—';
      }
    }
    return {
      key: h.key,
      name: h.name,
      amounts,
    };
  });

  const totals: [string, string, string] = [
    panelMembers[0].memberId ? formatIndianCurrency(memberSums[0]) : '—',
    panelMembers[1].memberId ? formatIndianCurrency(memberSums[1]) : '—',
    panelMembers[2].memberId ? formatIndianCurrency(memberSums[2]) : '—',
  ];

  // Official Signatories from Settings
  const allSignatories = await getSignatories();
  const reviewedBy = allSignatories.filter((s) =>
    ['head_incubation', 'director_ideapad'].includes(s.key)
  );

  return {
    applicationId: app.id,
    isFinal,
    draftWatermark,
    unstartedList,
    unsubmittedList,
    startup: {
      teamName: app.startup.teamName,
      applicantName: app.startup.user?.name || 'Not provided',
      enrollmentNo: app.startup.enrollmentNo || 'Not provided',
      programAndDept: `${app.startup.program || 'Program'} ${
        app.startup.department ? `· ${app.startup.department}` : ''
      }`,
    },
    assessmentDateIST: formatISTDate(new Date()),
    generatedAtIST: formatISTDateTime(new Date()),
    panelMembers,
    statusAssessment,
    milestoneAssessment: {
      note: 'This will be done by the SEC member who starts the assessment process; any changes/correction will need signature against the correction on the printed form.',
      rows: milestoneRows,
      corrections,
    },
    experimentAssessment: {
      questions,
      memberVoteTotals,
      decisionGuide:
        '✔ Mostly YES → Recommend funding (TRL-3 likely)   ✖ Multiple NO → Revision required before approval.',
      memberNotes,
    },
    recommendationNotes,
    grantEvaluation: {
      rows: grantEvaluationRows,
    },
    suggestedBudgets: {
      headers: budgetHeaders,
      totals,
    },
    signatories: {
      reviewedBy,
    },
  };
}

/**
 * Deterministic SHA-256 canonicalization for Form A.
 */
export function canonicalizeFormAData(data: FormAData): {
  canonicalJson: string;
  fullHash: string;
  shortHash: string;
} {
  const canonicalJson = JSON.stringify(data, Object.keys(data).sort());
  const fullHash = crypto.createHash('sha256').update(canonicalJson).digest('hex');
  const shortHash = fullHash.substring(0, 12);
  return { canonicalJson, fullHash, shortHash };
}
