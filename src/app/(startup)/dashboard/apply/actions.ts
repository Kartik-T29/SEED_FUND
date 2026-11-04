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
  return { success: true, requestedTotal: result.requestedTotal, items: result.items };
}

export async function uploadDocumentAction(formData: FormData) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'STARTUP') {
      return { success: false, error: 'Unauthorized' };
    }

    const applicationId = formData.get('applicationId') as string;
    const docType = formData.get('docType') as DocType;
    const memberLabel = (formData.get('memberLabel') as string) || undefined;
    const file = formData.get('file') as File;

    if (!file || !applicationId || !docType) {
      return { success: false, error: 'Missing file or required metadata' };
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

    return {
      success: true,
      document: {
        id: doc.id,
        type: doc.type,
        memberLabel: doc.memberLabel,
        createdAt: doc.createdAt,
      },
    };
  } catch (err: any) {
    console.error('uploadDocumentAction error:', err);
    return { success: false, error: err.message || 'File upload failed' };
  }
}

export async function removeDocumentAction(documentId: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'STARTUP') {
      return { success: false, error: 'Unauthorized' };
    }

    await accessRemoveDocument(session, documentId);
    return { success: true };
  } catch (err: any) {
    console.error('removeDocumentAction error:', err);
    return { success: false, error: err.message || 'Failed to remove document' };
  }
}

export async function submitApplicationAction(applicationId: string) {
  const session = await getSession();
  if (!session || session.role !== 'STARTUP') throw new Error('Unauthorized');

  await accessSubmitApplication(session, applicationId);

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/apply');
  revalidatePath('/status');
  return { success: true, redirectUrl: '/dashboard' };
}
