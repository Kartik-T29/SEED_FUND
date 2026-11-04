// ALL data access goes through this file. Pages and actions never query
// Application/Assessment/Document directly, so visibility rules live in one place.
import { prisma } from "./prisma";
import type { Role, AppStatus, Prisma, GrantType, DocType } from "@prisma/client";
import { AGREEMENT_VERSION, getAgreementTextHash } from "./agreement";
import { GRANT_RANGES } from "./seedfund-constants";
import { buildApplicationData, canonicalizeApplicationData } from "./application-data";
import { getStorageAdapter } from "./storage";
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

// Startup: only its own (any status). SEC + Admin: every non-draft, non-superseded one.
const REVIEWABLE: AppStatus[] = ["SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED", "REPRESENT"];

export function applicationScope(s: Session): Prisma.ApplicationWhereInput {
  if (s.role === "STARTUP") return { startup: { userId: s.userId } };
  return { status: { in: REVIEWABLE } };
}

export async function getApplication(s: Session, id: string) {
  if (s.role === "SEC_MEMBER") {
    const secUser = await prisma.user.findUnique({
      where: { id: s.userId },
      select: { approvalStatus: true, active: true },
    });
    if (!secUser || secUser.approvalStatus !== "APPROVED" || !secUser.active) {
      throw new Forbidden("NOT_APPROVED_SEC");
    }

    const panelMember = await prisma.applicationPanelMember.findUnique({
      where: { applicationId_memberId: { applicationId: id, memberId: s.userId } },
    });
    if (!panelMember) {
      throw new Forbidden("NOT_A_PANEL_MEMBER");
    }
  }

  const app = await prisma.application.findFirst({
    where: { id, ...applicationScope(s) },
    include: {
      budgetItems: true,
      documents: true,
      startup: { include: { user: true } },
      milestone: { include: { items: { include: { remarks: true } }, owner: { select: { id: true, name: true } } } },
      evaluation: true,
      panelMembers: {
        include: { member: { select: { id: true, name: true, designation: true, department: true } } },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!app) throw new Forbidden("NOT_FOUND"); // 404 not 403: don't reveal that it exists
  return app;
}

export const listApplications = async (s: Session) => {
  if (s.role === "SEC_MEMBER") {
    const secUser = await prisma.user.findUnique({
      where: { id: s.userId },
      select: { approvalStatus: true, active: true },
    });
    if (!secUser || secUser.approvalStatus !== "APPROVED" || !secUser.active) {
      return [];
    }
  }

  return prisma.application.findMany({
    where: applicationScope(s),
    orderBy: { submittedAt: "desc" },
    select: {
      id: true,
      version: true,
      status: true,
      grantType: true,
      requestedTotal: true,
      submittedAt: true,
      createdAt: true,
      startup: { select: { teamName: true } },
      panelMembers: {
        select: { memberId: true, position: true },
        orderBy: { position: "asc" },
      },
      _count: {
        select: {
          panelMembers: true,
          assessments: { where: { status: "SUBMITTED" } },
        },
      },
    },
  });
};

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
      const existingFormData = (app.formData as any) || {};
      const newFormData = { ...payload.formData };
      if (existingFormData.agreement && !newFormData.agreement) {
        newFormData.agreement = existingFormData.agreement;
      }
      updateData.formData = newFormData;
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

  // Validate size: 5–7 MB (max 7 MB) for pitch deck, 200–500 KB (max 500 KB) for other documents (PAN, Aadhaar, Photo, Quotation, Utilization)
  const maxLimit = docType === "DECK" ? 7 * 1024 * 1024 : 500 * 1024;
  if (file.size > maxLimit || file.buffer.length > maxLimit) {
    const limitLabel = docType === "DECK" ? "5–7 MB (max 7 MB)" : "200–500 KB (max 500 KB)";
    throw new Error(`FILE_TOO_LARGE: ${limitLabel} allowed`);
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

  const storage = getStorageAdapter();
  const filePath = await storage.saveFile(file.buffer, file.name, file.type);

  // If a document of the same type (and memberLabel) already exists for this draft, replace it
  const existingDoc = await prisma.document.findFirst({
    where: {
      applicationId,
      type: docType,
      memberLabel: memberLabel || null,
    },
  });

  if (existingDoc) {
    await storage.deleteFile(existingDoc.path);
    return prisma.document.update({
      where: { id: existingDoc.id },
      data: { path: filePath },
    });
  }

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

  await prisma.document.delete({ where: { id: documentId } });

  const storage = getStorageAdapter();
  await storage.deleteFile(doc.path);

  return { success: true };
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
    const isCont = item.header === "contingency";
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
    if (item.header === "equipment") {
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

  const submittedAt = new Date();
  const canonicalData = buildApplicationData({
    ...app,
    status: "SUBMITTED",
    submittedAt,
    requestedTotal: computedTotal,
    formData,
  });
  const { fullHash } = canonicalizeApplicationData(canonicalData);

  // Commit submission, snapshot, and audit in the same transaction
  await prisma.$transaction([
    prisma.application.update({
      where: { id: app.id },
      data: {
        status: "SUBMITTED",
        submittedAt,
        requestedTotal: computedTotal,
        formData,
      },
    }),
    prisma.applicationSnapshot.upsert({
      where: {
        applicationId_version: {
          applicationId: app.id,
          version: app.version || 1,
        },
      },
      create: {
        applicationId: app.id,
        version: app.version || 1,
        data: canonicalData as any,
        dataHash: fullHash,
        reconstructed: false,
      },
      update: {
        data: canonicalData as any,
        dataHash: fullHash,
        reconstructed: false,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: s.userId,
        action: "SUBMIT_APPLICATION",
        entity: "Application",
        entityId: app.id,
      },
    }),
  ]);
}

export async function getStartupSubmissionForDownload(
  s: Session,
  options?: { version?: number; applicationId?: string }
) {
  requireRole(s, "STARTUP", "ADMIN", "SEC_MEMBER");

  let app = null;

  if (s.role === "STARTUP") {
    const startup = await prisma.startup.findUnique({
      where: { userId: s.userId },
    });
    if (!startup) throw new Forbidden("NO_STARTUP");

    // Derive application exclusively from startup ownership
    if (options?.applicationId) {
      app = await prisma.application.findFirst({
        where: { id: options.applicationId, startupId: startup.id },
        include: {
          startup: { include: { user: true } },
          budgetItems: true,
          documents: true,
        },
      });
    }

    if (!app) {
      // Latest submitted / reviewable application for this startup
      app = await prisma.application.findFirst({
        where: { startupId: startup.id, status: { not: "DRAFT" } },
        orderBy: { submittedAt: "desc" },
        include: {
          startup: { include: { user: true } },
          budgetItems: true,
          documents: true,
        },
      });
    }

    if (!app) {
      const draft = await prisma.application.findFirst({
        where: { startupId: startup.id, status: "DRAFT" },
      });
      if (draft) {
        throw new Forbidden("DRAFT_NOT_DOWNLOADABLE");
      }
      throw new Forbidden("NOT_FOUND");
    }
  } else if (s.role === "SEC_MEMBER") {
    // SEC member: must be active & approved, and assigned to this application's panel
    const secUser = await prisma.user.findUnique({
      where: { id: s.userId },
      select: { approvalStatus: true, active: true },
    });
    if (!secUser || secUser.approvalStatus !== "APPROVED" || !secUser.active) {
      throw new Forbidden("NOT_APPROVED_SEC");
    }

    if (!options?.applicationId) throw new Forbidden("APPLICATION_ID_REQUIRED");

    const panelMember = await prisma.applicationPanelMember.findUnique({
      where: { applicationId_memberId: { applicationId: options.applicationId, memberId: s.userId } },
    });
    if (!panelMember) {
      throw new Forbidden("NOT_A_PANEL_MEMBER");
    }

    app = await prisma.application.findFirst({
      where: { id: options.applicationId, status: { not: "DRAFT" } },
      include: {
        startup: { include: { user: true } },
        budgetItems: true,
        documents: true,
      },
    });

    if (!app) {
      const draft = await prisma.application.findFirst({
        where: { id: options.applicationId, status: "DRAFT" },
      });
      if (draft) throw new Forbidden("DRAFT_NOT_DOWNLOADABLE");
      throw new Forbidden("NOT_FOUND");
    }
  } else if (s.role === "ADMIN") {
    if (!options?.applicationId) throw new Forbidden("APPLICATION_ID_REQUIRED");
    app = await prisma.application.findFirst({
      where: { id: options.applicationId, status: { not: "DRAFT" } },
      include: {
        startup: { include: { user: true } },
        budgetItems: true,
        documents: true,
      },
    });

    if (!app) {
      const draft = await prisma.application.findFirst({
        where: { id: options.applicationId, status: "DRAFT" },
      });
      if (draft) throw new Forbidden("DRAFT_NOT_DOWNLOADABLE");
      throw new Forbidden("NOT_FOUND");
    }
  }

  if (!app) {
    throw new Forbidden("NOT_FOUND");
  }

  if (app.status === "DRAFT") {
    throw new Forbidden("DRAFT_NOT_DOWNLOADABLE");
  }

  // Collect all application IDs in the lineage (via supersedesId)
  const lineageAppIds = new Set<string>([app.id]);
  let parentId = app.supersedesId;
  while (parentId) {
    lineageAppIds.add(parentId);
    const parent = await prisma.application.findUnique({
      where: { id: parentId },
      select: { supersedesId: true },
    });
    parentId = parent?.supersedesId || null;
  }
  let child = await prisma.application.findUnique({
    where: { supersedesId: app.id },
    select: { id: true },
  });
  while (child) {
    lineageAppIds.add(child.id);
    child = await prisma.application.findUnique({
      where: { supersedesId: child.id },
      select: { id: true },
    });
  }

  const appIdsArray = Array.from(lineageAppIds);

  // Get all snapshot versions for this application lineage (for the versions list)
  let allSnapshots = await prisma.applicationSnapshot.findMany({
    where: { applicationId: { in: appIdsArray } },
    orderBy: { version: "desc" },
    select: { version: true, dataHash: true, createdAt: true, reconstructed: true, applicationId: true },
  });

  const requestedVersion = options?.version || app.version || 1;

  let snapshot = allSnapshots.find((s) => s.version === requestedVersion);

  // If the snapshot exists in allSnapshots, fetch the full snapshot object (with data)
  let fullSnapshot = snapshot
    ? await prisma.applicationSnapshot.findFirst({
        where: { applicationId: { in: appIdsArray }, version: requestedVersion },
      })
    : null;

  // Backward compatibility: if no snapshot exists yet for this submitted version, reconstruct it
  if (!fullSnapshot) {
    // Find the application row corresponding to this version in the lineage
    const targetApp =
      (await prisma.application.findFirst({
        where: { id: { in: appIdsArray }, version: requestedVersion },
        include: {
          startup: { include: { user: true } },
          budgetItems: true,
          documents: true,
        },
      })) || app;

    if (!targetApp) {
      throw new Forbidden("NOT_FOUND");
    }

    const canonicalData = buildApplicationData(targetApp);
    const { fullHash } = canonicalizeApplicationData(canonicalData);
    fullSnapshot = await prisma.applicationSnapshot.create({
      data: {
        applicationId: targetApp.id,
        version: requestedVersion,
        data: canonicalData as any,
        dataHash: fullHash,
        reconstructed: true,
      },
    });

    allSnapshots = await prisma.applicationSnapshot.findMany({
      where: { applicationId: { in: appIdsArray } },
      orderBy: { version: "desc" },
      select: { version: true, dataHash: true, createdAt: true, reconstructed: true, applicationId: true },
    });
  }

  return {
    application: app,
    snapshot: fullSnapshot,
    availableVersions: allSnapshots.map((s) => ({
      version: s.version,
      dataHash: s.dataHash,
      createdAt: s.createdAt,
      reconstructed: s.reconstructed,
    })),
  };
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

// ---------- SEC MEMBER RULES (Forms 1 and 3: private per member) ----------

/**
 * Enforces the "First three SEC members to start" panel rule.
 * Operates in one database transaction with strict unique constraints on
 * (applicationId, position) and (applicationId, memberId).
 */
export async function startAssessment(s: Session, applicationId: string) {
  requireRole(s, "SEC_MEMBER");

  const secUser = await prisma.user.findUnique({
    where: { id: s.userId },
    select: { id: true, role: true, approvalStatus: true, active: true, name: true, designation: true, department: true },
  });
  if (!secUser || secUser.role !== "SEC_MEMBER" || secUser.approvalStatus !== "APPROVED" || !secUser.active) {
    throw new Forbidden("NOT_APPROVED_SEC");
  }

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, status: true },
  });
  if (!app) throw new Forbidden("NOT_FOUND");
  if (!["SUBMITTED", "IN_REVIEW"].includes(app.status)) {
    throw new Forbidden("REVIEW_CLOSED");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if member is ALREADY on the panel
      const existing = await tx.applicationPanelMember.findUnique({
        where: {
          applicationId_memberId: { applicationId, memberId: s.userId },
        },
      });
      if (existing) {
        return { position: existing.position, alreadyStarted: true };
      }

      // 2. Count existing panel members
      const currentMembers = await tx.applicationPanelMember.findMany({
        where: { applicationId },
        orderBy: { position: "asc" },
      });

      if (currentMembers.length >= 3) {
        throw new Error("The panel for this application is complete");
      }

      const nextPosition = currentMembers.length + 1;

      // 3. Create panel slot assignment
      const panelEntry = await tx.applicationPanelMember.create({
        data: {
          applicationId,
          memberId: s.userId,
          position: nextPosition,
        },
      });

      // 4. Upsert draft assessment record
      await tx.assessment.upsert({
        where: {
          applicationId_memberId: { applicationId, memberId: s.userId },
        },
        create: {
          applicationId,
          memberId: s.userId,
          status: "DRAFT",
        },
        update: {},
      });

      // 5. Progress status to IN_REVIEW if SUBMITTED
      if (app.status === "SUBMITTED") {
        await tx.application.update({
          where: { id: applicationId },
          data: { status: "IN_REVIEW" },
        });
      }

      // 6. Audit log entry
      await tx.auditLog.create({
        data: {
          actorId: s.userId,
          action: "START_ASSESSMENT",
          entity: "Application",
          entityId: applicationId,
          details: JSON.stringify({
            memberId: s.userId,
            position: nextPosition,
            memberName: secUser.name,
          }),
        },
      });

      return { position: panelEntry.position, alreadyStarted: false };
    });

    return result;
  } catch (err: any) {
    if (err.code === "P2002") {
      // Unique constraint violated by concurrent race: panel was filled
      throw new Error("The panel for this application is complete");
    }
    throw err;
  }
}

