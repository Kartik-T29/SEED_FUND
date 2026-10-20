// ALL data access goes through this file. Pages and actions never query
// Application/Assessment/Document directly, so visibility rules live in one place.
import { prisma } from "./prisma";
import type { Role, AppStatus, Prisma, GrantType, DocType, MilestoneState } from "@prisma/client";
import { AGREEMENT_VERSION, getAgreementTextHash } from "./agreement";
import { GRANT_RANGES, BUDGET_HEADERS } from "./seedfund-constants";
import { TIERS } from "./tiers";
import {
  SECTION1_MODE,
  TRL_LABELS_FORM_A,
  MRL_LABELS_FORM_A,
  IRL_LABELS_FORM_A,
  GRANT_EVALUATION_OPTIONS,
  computeLevelMajority,
  computeGrantTypeMajority,
  computeHeaderAverages,
} from "./consolidated-constants";
import { computeDataHash, getOrGeneratePdf } from "./pdf/pdf-cache";
import { generateApplicationPdfBuffer } from "./pdf/application-pdf";
import { generateSummaryReportPdfBuffer } from "./pdf/summary-pdf";
import { generateFormBPdfBuffer } from "./pdf/form-b-pdf";
import { createBundleZipBuffer } from "./pdf/zip-bundle";
import path from "path";
import { mkdir, writeFile, unlink } from "fs/promises";
import { randomUUID } from "crypto";

export type Session = { userId: string; role: Role };
export class Forbidden extends Error {}

export function requireRole(s: Session | null, ...roles: Role[]): Session {
  if (!s) throw new Forbidden("UNAUTHENTICATED");
  if (!roles.includes(s.role)) throw new Forbidden("FORBIDDEN");
  return s;
}

export const homeFor = (r: Role) =>
  r === "STARTUP" ? "/dashboard" : r === "SEC_MEMBER" ? "/sec" : "/admin";

// Startup: only its own (any status). SEC: reviewable. Admin: all applications.
const REVIEWABLE: AppStatus[] = ["SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED", "REPRESENT"];

export function applicationScope(s: Session): Prisma.ApplicationWhereInput {
  if (s.role === "STARTUP") return { startup: { userId: s.userId } };
  if (s.role === "ADMIN") return {}; // Admin sees all applications
  return { status: { in: REVIEWABLE } };
}

export async function getApplication(s: Session, id: string) {
  const app = await prisma.application.findFirst({
    where: { id, ...applicationScope(s) },
    include: {
      budgetItems: true,
      documents: true,
      startup: { include: { user: true } },
      milestone: { include: { items: { include: { remarks: true } } } },
    },
  });
  if (!app) throw new Forbidden("NOT_FOUND"); // 404 not 403: don't reveal that it exists
  return app;
}

export const listApplications = (s: Session) =>
  prisma.application.findMany({
    where: applicationScope(s),
    orderBy: { submittedAt: "desc" },
    include: {
      startup: { select: { teamName: true } },
      _count: { select: { assessments: { where: { status: "SUBMITTED" } } } },
    },
  });

export async function listApplicationsByTier(s: Session, tier?: string) {
  requireRole(s, "SEC_MEMBER", "ADMIN");

  const baseWhere: Prisma.ApplicationWhereInput =
    s.role === "ADMIN"
      ? {}
      : { status: { in: REVIEWABLE } };

  const tierWhere: Prisma.ApplicationWhereInput =
    tier && tier !== "ALL"
      ? { ...baseWhere, grantType: tier as GrantType }
      : baseWhere;

  return prisma.application.findMany({
    where: tierWhere,
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    include: {
      startup: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      _count: {
        select: {
          assessments: {
            where: { status: "SUBMITTED", outdated: false, member: { active: true, approvalStatus: "APPROVED" } },
          },
        },
      },
      assessments: {
        where:
          s.role === "SEC_MEMBER"
            ? { memberId: s.userId, outdated: false }
            : { outdated: false },
        include: {
          member: { select: { id: true, name: true, designation: true, department: true } },
        },
      },
      milestone: {
        select: {
          id: true,
          status: true,
          ownerId: true,
          owner: { select: { id: true, name: true } },
        },
      },
      evaluation: true,
    },
  });
}

export async function tierCounts(s: Session) {
  requireRole(s, "SEC_MEMBER", "ADMIN");

  // SEC and Admin see only non-draft, non-superseded applications for tier counting
  const applications = await prisma.application.findMany({
    where: { status: { in: REVIEWABLE } },
    include: {
      assessments: {
        where: { outdated: false, member: { active: true } },
        select: { memberId: true, status: true },
      },
      milestone: {
        select: { status: true },
      },
      evaluation: {
        select: { approvedTotal: true },
      },
    },
  });

  const activeSecCount = await prisma.user.count({ where: { role: "SEC_MEMBER", active: true, approvalStatus: "APPROVED" } });

  const counts: Record<string, {
    key: string;
    count: number;
    totalRequested: number;
    totalApproved: number;
    pendingMyReview: number;
    readyForFormB: number;
    waitingOnMembers: number;
  }> = {
    ALL: { key: "ALL", count: 0, totalRequested: 0, totalApproved: 0, pendingMyReview: 0, readyForFormB: 0, waitingOnMembers: 0 },
    IDEATION: { key: "IDEATION", count: 0, totalRequested: 0, totalApproved: 0, pendingMyReview: 0, readyForFormB: 0, waitingOnMembers: 0 },
    VALIDATION: { key: "VALIDATION", count: 0, totalRequested: 0, totalApproved: 0, pendingMyReview: 0, readyForFormB: 0, waitingOnMembers: 0 },
    PROOF: { key: "PROOF", count: 0, totalRequested: 0, totalApproved: 0, pendingMyReview: 0, readyForFormB: 0, waitingOnMembers: 0 },
    SCALING: { key: "SCALING", count: 0, totalRequested: 0, totalApproved: 0, pendingMyReview: 0, readyForFormB: 0, waitingOnMembers: 0 },
    EMERGENCY: { key: "EMERGENCY", count: 0, totalRequested: 0, totalApproved: 0, pendingMyReview: 0, readyForFormB: 0, waitingOnMembers: 0 },
  };

  for (const app of applications) {
    const tier = app.grantType || "IDEATION";
    const req = Number(app.requestedTotal) || 0;
    const apprv = app.evaluation ? Number(app.evaluation.approvedTotal) || 0 : 0;

    const myAssessment = app.assessments.find((a) => a.memberId === s.userId);
    const isPendingMe = s.role === "SEC_MEMBER" && (!myAssessment || myAssessment.status !== "SUBMITTED");

    const submittedAssessments = app.assessments.filter((a) => a.status === "SUBMITTED").length;
    const isReadyForFormB =
      submittedAssessments >= activeSecCount &&
      activeSecCount > 0 &&
      app.milestone?.status === "SUBMITTED" &&
      !app.evaluation;
    const isWaiting = submittedAssessments < activeSecCount && !app.evaluation;

    counts.ALL.count += 1;
    counts.ALL.totalRequested += req;
    counts.ALL.totalApproved += apprv;
    if (isPendingMe) counts.ALL.pendingMyReview += 1;
    if (isReadyForFormB) counts.ALL.readyForFormB += 1;
    if (isWaiting) counts.ALL.waitingOnMembers += 1;

    if (counts[tier]) {
      counts[tier].count += 1;
      counts[tier].totalRequested += req;
      counts[tier].totalApproved += apprv;
      if (isPendingMe) counts[tier].pendingMyReview += 1;
      if (isReadyForFormB) counts[tier].readyForFormB += 1;
      if (isWaiting) counts[tier].waitingOnMembers += 1;
    }
  }

  let maxPendingTier = "ALL";
  let maxPending = -1;
  for (const t of ["IDEATION", "VALIDATION", "PROOF", "SCALING", "EMERGENCY"]) {
    if (counts[t].pendingMyReview > maxPending) {
      maxPending = counts[t].pendingMyReview;
      maxPendingTier = t;
    }
  }

  return { counts, defaultTier: maxPending > 0 ? maxPendingTier : "ALL" };
}

// ---------- STARTUP RULES ----------
export async function isStatusUnlocked(userId: string) {
  const a = await prisma.application.findFirst({
    where: { startup: { userId }, status: { not: "DRAFT" } },
    select: { id: true },
  });
  return !!a; // enforce in the /status route, not just in the UI
}

