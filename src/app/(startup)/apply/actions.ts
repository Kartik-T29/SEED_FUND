'use server';

import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createDraft, saveDraft as accessSaveDraft, submitApplication as accessSubmitApplication, listApplications } from '@/lib/access';

export async function initDraft() {
  const session = await getSession();
  if (!session || session.role !== 'STARTUP') throw new Error('Unauthorized');
  
  const apps = await listApplications({ userId: session.userId, role: session.role });
  const draft = apps.find( (a: any) => a.status === 'DRAFT');
  if (draft) return draft.id;
  
  const newApp = await createDraft({ userId: session.userId, role: session.role });
  return newApp.id;
}

export async function saveDraftAction(applicationId: string, payload: any) {
  const session = await getSession();
  if (!session || session.role !== 'STARTUP') throw new Error('Unauthorized');

  await accessSaveDraft({ userId: session.userId, role: session.role }, applicationId, payload);
}

export async function submitApplicationAction(applicationId: string) {
  const session = await getSession();
  if (!session || session.role !== 'STARTUP') throw new Error('Unauthorized');
  
  await accessSubmitApplication({ userId: session.userId, role: session.role }, applicationId);
  
  revalidatePath('/dashboard');
  revalidatePath('/status');
  redirect('/status');
}