/**
 * Admin releases a panel slot with a mandatory written reason (audited).
 */
export async function adminReleasePanelSlot(
  s: Session,
  applicationId: string,
  memberId: string,
  reason: string
) {
  requireRole(s, "ADMIN");
  if (!reason || reason.trim().length === 0) {
    throw new Error("REASON_REQUIRED_TO_RELEASE_PANEL_SLOT");
  }

  const panelMember = await prisma.applicationPanelMember.findUnique({
    where: {
      applicationId_memberId: { applicationId, memberId },
    },
    include: { member: { select: { name: true } } },
  });
  if (!panelMember) throw new Forbidden("NOT_FOUND");

  await prisma.$transaction([
    prisma.applicationPanelMember.delete({
      where: { id: panelMember.id },
    }),
    prisma.auditLog.create({
      data: {
        actorId: s.userId,
        action: "RELEASE_PANEL_SLOT",
        entity: "Application",
        entityId: applicationId,
        details: JSON.stringify({
          memberId,
          memberName: panelMember.member.name,
          position: panelMember.position,
          reason: reason.trim(),
        }),
      },
    }),
  ]);

  return { success: true };
}

/**
 * Update SEC member profile (name, designation, department).
 */
export async function updateSecProfile(
  s: Session,
  data: { name: string; designation: string; department?: string }
) {
  requireRole(s, "SEC_MEMBER");
  if (!data.name?.trim()) throw new Error("NAME_REQUIRED");
  if (!data.designation?.trim()) throw new Error("DESIGNATION_REQUIRED");

  return prisma.user.update({
    where: { id: s.userId },
    data: {
      name: data.name.trim(),
      designation: data.designation.trim(),
      department: data.department ? data.department.trim() : null,
    },
  });
}