export async function getStartupApplication(s: Session, applicationId?: string) {
  requireRole(s, "STARTUP");
  const startup = await prisma.startup.findUnique({
    where: { userId: s.userId },
    include: { user: true },
  });
  if (!startup) throw new Forbidden("NO_STARTUP");

  if (applicationId) {
    const app = await prisma.application.findFirst({
      where: { id: applicationId, startupId: startup.id },
      include: {
        budgetItems: true,
        documents: true,
        startup: { include: { user: true } },
      },
    });
    return app;
  }

  // If no specific applicationId requested, check for an open draft first
  const draft = await prisma.application.findFirst({
    where: { startupId: startup.id, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
    include: {
      budgetItems: true,
      documents: true,
      startup: { include: { user: true } },
    },
  });
  if (draft) return draft;

  const app = await prisma.application.findFirst({
    where: { startupId: startup.id, status: { not: "SUPERSEDED" } },
    orderBy: { createdAt: "desc" },
    include: {
      budgetItems: true,
      documents: true,
      startup: { include: { user: true } },
    },
  });
  return app;
}

export async function getOrCreateDraft(s: Session, forceNew: boolean = false) {
  requireRole(s, "STARTUP");
  const startup = await prisma.startup.findUnique({
    where: { userId: s.userId },
    include: { user: true },
  });
  if (!startup) throw new Forbidden("NO_STARTUP");

  if (!forceNew) {
    const existingDraft = await prisma.application.findFirst({
      where: { startupId: startup.id, status: "DRAFT" },
      orderBy: { createdAt: "desc" },
      include: {
        budgetItems: true,
        documents: true,
        startup: { include: { user: true } },
      },
    });
    if (existingDraft) return existingDraft;
  }

  // Startups can make another application before previous one is rejected or accepted by the panel
  return prisma.application.create({
    data: { startupId: startup.id, status: "DRAFT" },
    include: {
      budgetItems: true,
      documents: true,
      startup: { include: { user: true } },
    },
  });
}

export async function createDraft(s: Session) {
  return getOrCreateDraft(s, true);
}

export async function acceptAgreement(s: Session, applicationId: string, typedName: string) {
  requireRole(s, "STARTUP");
  const app = await prisma.application.findFirst({
    where: { id: applicationId, status: "DRAFT", startup: { userId: s.userId } },
    include: { startup: { include: { user: true } } },
  });
  if (!app) throw new Forbidden("NOT_FOUND");

  const registeredName = app.startup.user.name.trim();
  if (typedName.trim().toLowerCase() !== registeredName.toLowerCase()) {
    throw new Error("NAME_MISMATCH");
  }

  const textHash = getAgreementTextHash();
  const agreementRecord = {
    version: AGREEMENT_VERSION,
    textHash,
    acceptedByName: registeredName,
    acceptedByUserId: s.userId,
    acceptedAt: new Date().toISOString(),
  };

  const currentFormData = (app.formData as any) || {};
  return prisma.application.update({
    where: { id: applicationId },
    data: {
      formData: {
        ...currentFormData,
        agreement: agreementRecord,
      },
    },
    include: {
      budgetItems: true,
      documents: true,
      startup: { include: { user: true } },
    },
  });
}

export async function saveDraft(
  s: Session,
  applicationId: string,
  payload: {
    formData?: any;
    grantType?: GrantType | "";
    requestedTotal?: number;
    budgetItems?: any[];
  }
) {
  requireRole(s, "STARTUP");
  const app = await prisma.application.findFirst({
    where: { id: applicationId, status: "DRAFT", startup: { userId: s.userId } },
  });
  if (!app) throw new Forbidden("LOCKED_OR_NOT_YOURS");

  return prisma.$transaction(async (tx) => {
    let updateData: Prisma.ApplicationUpdateInput = {};
    if (payload.formData !== undefined) {
      updateData.formData = payload.formData;
    }
    if (payload.grantType !== undefined) {
      updateData.grantType = payload.grantType === "" ? null : payload.grantType;
    }
    if (payload.requestedTotal !== undefined) {
      updateData.requestedTotal = payload.requestedTotal;
    }

    const updated = await tx.application.update({
      where: { id: applicationId },
      data: updateData,
    });

    if (payload.budgetItems !== undefined) {
      await tx.budgetItem.deleteMany({ where: { applicationId } });
      if (payload.budgetItems.length > 0) {
        await tx.budgetItem.createMany({
          data: payload.budgetItems.map((b: any) => ({
            applicationId,
            header: b.header,
            name: b.name,
            vendor: b.vendor || null,
            unitCost: Number(b.unitCost) || 0,
            qty: Number(b.qty) || 1,
            total: Number(b.total) || 0,
            justification: b.justification || null,
          })),
        });
      }
    }

    return updated;
  });
}

export async function saveBudget(
  s: Session,
  applicationId: string,
  items: any[],
  options?: { allowPartial?: boolean }
) {
  requireRole(s, "STARTUP");
  const app = await prisma.application.findFirst({
    where: { id: applicationId, status: "DRAFT", startup: { userId: s.userId } },
  });
  if (!app) throw new Forbidden("LOCKED_OR_NOT_YOURS");

  let requestedTotal = 0;
  let nonContingencyTotal = 0;
  let contingencyTotal = 0;

  const computedItems = items.map((item) => {
    const isContingency = item.header === "contingency";
    const unitCost = Number(item.unitCost) || 0;
    const qty = isContingency ? 1 : Math.max(1, parseInt(item.qty) || 1);
    const total = isContingency ? unitCost : Math.round(unitCost * qty * 100) / 100;

    if (isContingency) {
      contingencyTotal += total;
    } else {
      nonContingencyTotal += total;
    }
    requestedTotal += total;

    return {
      applicationId,
      header: item.header,
      name: item.name || "",
      vendor: item.vendor || null,
      unitCost,
      qty,
      total,
      justification: item.justification || null,
    };
  });

  // Contingency validation: warn over 10%, block over 20%
  if (contingencyTotal > 0) {
    if (nonContingencyTotal === 0 || contingencyTotal > nonContingencyTotal * 0.20) {
      throw new Error("CONTINGENCY_EXCEEDS_20_PERCENT");
    }
  }

  // Range validation on server
  if (!options?.allowPartial && app.grantType && app.grantType !== "EMERGENCY") {
    const range = GRANT_RANGES[app.grantType];
    if (range && (requestedTotal < range[0] || requestedTotal > range[1])) {
      throw new Error("GRANT_TOTAL_OUT_OF_RANGE");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.budgetItem.deleteMany({ where: { applicationId } });
    if (computedItems.length > 0) {
      await tx.budgetItem.createMany({ data: computedItems });
    }
    await tx.application.update({
      where: { id: applicationId },
      data: { requestedTotal },
    });
  });

  return { requestedTotal, items: computedItems };
}

export async function addDocument(
  s: Session,
  applicationId: string,
  file: { name: string; type: string; size: number; buffer: Buffer },
  docType: DocType,
  memberLabel?: string
) {
  requireRole(s, "STARTUP");
  const app = await prisma.application.findFirst({
    where: { id: applicationId, status: "DRAFT", startup: { userId: s.userId } },
  });
  if (!app) throw new Forbidden("NOT_FOUND");

  // Validate size: max 5 MB
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE || file.buffer.length > MAX_SIZE) {
    throw new Error("FILE_TOO_LARGE");
  }

  // Validate MIME and extension
  const allowedMimes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
  if (!allowedMimes.includes(file.type.toLowerCase())) {
    throw new Error("INVALID_MIME_TYPE");
  }

  const ext = path.extname(file.name).toLowerCase();
  const allowedExts = [".pdf", ".jpeg", ".jpg", ".png"];
  if (!allowedExts.includes(ext)) {
    throw new Error("INVALID_FILE_EXTENSION");
  }

  // Storage outside web root
  const uploadDir = path.resolve(process.cwd(), "uploads", applicationId, docType);
  await mkdir(uploadDir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueName = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;
  const filePath = path.join(uploadDir, uniqueName);

  await writeFile(filePath, file.buffer);

  return prisma.document.create({
    data: {
      applicationId,
      type: docType,
      memberLabel: memberLabel || null,
      path: filePath,
    },
  });
}

export async function removeDocument(s: Session, documentId: string) {
  requireRole(s, "STARTUP");
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { application: { include: { startup: true } } },
  });
  if (!doc) throw new Forbidden("NOT_FOUND");
  if (doc.application.status !== "DRAFT" || doc.application.startup.userId !== s.userId) {
    throw new Forbidden("NOT_ALLOWED");
  }

  try {
    await unlink(doc.path);
  } catch {
    // Ignore if already removed from disk
  }

  return prisma.document.delete({ where: { id: documentId } });
}

