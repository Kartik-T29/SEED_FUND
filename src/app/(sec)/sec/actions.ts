'use server';

import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  saveAssessment as accessSaveAssessment,
  claimMilestone as accessClaimMilestone,
  setMilestoneState as accessSetMilestoneState,
  addMilestoneRemark as accessAddMilestoneRemark,
  submitMilestone as accessSubmitMilestone,
} from '@/lib/access';
import type { MilestoneState } from '@prisma/client';

export async function saveAssessmentAction(
  applicationId: string,
  payload: any,
  submit: boolean = false
) {
  const session = await getSession();
  if (!session || session.role !== 'SEC_MEMBER') throw new Error('Unauthorized');

  const assessment = await accessSaveAssessment(session, applicationId, payload, submit);
  revalidatePath('/sec');
  revalidatePath(`/sec/applications/${applicationId}`);
  revalidatePath(`/sec/${applicationId}`);
  return { success: true, assessment };
}

export async function claimMilestoneAction(
  applicationId: string,
  track: string,
  names: string[]
) {
  const session = await getSession();
  if (!session || session.role !== 'SEC_MEMBER') throw new Error('Unauthorized');

  const ms = await accessClaimMilestone(session, applicationId, track, names);
  revalidatePath(`/sec/applications/${applicationId}`);
  revalidatePath(`/sec/${applicationId}`);
  return { success: true, milestone: ms };
}

export async function setMilestoneStateAction(
  itemId: string,
  state: MilestoneState,
  ownerRemark?: string,
  applicationId?: string,
  expectedUpdatedAt?: string | Date
) {
  const session = await getSession();
  if (!session || session.role !== 'SEC_MEMBER') throw new Error('Unauthorized');

  const updatedItem = await accessSetMilestoneState(session, itemId, state, ownerRemark, expectedUpdatedAt);
  if (applicationId) {
    revalidatePath(`/sec/applications/${applicationId}`);
    revalidatePath(`/sec/${applicationId}`);
  }
  return { success: true, updatedItem };
}

export async function addMilestoneRemarkAction(
  itemId: string,
  remark: string,
  applicationId?: string
) {
  const session = await getSession();
  if (!session || session.role !== 'SEC_MEMBER') throw new Error('Unauthorized');

  const remarkRecord = await accessAddMilestoneRemark(session, itemId, remark);
  if (applicationId) {
    revalidatePath(`/sec/applications/${applicationId}`);
    revalidatePath(`/sec/${applicationId}`);
  }
  return { success: true, remark: remarkRecord };
}

export async function saveStatusLevelsAction(
  applicationId: string,
  statusForm: { trl: number; mrl: number; irl: number }
) {
  const session = await getSession();
  if (!session || session.role !== 'SEC_MEMBER') throw new Error('Unauthorized');

  const assessment = await accessSaveAssessment(
    session,
    applicationId,
    { statusForm },
    false
  );
  revalidatePath(`/sec/applications/${applicationId}`);
  return { success: true, assessment };
}

export async function submitMilestoneAction(applicationId: string) {
  const session = await getSession();
  if (!session || session.role !== 'SEC_MEMBER') throw new Error('Unauthorized');

  await accessSubmitMilestone(session, applicationId);
  revalidatePath(`/sec/applications/${applicationId}`);
  revalidatePath(`/sec/${applicationId}`);
  return { success: true };
}