/**
 * Admin updates SEC member profile.
 */
export async function adminUpdateSecProfile(
  s: Session,
  targetUserId: string,
  data: { name: string; designation: string; department?: string }
) {
  requireRole(s, "ADMIN");
  if (!data.name?.trim()) throw new Error("NAME_REQUIRED");
  if (!data.designation?.trim()) throw new Error("DESIGNATION_REQUIRED");

  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUserId },
      data: {
        name: data.name.trim(),
        designation: data.designation.trim(),
        department: data.department ? data.department.trim() : null,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: s.userId,
        action: "ADMIN_UPDATE_SEC_PROFILE",
        entity: "User",
        entityId: targetUserId,
        details: JSON.stringify(data),
      },
    }),
  ]);
  return updated;
}

export async function getMyAssessment(s: Session, applicationId: string) {
  requireRole(s, "SEC_MEMBER");
  await getApplication(s, applicationId);
  return prisma.assessment.findUnique({ where: { applicationId_memberId: { applicationId, memberId: s.userId } } });
}

export async function saveAssessment(
  s: Session,
  applicationId: string,
  data: { statusForm?: Prisma.InputJsonValue; experimentForm?: Prisma.InputJsonValue },
  submit = false
) {
  requireRole(s, "SEC_MEMBER");
  const app = await getApplication(s, applicationId);
  if (!["SUBMITTED", "IN_REVIEW"].includes(app.status)) throw new Forbidden("REVIEW_CLOSED");
  const mine = await prisma.assessment.findUnique({ where: { applicationId_memberId: { applicationId, memberId: s.userId } } });
  if (mine?.status === "SUBMITTED") throw new Forbidden("ALREADY_SUBMITTED");
  await prisma.$transaction([
    prisma.assessment.upsert({
      where: { applicationId_memberId: { applicationId, memberId: s.userId } },
      create: { applicationId, memberId: s.userId, ...data, status: submit ? "SUBMITTED" : "DRAFT", submittedAt: submit ? new Date() : null },
      update: { ...data, status: submit ? "SUBMITTED" : "DRAFT", submittedAt: submit ? new Date() : null },
    }),
    prisma.application.update({ where: { id: applicationId }, data: { status: "IN_REVIEW" } }),
  ]);
}