export async function submitApplication(s: Session, applicationId: string) {
  requireRole(s, "STARTUP");
  const app = await prisma.application.findFirst({
    where: { id: applicationId, status: "DRAFT", startup: { userId: s.userId } },
    include: {
      startup: { include: { grants: true, user: true } },
      budgetItems: true,
      documents: true,
    },
  });
  if (!app) throw new Forbidden("LOCKED_OR_NOT_YOURS");

  // 1. Grants limit
  const used = app.startup.grants.filter((g) => !g.waived).length;
  if (used >= 3) throw new Error("GRANT_LIMIT_REACHED");

  const formData = (app.formData as any) || {};

  // 2. Agreement verification
  const agreement = formData.agreement;
  if (!agreement) throw new Error("AGREEMENT_REQUIRED");
  if (agreement.version !== AGREEMENT_VERSION) throw new Error("STALE_AGREEMENT_VERSION");
  if (agreement.textHash !== getAgreementTextHash()) throw new Error("INVALID_AGREEMENT_HASH");
  const registeredName = app.startup.user.name.trim().toLowerCase();
  if (!agreement.acceptedByName || agreement.acceptedByName.trim().toLowerCase() !== registeredName) {
    throw new Error("AGREEMENT_NAME_MISMATCH");
  }

  // 3. Basic Information verification
  if (!app.grantType) throw new Error("GRANT_TYPE_REQUIRED");
  if (!formData.problemStatement || formData.problemStatement.trim().length < 10) {
    throw new Error("PROBLEM_STATEMENT_REQUIRED");
  }
  if (!formData.proposedSolution || formData.proposedSolution.trim().length < 10) {
    throw new Error("PROPOSED_SOLUTION_REQUIRED");
  }
  if (!formData.effortAndTraction || formData.effortAndTraction.trim().length < 10) {
    throw new Error("EFFORT_TRACTION_REQUIRED");
  }

  // 4. Experiment Definition verification (10 fields)
  const exp = formData.experiment;
  if (!exp) throw new Error("EXPERIMENT_DEFINITION_REQUIRED");
  const expFields = [
    "objective", "problemStatement", "expectedOutcome", "methodology",
    "experimentalSetup", "dataToBeCollected", "validationCriteria",
    "risksAndAssumptions", "timeline", "deliverables",
  ];
  for (const f of expFields) {
    if (!exp[f] || exp[f].trim().length < 5) {
      throw new Error(`EXPERIMENT_${f.toUpperCase()}_REQUIRED`);
    }
  }

  // 5. Budget details & recomputation
  if (!app.budgetItems || app.budgetItems.length === 0) {
    throw new Error("BUDGET_ITEMS_REQUIRED");
  }

  let computedTotal = 0;
  let nonContingency = 0;
  let contingency = 0;

  for (const item of app.budgetItems) {
    const isCont = item.header?.toLowerCase() === "contingency";
    const uCost = Number(item.unitCost) || 0;
    const q = isCont ? 1 : item.qty;
    const rowTotal = isCont ? uCost : Math.round(uCost * q * 100) / 100;

    if (isCont) {
      contingency += rowTotal;
    } else {
      nonContingency += rowTotal;
    }
    computedTotal += rowTotal;

    // Equipment quotation check
    if (item.header?.toLowerCase() === "equipment") {
      const hasQuotation = app.documents.some((d) => d.type === "QUOTATION");
      if (!hasQuotation) throw new Error("EQUIPMENT_QUOTATION_REQUIRED");
    }

    // Step 5: Justification check
    if (!item.justification || item.justification.trim().length === 0) {
      throw new Error(`JUSTIFICATION_REQUIRED_FOR_${item.name || "ITEM"}`);
    }
  }

  if (contingency > 0) {
    if (nonContingency === 0 || contingency > nonContingency * 0.20) {
      throw new Error("CONTINGENCY_EXCEEDS_20_PERCENT");
    }
  }

  if (app.grantType !== "EMERGENCY") {
    const range = GRANT_RANGES[app.grantType];
    if (range && (computedTotal < range[0] || computedTotal > range[1])) {
      throw new Error("GRANT_TOTAL_OUT_OF_RANGE");
    }
  }

  // 6. Self-Assessment verification
  const sa = formData.selfAssessment;
  if (!sa || !sa.trl || !sa.mrl || !sa.irl || !sa.track || !sa.milestones?.length) {
    throw new Error("SELF_ASSESSMENT_REQUIRED");
  }

  // 7. Documents verification
  const hasDeck = app.documents.some((d) => d.type === "DECK");
  if (!hasDeck) throw new Error("PITCH_DECK_REQUIRED");

  let teamMembers = formData.teamMembers || [];
  if (teamMembers.length === 0 && app.startup?.user?.name) {
    teamMembers = [{ name: app.startup.user.name }];
    formData.teamMembers = teamMembers;
  }
  if (teamMembers.length === 0) throw new Error("TEAM_MEMBERS_REQUIRED");
  for (const m of teamMembers) {
    const mName = m.name.trim();
    const hasPan = app.documents.some((d) => d.type === "PAN" && d.memberLabel === mName);
    const hasAadhaar = app.documents.some((d) => d.type === "AADHAAR" && d.memberLabel === mName);
    const hasPhoto = app.documents.some((d) => d.type === "PHOTO" && d.memberLabel === mName);
    if (!hasPan || !hasAadhaar || !hasPhoto) {
      throw new Error(`DOCUMENTS_MISSING_FOR_MEMBER_${mName}`);
    }
  }

  if (formData.hasReceivedGrantBefore) {
    const hasUtil = app.documents.some((d) => d.type === "UTILIZATION_REPORT");
    if (!hasUtil) throw new Error("UTILIZATION_REPORT_REQUIRED");
  }

  // 8. Declaration verification
  const decl = formData.declaration;
  if (!decl || !decl.accepted) throw new Error("DECLARATION_REQUIRED");
  if (!decl.declaredByName || decl.declaredByName.trim().toLowerCase() !== registeredName) {
    throw new Error("DECLARATION_NAME_MISMATCH");
  }
  formData.declaration.declaredAt = new Date().toISOString();

  // Commit submission atomically
  return prisma.$transaction(async (tx) => {
    const fresh = await tx.application.findUnique({
      where: { id: app.id },
      select: { status: true },
    });
    if (!fresh || fresh.status !== "DRAFT") {
      throw new Forbidden("LOCKED_OR_NOT_YOURS");
    }
    return tx.application.update({
      where: { id: app.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        requestedTotal: computedTotal,
        formData,
      },
    });
  });
}

// Re-presentation: old version -> SUPERSEDED, copy into a fresh DRAFT (version + 1)
export async function createRevision(s: Session, applicationId: string) {
  requireRole(s, "STARTUP");
  const old = await prisma.application.findFirst({
    where: { id: applicationId, status: "REPRESENT", startup: { userId: s.userId } },
    include: { budgetItems: true, documents: true },
  });
  if (!old) throw new Forbidden("NOT_ALLOWED");

  const oldFormData = (old.formData as any) || {};
  let carriedFormData = { ...oldFormData };

  // Only carry agreement over if the version is unchanged
  if (oldFormData.agreement?.version !== AGREEMENT_VERSION) {
    delete carriedFormData.agreement;
  }

  return prisma.$transaction(async (tx) => {
    await tx.application.update({ where: { id: old.id }, data: { status: "SUPERSEDED" } });
    return tx.application.create({
      data: {
        startupId: old.startupId,
        version: old.version + 1,
        supersedesId: old.id,
        grantType: old.grantType,
        requestedTotal: old.requestedTotal,
        formData: carriedFormData,
        budgetItems: { create: old.budgetItems.map(({ id, applicationId, ...b }) => b) },
        documents: { create: old.documents.map(({ id, applicationId, createdAt, ...d }) => d) },
      },
    });
  });
}

// Startup sees progress COUNT only, never reviewers' content.
export async function startupStatusView(s: Session, applicationId: string) {
  requireRole(s, "STARTUP");
  const app = await prisma.application.findFirst({
    where: { id: applicationId, startup: { userId: s.userId }, status: { not: "DRAFT" } },
    include: {
      _count: { select: { assessments: { where: { status: "SUBMITTED" } } } },
      evaluation: { select: { decision: true, approvedTotal: true, amounts: true, timeline: true, decidedAt: true } },
    },
  });
  if (!app) throw new Forbidden("NOT_FOUND");
  return { status: app.status, submittedAt: app.submittedAt, assessedCount: app._count.assessments, decision: app.evaluation };
}

// ---------- SEC MEMBER RULES (Form A: private per member) ----------
export async function getMyAssessment(s: Session, applicationId: string) {
  requireRole(s, "SEC_MEMBER");
  await getApplication(s, applicationId);
  return prisma.assessment.findUnique({
    where: { applicationId_memberId: { applicationId, memberId: s.userId } },
    include: { member: { select: { id: true, name: true, designation: true, department: true } } },
  });
}

