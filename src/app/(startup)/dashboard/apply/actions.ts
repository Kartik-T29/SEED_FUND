'use server';

import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  getOrCreateDraft,
  getStartupApplication,
  acceptAgreement as accessAcceptAgreement,
  saveDraft as accessSaveDraft,
  saveBudget as accessSaveBudget,
  addDocument as accessAddDocument,
  removeDocument as accessRemoveDocument,
  submitApplication as accessSubmitApplication,
} from '@/lib/access';
import type { DocType, GrantType } from '@prisma/client';

export async function initApplicationAction() {
  const session = await getSession();
  if (!session || session.role !== 'STARTUP') throw new Error('Unauthorized');

  // Check if existing application exists
  const existing = await getStartupApplication(session);
  if (existing) {
    return existing;
  }

  // Otherwise get or create draft
  const draft = await getOrCreateDraft(session);
  return draft;
}

export async function acceptAgreementAction(applicationId: string, typedName: string) {
  const session = await getSession();
  if (!session || session.role !== 'STARTUP') throw new Error('Unauthorized');

  const updated = await accessAcceptAgreement(session, applicationId, typedName);
  revalidatePath('/dashboard/apply');
  return { success: true, agreement: (updated.formData as any)?.agreement };
}

export async function saveDraftAction(
  applicationId: string,
  payload: {
    formData?: any;
    grantType?: GrantType | '';
    requestedTotal?: number;
  }
) {
  const session = await getSession();
  if (!session || session.role !== 'STARTUP') throw new Error('Unauthorized');

  await accessSaveDraft(session, applicationId, payload);
  revalidatePath('/dashboard/apply');
  return { success: true };
}

export async function saveBudgetAction(
  applicationId: string,
  items: any[],
  allowPartial = false
) {
  const session = await getSession();
  if (!session || session.role !== 'STARTUP') throw new Error('Unauthorized');

  const result = await accessSaveBudget(session, applicationId, items, { allowPartial });
  revalidatePath('/dashboard/apply');
  return { success: true, requestedTotal: result.requestedTotal, items: result.items };
}

export async function uploadDocumentAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'STARTUP') throw new Error('Unauthorized');

  const applicationId = formData.get('applicationId') as string;
  const docType = formData.get('docType') as DocType;
  const memberLabel = (formData.get('memberLabel') as string) || undefined;
  const file = formData.get('file') as File;

  if (!file || !applicationId || !docType) {
    throw new Error('MISSING_FILE_OR_METADATA');
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const doc = await accessAddDocument(
    session,
    applicationId,
    {
      name: file.name,
      type: file.type,
      size: file.size,
      buffer,
    },
    docType,
    memberLabel
  );

  revalidatePath('/dashboard/apply');
  return {
    success: true,
    document: {
      id: doc.id,
      type: doc.type,
      memberLabel: doc.memberLabel,
      createdAt: doc.createdAt,
    },
  };
}

export async function removeDocumentAction(documentId: string) {
  const session = await getSession();
  if (!session || session.role !== 'STARTUP') throw new Error('Unauthorized');

  await accessRemoveDocument(session, documentId);
  revalidatePath('/dashboard/apply');
  return { success: true };
}

export async function submitApplicationAction(applicationId: string) {
  const session = await getSession();
  if (!session || session.role !== 'STARTUP') throw new Error('Unauthorized');

  await accessSubmitApplication(session, applicationId);

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/apply');
  revalidatePath('/status');
  redirect('/dashboard');
}