// ---------- SHARED MILESTONE FORM (Form 2: one per application) ----------
export async function claimMilestone(s: Session, applicationId: string, track: string, names: string[]) {
  requireRole(s, "SEC_MEMBER");
  await getApplication(s, applicationId);

  // Policy: SEC Member 1 (first to start) fills the shared milestone form
  const panelMember = await prisma.applicationPanelMember.findUnique({
    where: { applicationId_memberId: { applicationId, memberId: s.userId } },
  });
  if (!panelMember || panelMember.position !== 1) {
    throw new Forbidden("MEMBER_1_ONLY_MILESTONE");
  }

  try {
    return await prisma.milestoneAssessment.create({
      data: { applicationId, ownerId: s.userId, track, items: { create: names.map((name) => ({ name })) } },
    }); // @unique(applicationId) means a race gives exactly one owner
  } catch (e: any) {
    if (e.code === "P2002") throw new Forbidden("ALREADY_CLAIMED");
    throw e;
  }
}

export async function setMilestoneState(s: Session, itemId: string, state: "COMPLETED" | "PENDING" | "IN_PROGRESS", ownerRemark?: string) {
  requireRole(s, "SEC_MEMBER");
  const item = await prisma.milestoneItem.findUnique({ where: { id: itemId }, include: { milestone: true } });
  if (!item || item.milestone.ownerId !== s.userId) throw new Forbidden("OWNER_ONLY");
  if (item.milestone.status === "SUBMITTED") throw new Forbidden("LOCKED");
  await prisma.$transaction([
    prisma.milestoneItem.update({ where: { id: itemId }, data: { state, ownerRemark } }),
    prisma.milestoneEditLog.create({ data: { milestoneId: item.milestoneId, memberId: s.userId, field: `${item.name}.state`, oldValue: item.state, newValue: state } }),
  ]);
}