export async function saveAssessment(
  s: Session,
  applicationId: string,
  payload: {
    assessmentDate?: string | Date | null;
    preChecks?: any;
    statusForm?: any;
    experimentForm?: any;
    recommendation?: string | null;
    suggestedGrant?: string | null;
    suggestedAmounts?: any;
  },
  submit = false
) {
  requireRole(s, "SEC_MEMBER");
  const app = await getApplication(s, applicationId);
  if (!["SUBMITTED", "IN_REVIEW"].includes(app.status)) throw new Forbidden("REVIEW_CLOSED");

  const mine = await prisma.assessment.findUnique({
    where: { applicationId_memberId: { applicationId, memberId: s.userId } },
  });
  if (mine?.status === "SUBMITTED" && !mine.outdated) throw new Forbidden("ALREADY_SUBMITTED");

  if (submit) {
    // 1. Pre-checks (SOP)
    const pre = payload.preChecks || {};
    if (!pre.agreementChecked || !pre.priorFundingChecked || !pre.goAheadGiven) {
      throw new Error("PRE_CHECKS_INCOMPLETE");
    }

    // 2. Status Assessment (TRL, MRL, IRL)
    const sf = payload.statusForm || {};
    if (!sf.trl || !sf.mrl || !sf.irl) {
      throw new Error("STATUS_ASSESSMENT_INCOMPLETE");
    }

    // 4. Experiment Assessment: all 12 questions answered
    const ef = payload.experimentForm || {};
    const answers = ef.answers || {};
    for (let i = 1; i <= 12; i++) {
      if (typeof answers[i] !== "boolean") {
        throw new Error(`EXPERIMENT_QUESTION_${i}_UNANSWERED`);
      }
    }

    // 5. Recommendation note required on submit
    if (!payload.recommendation || payload.recommendation.trim().length === 0) {
      throw new Error("RECOMMENDATION_NOTE_REQUIRED");
    }

    // 6. Grant type chosen
    if (!payload.suggestedGrant) {
      throw new Error("SUGGESTED_GRANT_REQUIRED");
    }

    // 7. Suggested amounts & Range validation
    const amounts = payload.suggestedAmounts || {};
    let total = 0;
    for (const val of Object.values(amounts)) {
      total += Number(val) || 0;
    }

    const tierInfo = TIERS.find((t) => t.key === payload.suggestedGrant);
    if (tierInfo && tierInfo.range && payload.suggestedGrant !== "EMERGENCY" && payload.suggestedGrant !== "REJECTED") {
      const [min, max] = tierInfo.range;
      if (total < min || total > max) {
        throw new Error(`SUGGESTED_TOTAL_OUT_OF_RANGE_${min}_TO_${max}`);
      }
    }
  }

  const assessmentDate = payload.assessmentDate ? new Date(payload.assessmentDate) : new Date();

  return prisma.$transaction(async (tx) => {
    const assessment = await tx.assessment.upsert({
      where: { applicationId_memberId: { applicationId, memberId: s.userId } },
      create: {
        applicationId,
        memberId: s.userId,
        assessmentDate,
        preChecks: payload.preChecks ?? {},
        statusForm: payload.statusForm ?? {},
        experimentForm: payload.experimentForm ?? {},
        recommendation: payload.recommendation ?? null,
        suggestedGrant: payload.suggestedGrant ?? null,
        suggestedAmounts: payload.suggestedAmounts ?? {},
        status: submit ? "SUBMITTED" : "DRAFT",
        submittedAt: submit ? new Date() : null,
        outdated: false,
      },
      update: {
        assessmentDate,
        preChecks: payload.preChecks ?? undefined,
        statusForm: payload.statusForm ?? undefined,
        experimentForm: payload.experimentForm ?? undefined,
        recommendation: payload.recommendation ?? undefined,
        suggestedGrant: payload.suggestedGrant ?? undefined,
        suggestedAmounts: payload.suggestedAmounts ?? undefined,
        status: submit ? "SUBMITTED" : "DRAFT",
        submittedAt: submit ? new Date() : null,
        outdated: false,
      },
    });

    await tx.application.update({
      where: { id: applicationId },
      data: { status: "IN_REVIEW" },
    });

    return assessment;
  });
}

// ---------- SHARED MILESTONE FORM (Form 2: one per application) ----------
export async function claimMilestone(s: Session, applicationId: string, track: string, names?: string[]) {
  requireRole(s, "SEC_MEMBER");
  await getApplication(s, applicationId);

  const finalNames = names && names.length > 0 ? names : [
    "Customer interviews and problem-solution fit",
    "Benchtop prototype and initial feasibility",
    "Field testing and validation metrics",
    "Final prototype demonstration and pilot report",
  ];

  try {
    return await prisma.milestoneAssessment.create({
      data: {
        applicationId,
        ownerId: s.userId,
        track,
        items: { create: finalNames.map((name) => ({ name })) },
      },
      include: {
        items: {
          orderBy: { id: "asc" },
          include: { remarks: { include: { member: { select: { id: true, name: true } } } } },
        },
        owner: { select: { id: true, name: true } },
      },
    });
  } catch (e: any) {
    if (e.code === "P2002") throw new Forbidden("ALREADY_CLAIMED");
    throw e;
  }
}

export async function getMilestoneAssessment(s: Session, applicationId: string) {
  requireRole(s, "SEC_MEMBER", "ADMIN");
  return prisma.milestoneAssessment.findUnique({
    where: { applicationId },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: {
          remarks: {
            orderBy: { updatedAt: "asc" },
            include: { member: { select: { id: true, name: true, designation: true } } },
          },
        },
      },
      owner: { select: { id: true, name: true, designation: true } },
      editLog: { orderBy: { at: "desc" } },
    },
  });
}

export async function setMilestoneState(
  s: Session,
  itemId: string,
  state: "COMPLETED" | "PENDING" | "IN_PROGRESS",
  ownerRemark?: string,
  expectedUpdatedAt?: string | Date
) {
  requireRole(s, "SEC_MEMBER");
  const item = await prisma.milestoneItem.findUnique({ where: { id: itemId }, include: { milestone: true } });
  if (!item || item.milestone.ownerId !== s.userId) throw new Forbidden("OWNER_ONLY");
  if (item.milestone.status === "SUBMITTED") throw new Forbidden("LOCKED");

  if (expectedUpdatedAt) {
    const expectedTime = new Date(expectedUpdatedAt).getTime();
    const actualTime = new Date(item.updatedAt).getTime();
    if (Math.abs(actualTime - expectedTime) > 2000) {
      throw new Error("CONCURRENT_EDIT_CONFLICT: This milestone item was modified in another session. Please refresh the page.");
    }
  }

  const [updatedItem] = await prisma.$transaction([
    prisma.milestoneItem.update({
      where: { id: itemId },
      data: { state, ownerRemark },
      include: {
        remarks: {
          include: { member: { select: { id: true, name: true, designation: true } } },
        },
      },
    }),
    prisma.milestoneEditLog.create({
      data: {
        milestoneId: item.milestoneId,
        memberId: s.userId,
        field: `${item.name}.state`,
        oldValue: item.state,
        newValue: state,
      },
    }),
    prisma.milestoneAssessment.update({
      where: { id: item.milestoneId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return updatedItem;
}

export async function addMilestoneRemark(s: Session, itemId: string, remark: string) {
  requireRole(s, "SEC_MEMBER");
  const item = await prisma.milestoneItem.findUnique({
    where: { id: itemId },
    include: { milestone: { include: { application: { include: { evaluation: true } } } } },
  });
  if (!item) throw new Forbidden("NOT_FOUND");
  if (item.milestone.application.evaluation) throw new Forbidden("LOCKED_BY_FORM_B");

  const saved = await prisma.milestoneRemark.upsert({
    where: { itemId_memberId: { itemId, memberId: s.userId } },
    create: { itemId, memberId: s.userId, remark },
    update: { remark },
    include: { member: { select: { id: true, name: true, designation: true } } },
  });

  return saved;
}

export async function submitMilestone(s: Session, applicationId: string) {
  requireRole(s, "SEC_MEMBER");
  const ms = await prisma.milestoneAssessment.findUnique({ where: { applicationId } });
  if (!ms || ms.ownerId !== s.userId) throw new Forbidden("NOT_YOURS");

  return prisma.milestoneAssessment.update({
    where: { applicationId },
    data: { status: "SUBMITTED" },
  });
}

// ---------- ADMIN RULES, CONSOLIDATED REPORT & FORM B ----------
export async function adminComparison(s: Session, applicationId: string) {
  requireRole(s, "ADMIN");
  return prisma.assessment.findMany({
    where: { applicationId, outdated: false },
    include: {
      member: {
        select: { id: true, name: true, designation: true, department: true, active: true },
      },
    },
    orderBy: { member: { name: "asc" } },
  });
}

export async function formBReadiness(sOrAppId: any, maybeAppId?: string) {
  let applicationId: string;
  if (typeof sOrAppId === "string") {
    applicationId = sOrAppId;
  } else if (sOrAppId && typeof sOrAppId === "object" && "role" in sOrAppId) {
    requireRole(sOrAppId as Session, "ADMIN", "SEC_MEMBER");
    applicationId = maybeAppId!;
  } else {
    applicationId = maybeAppId || sOrAppId;
  }

  const [activeMembers, submitted, ms] = await Promise.all([
    prisma.user.findMany({
      where: { role: "SEC_MEMBER", active: true, approvalStatus: "APPROVED" },
      select: { id: true, name: true, designation: true },
    }),
    prisma.assessment.findMany({
      where: {
        applicationId,
        status: "SUBMITTED",
        outdated: false,
        member: { active: true, approvalStatus: "APPROVED" },
      },
      select: { memberId: true },
    }),
    prisma.milestoneAssessment.findUnique({
      where: { applicationId },
      select: { status: true, ownerId: true },
    }),
  ]);

  const submittedMemberIds = new Set(submitted.map((s) => s.memberId));
  const pendingMembers = activeMembers.filter((m) => !submittedMemberIds.has(m.id));
  const milestoneSubmitted = ms?.status === "SUBMITTED";
  const ready =
    activeMembers.length > 0 &&
    pendingMembers.length === 0 &&
    milestoneSubmitted;

  return {
    ready,
    members: activeMembers.length,
    submitted: submitted.length,
    membersCount: activeMembers.length,
    submittedCount: submitted.length,
    pendingMembers,
    milestoneSubmitted,
  };
}

export async function getConsolidatedReport(s: Session, applicationId: string) {
  requireRole(s, "ADMIN", "SEC_MEMBER");

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      startup: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
      budgetItems: true,
      documents: true,
    },
  });

  if (!app) throw new Forbidden("NOT_FOUND");

  if (s.role === "SEC_MEMBER" && !REVIEWABLE.includes(app.status)) {
    throw new Forbidden("NOT_FOUND");
  }

  // SEC members can open the consolidated report read-only only after they have submitted their own assessment (REVEAL_AFTER_OWN_SUBMIT)
  if (s.role === "SEC_MEMBER") {
    const own = await prisma.assessment.findUnique({
      where: {
        applicationId_memberId: {
          applicationId,
          memberId: s.userId,
        },
      },
    });
    if (!own || own.status !== "SUBMITTED" || own.outdated) {
      throw new Forbidden("REVEAL_AFTER_OWN_SUBMIT");
    }
  }

  // Submitted assessments only (non-outdated, member active)
  const submittedAssessments = await prisma.assessment.findMany({
    where: {
      applicationId,
      status: "SUBMITTED",
      outdated: false,
      member: { active: true },
    },
    include: {
      member: {
        select: { id: true, name: true, designation: true, department: true },
      },
    },
    orderBy: { member: { name: "asc" } },
  });

  const milestone = await prisma.milestoneAssessment.findUnique({
    where: { applicationId },
    include: {
      owner: { select: { id: true, name: true, designation: true } },
      items: {
        include: {
          remarks: {
            include: { member: { select: { id: true, name: true } } },
          },
        },
      },
      editLog: {
        orderBy: { at: "desc" },
      },
    },
  });

  const isComplete = submittedAssessments.length >= 3;
  const incompleteBanner = !isComplete
    ? `INCOMPLETE: ${submittedAssessments.length} of 3 submitted`
    : null;

  // Section 1: Current Status Assessment (TRL / MRL / IRL)
  // Config constant SECTION1_MODE: "ALL_MEMBERS_ALL_SCALES" or "ONE_SCALE_PER_MEMBER"
  const trlVotes: (number | null)[] = [];
  const mrlVotes: (number | null)[] = [];
  const irlVotes: (number | null)[] = [];

  const trlRows: boolean[][] = Array.from({ length: 9 }, () => [false, false, false]);
  const mrlRows: boolean[][] = Array.from({ length: 9 }, () => [false, false, false]);
  const irlRows: boolean[][] = Array.from({ length: 9 }, () => [false, false, false]);

  submittedAssessments.forEach((ass, mIdx) => {
    if (mIdx > 2) return;
    const sf = (ass.statusForm as any) || {};

    let canTrl = true;
    let canMrl = true;
    let canIrl = true;

    if (SECTION1_MODE === "ONE_SCALE_PER_MEMBER") {
      canTrl = (mIdx === 0);
      canMrl = (mIdx === 1);
      canIrl = (mIdx === 2);
    }

    if (canTrl && sf.trl >= 1 && sf.trl <= 9) {
      trlRows[sf.trl - 1][mIdx] = true;
      trlVotes.push(sf.trl);
    } else if (canTrl) {
      trlVotes.push(null);
    }

    if (canMrl && sf.mrl >= 1 && sf.mrl <= 9) {
      mrlRows[sf.mrl - 1][mIdx] = true;
      mrlVotes.push(sf.mrl);
    } else if (canMrl) {
      mrlVotes.push(null);
    }

    if (canIrl && sf.irl >= 1 && sf.irl <= 9) {
      irlRows[sf.irl - 1][mIdx] = true;
      irlVotes.push(sf.irl);
    } else if (canIrl) {
      irlVotes.push(null);
    }
  });

  const formData = (app.formData as any) || {};
  const selfTrl = formData.readinessLevel?.trl ?? "-";
  const selfMrl = formData.readinessLevel?.mrl ?? "-";
  const selfIrl = formData.readinessLevel?.irl ?? "-";

  const committeeViewTrl = computeLevelMajority(trlVotes, "TRL");
  const committeeViewMrl = computeLevelMajority(mrlVotes, "MRL");
  const committeeViewIrl = computeLevelMajority(irlVotes, "IRL");

  // Section 5: Grant Evaluation
  const suggestedGrants = submittedAssessments.map((a) => a.suggestedGrant);
  const secMajorityKey = computeGrantTypeMajority(suggestedGrants);
  const secMajorityOption = GRANT_EVALUATION_OPTIONS.find((o) => o.key === secMajorityKey);
  const majorityLabel = secMajorityOption ? secMajorityOption.label : "No majority";

  // Section 6: Grant suggested under headers
  const requestedByHeader: Record<string, number> = {};
  for (const item of app.budgetItems) {
    requestedByHeader[item.header] = (requestedByHeader[item.header] || 0) + Number(item.total);
  }

  const memberAmounts: Record<string, number>[] = submittedAssessments.map((a) => (a.suggestedAmounts as any) || {});
  const { averages, totalAverage } = computeHeaderAverages(memberAmounts, suggestedGrants);

  const memberTotals: number[] = [];
  const memberOutOfRange: boolean[] = [];

  submittedAssessments.forEach((a, idx) => {
    const amounts = memberAmounts[idx] || {};
    let total = 0;
    for (const val of Object.values(amounts)) {
      total += Number(val) || 0;
    }
    memberTotals.push(total);

    let outOfRange = false;
    const tier = TIERS.find((t) => t.key === a.suggestedGrant);
    if (tier && tier.range && a.suggestedGrant !== "EMERGENCY" && a.suggestedGrant !== "REJECTED") {
      const [min, max] = tier.range;
      if (total < min || total > max) {
        outOfRange = true;
      }
    }
    memberOutOfRange.push(outOfRange);
  });

  return {
    application: app,
    submittedAssessments,
    milestone,
    isComplete,
    incompleteBanner,
    mode: SECTION1_MODE,
    section1: {
      trl: trlRows,
      mrl: mrlRows,
      irl: irlRows,
      selfTrl,
      selfMrl,
      selfIrl,
      committeeViewTrl,
      committeeViewMrl,
      committeeViewIrl,
    },
    section5: {
      suggestedGrants,
      secMajorityKey,
      majorityLabel,
    },
    section6: {
      requested: requestedByHeader,
      requestedTotal: Number(app.requestedTotal),
      memberAmounts,
      memberTotals,
      memberOutOfRange,
      hasOutOfRange: memberOutOfRange.some(Boolean),
      averages,
      totalAverage,
    },
  };
}

export async function getFormBPrefill(s: Session, applicationId: string) {
  requireRole(s, "ADMIN");

  const report = await getConsolidatedReport(s, applicationId);
  const evaluation = await prisma.grantEvaluation.findUnique({
    where: { applicationId },
  });

  const defaultDecision = report.section5.secMajorityKey || "";
  const defaultAmounts = report.section6.averages;
  const defaultTotal = report.section6.totalAverage;

  const concatenatedNotes = report.submittedAssessments
    .map((a) => `${a.member.name}: ${a.recommendation || ""}`.trim())
    .filter((n) => !n.endsWith(":"))
    .join("\n\n");

  const prefill = {
    decision: defaultDecision,
    approvedAmounts: defaultAmounts,
    approvedTotal: defaultTotal,
    note: concatenatedNotes,
    timeline: {
      grantApprovalDate: "",
      fundReleaseDate: "",
      midReviewDate: "",
      grantUtilizationDeadline: "",
      experimentCompletionDate: "",
      finalSubmissionDate: "",
      closureDate: "",
    },
    secDecisionNote: "",
    termsAcknowledged: true,
  };

  return {
    report,
    evaluation,
    prefill,
    secMajorityKey: report.section5.secMajorityKey,
    secMajorityLabel: report.section5.majorityLabel,
  };
}

export async function saveFormBDraft(
  s: Session,
  applicationId: string,
  f: {
    assessmentDate?: string | Date;
    decision?: string;
    approvedTotal?: number;
    amounts?: Record<string, number>;
    approvedAmounts?: Record<string, number>;
    timeline?: Record<string, any>;
    note?: string;
    recommendationNote?: string;
    secDecisionNote?: string;
    termsAcknowledged?: boolean;
    forced?: boolean;
    force?: boolean;
    forceReason?: string;
    reason?: string;
  },
  adminReason: string = "Save Form B Draft"
) {
  requireRole(s, "ADMIN");

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
  });
  if (!app) throw new Forbidden("NOT_FOUND");

  const readiness = await formBReadiness(applicationId);
  const isForced = !readiness.ready && (!!f.forced || !!f.force);

  if (!readiness.ready && !isForced) {
    throw new Forbidden("FORM_B_LOCKED_WAITING_FOR_COMMITTEE");
  }

  const effectiveForceReason = f.forceReason || f.reason;
  if (isForced && (!effectiveForceReason || effectiveForceReason.trim().length === 0)) {
    throw new Error("FORCE_REASON_REQUIRED");
  }

  const amountsData = f.amounts || f.approvedAmounts || {};
  const noteData = f.note || f.recommendationNote || null;
  const forceReasonData = isForced ? effectiveForceReason : null;
  const assessmentDate = f.assessmentDate ? new Date(f.assessmentDate) : new Date();

  return prisma.$transaction(async (tx) => {
    const evaluation = await tx.grantEvaluation.upsert({
      where: { applicationId },
      create: {
        applicationId,
        adminId: s.userId,
        status: "DRAFT",
        assessmentDate,
        decision: f.decision || "",
        approvedTotal: f.approvedTotal || 0,
        amounts: amountsData,
        timeline: f.timeline || {},
        note: noteData,
        secDecisionNote: f.secDecisionNote || null,
        termsAcknowledged: f.termsAcknowledged ?? true,
        forced: isForced,
        forceReason: forceReasonData,
      },
      update: {
        adminId: s.userId,
        status: "DRAFT",
        assessmentDate,
        decision: f.decision || "",
        approvedTotal: f.approvedTotal || 0,
        amounts: amountsData,
        timeline: f.timeline || {},
        note: noteData,
        secDecisionNote: f.secDecisionNote || null,
        termsAcknowledged: f.termsAcknowledged ?? true,
        forced: isForced,
        forceReason: forceReasonData,
        decidedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: s.userId,
        action: "FORM_B_SAVE_DRAFT",
        entity: "Application",
        entityId: applicationId,
        reason: adminReason,
        details: {
          decision: f.decision,
          approvedTotal: f.approvedTotal,
          forced: isForced,
          forceReason: f.forceReason,
        },
      },
    });

    return evaluation;
  });
}