export async function addMilestoneRemark(s: Session, itemId: string, remark: string) {
  requireRole(s, "SEC_MEMBER");
  const item = await prisma.milestoneItem.findUnique({ where: { id: itemId }, include: { milestone: { include: { application: { include: { evaluation: true } } } } } });
  if (!item) throw new Forbidden("NOT_FOUND");
  if (item.milestone.application.evaluation) throw new Forbidden("LOCKED_BY_FORM_B");
  await prisma.milestoneRemark.upsert({
    where: { itemId_memberId: { itemId, memberId: s.userId } },
    create: { itemId, memberId: s.userId, remark }, update: { remark },
  });
}

export async function submitMilestone(s: Session, applicationId: string) {
  requireRole(s, "SEC_MEMBER");
  const ms = await prisma.milestoneAssessment.findUnique({ where: { applicationId } });
  if (!ms || ms.ownerId !== s.userId) throw new Forbidden("NOT_YOURS");
  await prisma.milestoneAssessment.update({
    where: { applicationId },
    data: { status: "SUBMITTED" }
  });
}

// ---------- ADMIN RULES ----------
// Admin sees only SUBMITTED assessments, ordered by fixed panel position 1, 2, 3.
export async function adminComparison(s: Session, applicationId: string) {
  requireRole(s, "ADMIN");
  const [panelMembers, assessments] = await Promise.all([
    prisma.applicationPanelMember.findMany({
      where: { applicationId },
      orderBy: { position: "asc" },
      include: { member: { select: { id: true, name: true, designation: true, department: true } } },
    }),
    prisma.assessment.findMany({
      where: { applicationId, status: "SUBMITTED" },
      include: { member: { select: { id: true, name: true, designation: true, department: true } } },
    }),
  ]);

  return assessments
    .map((a) => {
      const p = panelMembers.find((pm) => pm.memberId === a.memberId);
      return {
        ...a,
        panelPosition: p ? p.position : 99,
      };
    })
    .sort((a, b) => (a.panelPosition || 99) - (b.panelPosition || 99));
}

// Form B gate: exactly 3 panel members started, all 3 submitted Forms 1+3, AND milestone is submitted.
export async function formBReadiness(applicationId: string) {
  const [panelMembers, submittedAssessments, ms] = await Promise.all([
    prisma.applicationPanelMember.findMany({
      where: { applicationId },
      select: { position: true, memberId: true },
    }),
    prisma.assessment.count({
      where: { applicationId, status: "SUBMITTED" },
    }),
    prisma.milestoneAssessment.findUnique({
      where: { applicationId },
      select: { status: true },
    }),
  ]);

  const panelCount = panelMembers.length;
  const ready =
    panelCount === 3 &&
    submittedAssessments === 3 &&
    ms?.status === "SUBMITTED";

  return {
    ready,
    submitted: submittedAssessments,
    members: 3,
    milestoneSubmitted: ms?.status === "SUBMITTED",
    panelCount,
  };
}

export async function listPendingSecMembers(s: Session) {
  requireRole(s, "ADMIN");
  return prisma.user.findMany({
    where: { role: "SEC_MEMBER", approvalStatus: "PENDING" },
    select: { id: true, name: true, email: true, designation: true, department: true, createdAt: true, active: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function adminApproveSecUser(s: Session, targetUserId: string, reason?: string) {
  requireRole(s, "ADMIN");
  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUserId },
      data: { approvalStatus: "APPROVED", active: true },
    }),
    prisma.auditLog.create({
      data: { actorId: s.userId, action: "APPROVE_SEC_MEMBER", entity: "User", entityId: targetUserId },
    }),
  ]);
  return updated;
}

export async function adminRejectSecUser(s: Session, targetUserId: string, reason?: string) {
  requireRole(s, "ADMIN");
  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUserId },
      data: { approvalStatus: "REJECTED", active: false },
    }),
    prisma.auditLog.create({
      data: { actorId: s.userId, action: "REJECT_SEC_MEMBER", entity: "User", entityId: targetUserId },
    }),
  ]);
  return updated;
}

export async function submitFormB(
  s: Session,
  applicationId: string,
  f: { decision: string; approvedTotal: number; amounts: Prisma.InputJsonValue; timeline: Prisma.InputJsonValue; note?: string }
) {
  requireRole(s, "ADMIN");
  const g = await formBReadiness(applicationId);
  if (!g.ready) throw new Forbidden("FORM_B_LOCKED");
  const status: AppStatus = f.decision === "REJECTED" ? "REJECTED" : f.decision === "REPRESENT" ? "REPRESENT" : "APPROVED";
  await prisma.$transaction([
    prisma.grantEvaluation.create({ data: { applicationId, adminId: s.userId, ...f } }),
    prisma.application.update({ where: { id: applicationId }, data: { status } }),
    prisma.auditLog.create({ data: { actorId: s.userId, action: `FORM_B_${f.decision}`, entity: "Application", entityId: applicationId } }),
  ]);
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

// ---------- FORM PRINTING & DOWNLOAD AUDIT LOGGING ----------
export async function logFormPrintAudit(
  s: Session,
  form: "FORM_A" | "FORM_B" | "APPLICATION",
  applicationId: string,
  dataHash: string,
  isDownload: boolean = false
) {
  const actionPrefix = isDownload ? "DOWNLOAD" : "PRINT_VIEW";
  await prisma.auditLog.create({
    data: {
      actorId: s.userId,
      action: `${actionPrefix}_${form}`,
      entity: "Application",
      entityId: applicationId,
      details: JSON.stringify({
        form,
        dataHash,
        isDownload,
        timestampIST: new Date().toISOString(),
      }),
    },
  });
}