export async function submitFormB(
  s: Session,
  applicationId: string,
  f: {
    assessmentDate?: string | Date;
    decision: string;
    approvedTotal: number;
    amounts?: Record<string, number>;
    approvedAmounts?: Record<string, number>;
    timeline: Record<string, any>;
    note?: string;
    recommendationNote?: string;
    secDecisionNote?: string;
    termsAcknowledged?: boolean;
    forced?: boolean;
    force?: boolean;
    forceReason?: string;
    reason?: string;
  },
  adminReason: string = "Form B final grant decision"
) {
  requireRole(s, "ADMIN");
  if (!adminReason || adminReason.trim().length === 0) {
    throw new Error("ADMIN_REASON_REQUIRED");
  }

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { startup: true },
  });
  if (!app) throw new Forbidden("NOT_FOUND");

  const readiness = await formBReadiness(applicationId);
  const isForced = !readiness.ready && (!!f.forced || !!f.force);

  if (!readiness.ready && !isForced) {
    throw new Forbidden("FORM_B_LOCKED_WAITING_FOR_COMMITTEE");
  }

  const effectiveForceReason = f.forceReason || f.reason;
  if (isForced && (!effectiveForceReason || effectiveForceReason.trim().length === 0)) {
    throw new Error("FORCE_REASON_REQUIRED");
  }

  // Validate terms acknowledged
  if (f.termsAcknowledged === false) {
    throw new Error("TERMS_ACKNOWLEDGEMENT_REQUIRED");
  }

  // Validate SEC majority mismatch requires secDecisionNote
  const secAssessments = await prisma.assessment.findMany({
    where: { applicationId, status: "SUBMITTED", outdated: false, member: { active: true } },
    select: { suggestedGrant: true },
  });
  const secMajority = computeGrantTypeMajority(secAssessments.map((a) => a.suggestedGrant));
  if (secMajority && f.decision !== secMajority && (!f.secDecisionNote || f.secDecisionNote.trim().length === 0)) {
    throw new Error("SEC_DECISION_NOTE_REQUIRED");
  }

  // Validate timeline dates ordering when specified
  const t = f.timeline || {};
  if (
    t.grantApprovalDate &&
    t.fundReleaseDate &&
    t.midReviewDate &&
    t.grantUtilizationDeadline &&
    t.experimentCompletionDate &&
    t.finalSubmissionDate &&
    t.closureDate
  ) {
    const dApproval = new Date(t.grantApprovalDate).getTime();
    const dRelease = new Date(t.fundReleaseDate).getTime();
    const dMid = new Date(t.midReviewDate).getTime();
    const dUtil = new Date(t.grantUtilizationDeadline).getTime();
    const dComp = new Date(t.experimentCompletionDate).getTime();
    const dFinal = new Date(t.finalSubmissionDate).getTime();
    const dClosure = new Date(t.closureDate).getTime();

    if (
      dApproval > dRelease ||
      dRelease > dMid ||
      dMid > dUtil ||
      dUtil > dComp ||
      dComp > dFinal ||
      dFinal > dClosure
    ) {
      throw new Error("TIMELINE_DATES_OUT_OF_ORDER");
    }
  }

  const isApproved = !["REJECTED", "REPRESENT"].includes(f.decision);
  if (isApproved && f.decision !== "EMERGENCY") {
    const tier = TIERS.find((ti) => ti.key === f.decision);
    if (tier && tier.range) {
      const [min, max] = tier.range;
      if (f.approvedTotal < min || f.approvedTotal > max) {
        throw new Error(`APPROVED_TOTAL_OUT_OF_RANGE_${min}_TO_${max}`);
      }
    }
  }

  const appStatus: AppStatus =
    f.decision === "REJECTED"
      ? "REJECTED"
      : f.decision === "REPRESENT"
      ? "REPRESENT"
      : "APPROVED";

  const assessmentDate = f.assessmentDate ? new Date(f.assessmentDate) : new Date();

  return prisma.$transaction(async (tx) => {
    const amountsData = f.amounts || f.approvedAmounts || {};
    const noteData = f.note || f.recommendationNote || null;
    const forceReasonData = isForced ? effectiveForceReason : null;

    const evaluation = await tx.grantEvaluation.upsert({
      where: { applicationId },
      create: {
        applicationId,
        adminId: s.userId,
        status: "SUBMITTED",
        assessmentDate,
        decision: f.decision,
        approvedTotal: f.approvedTotal,
        amounts: amountsData,
        timeline: f.timeline,
        note: noteData,
        secDecisionNote: f.secDecisionNote || null,
        termsAcknowledged: f.termsAcknowledged ?? true,
        forced: isForced,
        forceReason: forceReasonData,
      },
      update: {
        adminId: s.userId,
        status: "SUBMITTED",
        assessmentDate,
        decision: f.decision,
        approvedTotal: f.approvedTotal,
        amounts: amountsData,
        timeline: f.timeline,
        note: noteData,
        secDecisionNote: f.secDecisionNote || null,
        termsAcknowledged: f.termsAcknowledged ?? true,
        forced: isForced,
        forceReason: forceReasonData,
        decidedAt: new Date(),
      },
    });

    await tx.application.update({
      where: { id: applicationId },
      data: { status: appStatus },
    });

    if (appStatus === "APPROVED") {
      await tx.grantHistory.create({
        data: {
          startupId: app.startupId,
          grantType: (f.decision as GrantType) || app.grantType || "IDEATION",
          amount: f.approvedTotal,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: s.userId,
        action: `FORM_B_${f.decision}`,
        entity: "Application",
        entityId: applicationId,
        reason: adminReason,
        details: {
          decision: f.decision,
          approvedTotal: f.approvedTotal,
          forced: isForced,
          forceReason: f.forceReason,
        },
      },
    });

    return evaluation;
  });
}

// ---------- PDF & ZIP GENERATION (Audited & Cached) ----------
export async function generateApplicationPdf(s: Session, applicationId: string): Promise<Buffer> {
  const app = await getApplication(s, applicationId);
  const hash = computeDataHash({
    appId: app.id,
    updatedAt: app.updatedAt,
    formData: app.formData,
    budgetItems: app.budgetItems,
    documents: app.documents,
  });

  const cacheKey = `application_pdf_${applicationId}`;
  const buffer = await getOrGeneratePdf(cacheKey, hash, async () => {
    return generateApplicationPdfBuffer(app);
  });

  if (s.role === "ADMIN") {
    await prisma.auditLog.create({
      data: {
        actorId: s.userId,
        action: "DOWNLOAD_APPLICATION_PDF",
        entity: "Application",
        entityId: applicationId,
        reason: "Download Application PDF",
      },
    });
  }

  return buffer;
}

export async function generateSummaryReportPdf(s: Session, applicationId: string): Promise<Buffer> {
  const report = await getConsolidatedReport(s, applicationId);
  const hash = computeDataHash({
    appId: applicationId,
    mode: SECTION1_MODE,
    reportSection1: report.section1,
    reportSection5: report.section5,
    reportSection6: report.section6,
    assessments: report.submittedAssessments.map((a) => ({ id: a.id, updatedAt: a.submittedAt })),
  });

  const cacheKey = `summary_pdf_${applicationId}_${SECTION1_MODE}`;
  const buffer = await getOrGeneratePdf(cacheKey, hash, async () => {
    return generateSummaryReportPdfBuffer(report);
  });

  if (s.role === "ADMIN") {
    await prisma.auditLog.create({
      data: {
        actorId: s.userId,
        action: "DOWNLOAD_SUMMARY_PDF",
        entity: "Application",
        entityId: applicationId,
        reason: "Download Consolidated Summary PDF",
      },
    });
  }

  return buffer;
}

export async function generateFormBPdf(s: Session, applicationId: string): Promise<Buffer> {
  requireRole(s, "ADMIN");
  const report = await getConsolidatedReport(s, applicationId);
  const evaluation = await prisma.grantEvaluation.findUnique({
    where: { applicationId },
  });

  const hash = computeDataHash({
    appId: applicationId,
    evaluation,
    reportSection6: report.section6,
  });

  const cacheKey = `form_b_pdf_${applicationId}`;
  const buffer = await getOrGeneratePdf(cacheKey, hash, async () => {
    return generateFormBPdfBuffer(evaluation, report);
  });

  await prisma.auditLog.create({
    data: {
      actorId: s.userId,
      action: "DOWNLOAD_FORM_B_PDF",
      entity: "Application",
      entityId: applicationId,
      reason: "Download Form B PDF",
    },
  });

  return buffer;
}

export async function generateBundleZip(
  s: Session,
  applicationId: string,
  includeDocuments: boolean = false
): Promise<Buffer> {
  requireRole(s, "ADMIN"); // Admin only; 404 for anyone else

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      startup: true,
      documents: true,
    },
  });
  if (!app) throw new Forbidden("NOT_FOUND");

  const [appPdf, summaryPdf, formBPdf] = await Promise.all([
    generateApplicationPdf(s, applicationId),
    generateSummaryReportPdf(s, applicationId),
    generateFormBPdf(s, applicationId),
  ]);

  const docFiles = app.documents.map((d) => ({
    filePath: d.path,
    name: `${d.type}_${d.memberLabel ? `${d.memberLabel}_` : ""}${path.basename(d.path)}`,
  }));

  const zipBuffer = await createBundleZipBuffer(
    app.startup.teamName,
    applicationId,
    appPdf,
    summaryPdf,
    formBPdf,
    docFiles,
    includeDocuments
  );

  await prisma.auditLog.create({
    data: {
      actorId: s.userId,
      action: "DOWNLOAD_BUNDLE_ZIP",
      entity: "Application",
      entityId: applicationId,
      reason: "Download Application Bundle ZIP",
      details: {
        includedDocuments: includeDocuments,
        documentsCount: includeDocuments ? app.documents.length : 0,
      },
    },
  });

  return zipBuffer;
}

// ---------- ADMIN POWERS (Audited with typed reason) ----------
export async function adminReopenAssessment(
  s: Session,
  memberId: string,
  applicationId: string,
  reason: string
) {
  requireRole(s, "ADMIN");
  if (!reason?.trim()) throw new Error("ADMIN_REASON_REQUIRED");

  const assessment = await prisma.assessment.findUnique({
    where: { applicationId_memberId: { applicationId, memberId } },
  });
  if (!assessment) throw new Forbidden("NOT_FOUND");

  await prisma.$transaction([
    prisma.assessment.update({
      where: { applicationId_memberId: { applicationId, memberId } },
      data: { status: "DRAFT", submittedAt: null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: s.userId,
        action: "REOPEN_ASSESSMENT",
        entity: "Assessment",
        entityId: assessment.id,
        reason,
        details: { memberId, applicationId },
      },
    }),
  ]);
}

export async function adminReopenApplication(s: Session, applicationId: string, reason: string) {
  requireRole(s, "ADMIN");
  if (!reason?.trim()) throw new Error("ADMIN_REASON_REQUIRED");

  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) throw new Forbidden("NOT_FOUND");

  await prisma.$transaction([
    prisma.application.update({
      where: { id: applicationId },
      data: { status: "DRAFT" },
    }),
    prisma.assessment.updateMany({
      where: { applicationId },
      data: { outdated: true },
    }),
    prisma.auditLog.create({
      data: {
        actorId: s.userId,
        action: "REOPEN_APPLICATION",
        entity: "Application",
        entityId: applicationId,
        reason,
        details: { previousStatus: app.status },
      },
    }),
  ]);
}

export async function adminReassignMilestoneOwner(
  s: Session,
  applicationId: string,
  newOwnerId: string,
  reason: string
) {
  requireRole(s, "ADMIN");
  if (!reason?.trim()) throw new Error("ADMIN_REASON_REQUIRED");

  const newOwner = await prisma.user.findFirst({
    where: { id: newOwnerId, role: "SEC_MEMBER", active: true },
  });
  if (!newOwner) throw new Error("INVALID_NEW_OWNER");

  const ms = await prisma.milestoneAssessment.findUnique({ where: { applicationId } });
  if (!ms) throw new Forbidden("NOT_FOUND");

  const oldOwnerId = ms.ownerId;
  await prisma.$transaction([
    prisma.milestoneAssessment.update({
      where: { applicationId },
      data: { ownerId: newOwnerId },
    }),
    prisma.auditLog.create({
      data: {
        actorId: s.userId,
        action: "REASSIGN_MILESTONE_OWNER",
        entity: "MilestoneAssessment",
        entityId: ms.id,
        reason,
        details: { oldOwnerId, newOwnerId },
      },
    }),
  ]);
}

export async function adminChangeTier(
  s: Session,
  applicationId: string,
  newGrantType: GrantType,
  reason: string
) {
  requireRole(s, "ADMIN");
  if (!reason?.trim()) throw new Error("ADMIN_REASON_REQUIRED");

  const app = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!app) throw new Forbidden("NOT_FOUND");

  const reqTotal = Number(app.requestedTotal);
  const tier = TIERS.find((t) => t.key === newGrantType);
  if (tier && tier.range && newGrantType !== "EMERGENCY") {
    const [min, max] = tier.range;
    if (reqTotal < min || reqTotal > max) {
      throw new Error(`REQUESTED_TOTAL_OUT_OF_NEW_RANGE_${min}_TO_${max}`);
    }
  }

  await prisma.$transaction([
    prisma.application.update({
      where: { id: applicationId },
      data: { grantType: newGrantType },
    }),
    prisma.auditLog.create({
      data: {
        actorId: s.userId,
        action: "CHANGE_TIER",
        entity: "Application",
        entityId: applicationId,
        reason,
        details: { oldGrantType: app.grantType, newGrantType },
      },
    }),
  ]);
}

export async function adminWaiveGrantLimit(s: Session, startupId: string, reason: string) {
  requireRole(s, "ADMIN");
  if (!reason?.trim()) throw new Error("ADMIN_REASON_REQUIRED");

  await prisma.$transaction([
    prisma.grantHistory.updateMany({
      where: { startupId },
      data: { waived: true },
    }),
    prisma.auditLog.create({
      data: {
        actorId: s.userId,
        action: "WAIVE_GRANT_LIMIT",
        entity: "Startup",
        entityId: startupId,
        reason,
        details: { startupId },
      },
    }),
  ]);
}

export async function adminReopenFormB(s: Session, applicationId: string, reason: string) {
  requireRole(s, "ADMIN");
  if (!reason?.trim()) throw new Error("ADMIN_REASON_REQUIRED");

  const evalRecord = await prisma.grantEvaluation.findUnique({ where: { applicationId } });
  if (!evalRecord) throw new Forbidden("NOT_FOUND");

  await prisma.$transaction([
    prisma.grantEvaluation.delete({ where: { applicationId } }),
    prisma.application.update({
      where: { id: applicationId },
      data: { status: "IN_REVIEW" },
    }),
    prisma.auditLog.create({
      data: {
        actorId: s.userId,
        action: "REOPEN_FORM_B",
        entity: "GrantEvaluation",
        entityId: evalRecord.id,
        reason,
        details: {
          previousDecision: evalRecord.decision,
          approvedTotal: Number(evalRecord.approvedTotal),
          amounts: evalRecord.amounts,
          timeline: evalRecord.timeline,
        },
      },
    }),
  ]);
}

// User Management (Admin only)
export async function adminListUsers(s: Session) {
  requireRole(s, "ADMIN");
  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    include: {
      startup: true,
      _count: { select: { assessments: true } },
    },
  });
}

export async function adminCreateSecUser(
  s: Session,
  data: { email: string; name: string; designation?: string; department?: string; password: string },
  reason: string
) {
  requireRole(s, "ADMIN");
  if (!reason?.trim()) throw new Error("ADMIN_REASON_REQUIRED");

  if (!data.password || data.password.length < 8) {
    throw new Error("PASSWORD_TOO_SHORT");
  }

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      name: data.name.trim(),
      designation: data.designation?.trim() || null,
      department: data.department?.trim() || null,
      passwordHash,
      role: "SEC_MEMBER",
      approvalStatus: "APPROVED",
      active: true,
      mustChangePassword: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: s.userId,
      action: "CREATE_SEC_USER",
      entity: "User",
      entityId: user.id,
      reason,
      details: { email: user.email, name: user.name, role: user.role },
    },
  });

  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}

export async function adminApproveSecUser(s: Session, userId: string, reason?: string) {
  requireRole(s, "ADMIN");
  const existing = await prisma.user.findUnique({ where: { id: userId, role: "SEC_MEMBER" } });
  if (!existing) throw new Forbidden("NOT_FOUND");

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { approvalStatus: "APPROVED", active: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: s.userId,
      action: "APPROVE_SEC_MEMBER",
      entity: "User",
      entityId: userId,
      reason: reason?.trim() || "Approved by administrator",
      details: { email: existing.email, name: existing.name },
    },
  });

  const { passwordHash: _, ...safeUser } = updated;
  return safeUser;
}

export async function adminRejectSecUser(s: Session, userId: string, reason?: string) {
  requireRole(s, "ADMIN");
  const existing = await prisma.user.findUnique({ where: { id: userId, role: "SEC_MEMBER" } });
  if (!existing) throw new Forbidden("NOT_FOUND");

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { approvalStatus: "REJECTED", active: false },
  });

  await prisma.auditLog.create({
    data: {
      actorId: s.userId,
      action: "REJECT_SEC_MEMBER",
      entity: "User",
      entityId: userId,
      reason: reason?.trim() || "Rejected by administrator",
      details: { email: existing.email, name: existing.name },
    },
  });

  const { passwordHash: _, ...safeUser } = updated;
  return safeUser;
}

export async function adminUpdateUser(
  s: Session,
  userId: string,
  data: { name?: string; designation?: string; department?: string },
  reason: string
) {
  requireRole(s, "ADMIN");
  if (!reason?.trim()) throw new Error("ADMIN_REASON_REQUIRED");

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new Forbidden("NOT_FOUND");

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name !== undefined ? data.name.trim() : undefined,
      designation: data.designation !== undefined ? data.designation?.trim() || null : undefined,
      department: data.department !== undefined ? data.department?.trim() || null : undefined,
    },
  });

  const { passwordHash: _e, ...safeExisting } = existing;
  const { passwordHash: _u, ...safeUpdated } = updated;

  await prisma.auditLog.create({
    data: {
      actorId: s.userId,
      action: "UPDATE_USER",
      entity: "User",
      entityId: userId,
      reason,
      details: { before: safeExisting, after: safeUpdated },
    },
  });

  return safeUpdated;
}

export async function adminToggleUserActive(s: Session, userId: string, active: boolean, reason: string) {
  requireRole(s, "ADMIN");
  if (!reason?.trim()) throw new Error("ADMIN_REASON_REQUIRED");
  if (userId === s.userId && !active) throw new Error("CANNOT_DEACTIVATE_SELF");

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new Forbidden("NOT_FOUND");

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { active },
  });

  await prisma.auditLog.create({
    data: {
      actorId: s.userId,
      action: active ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      entity: "User",
      entityId: userId,
      reason,
      details: { email: existing.email, active },
    },
  });

  const { passwordHash: _, ...safeUpdated } = updated;
  return safeUpdated;
}

export async function adminResetUserPassword(
  s: Session,
  userId: string,
  newPassword: string,
  reason: string
) {
  requireRole(s, "ADMIN");
  if (!reason?.trim()) throw new Error("ADMIN_REASON_REQUIRED");
  if (!newPassword || newPassword.length < 8) throw new Error("PASSWORD_TOO_SHORT");

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new Forbidden("NOT_FOUND");

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: s.userId,
      action: "RESET_USER_PASSWORD",
      entity: "User",
      entityId: userId,
      reason,
      details: { email: existing.email },
    },
  });
}

// Reports & Audit Logs (Admin only)
export async function adminGetReports(s: Session) {
  requireRole(s, "ADMIN");

  const allApps = await prisma.application.findMany({
    include: {
      startup: { include: { user: true } },
      evaluation: true,
      budgetItems: true,
    },
  });

  const grants = await prisma.grantHistory.findMany({
    include: { startup: true },
  });

  const totalGrantsAwarded = grants.length;
  const totalApprovedAmount = grants.reduce((acc, g) => acc + Number(g.amount), 0);

  const perTierBreakdown: Record<string, { count: number; totalAmount: number }> = {};
  for (const t of TIERS) {
    perTierBreakdown[t.key] = { count: 0, totalAmount: 0 };
  }

  for (const g of grants) {
    const key = g.grantType;
    if (perTierBreakdown[key]) {
      perTierBreakdown[key].count += 1;
      perTierBreakdown[key].totalAmount += Number(g.amount);
    }
  }

  return {
    totalGrantsAwarded,
    totalApprovedAmount,
    perTierBreakdown,
    applications: allApps,
    grants,
  };
}

export async function adminGetAuditLogs(
  s: Session,
  filters?: { actorId?: string; entity?: string; action?: string }
) {
  requireRole(s, "ADMIN");
  const where: Prisma.AuditLogWhereInput = {};
  if (filters?.actorId) where.actorId = filters.actorId;
  if (filters?.entity) where.entity = filters.entity;
  if (filters?.action) where.action = { contains: filters.action };

  return prisma.auditLog.findMany({
    where,
    orderBy: { at: "desc" },
    take: 100,
  });
}

// ---------- DOCUMENTS (PAN/Aadhaar/Quotation/etc.) ----------
export async function canReadDocument(s: Session, documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, path: true, applicationId: true, type: true, memberLabel: true },
  });
  if (!doc) throw new Forbidden("NOT_FOUND");
  await getApplication(s, doc.applicationId);
  return doc; // stream via an authenticated route, never expose raw path directly
}
