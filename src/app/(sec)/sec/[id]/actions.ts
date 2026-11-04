'use server';

import { getSession } from '@/lib/auth';
import {
  saveAssessment,
  claimMilestone,
  setMilestoneState,
  addMilestoneRemark,
  submitMilestone,
  getApplication,
  getMyAssessment,
} from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function saveAssessmentDraftAction(
  applicationId: string,
  data: {
    statusForm: any;
    experimentForm: any;
  }
) {
  const session = await getSession();
  if (!session || session.role !== 'SEC_MEMBER') {
    throw new Error('Unauthorized');
  }

  await saveAssessment(
    { userId: session.userId, role: session.role },
    applicationId,
    {
      statusForm: data.statusForm,
      experimentForm: data.experimentForm,
    },
    false
  );

  revalidatePath(`/sec/${applicationId}`);
  return { success: true };
}

export async function submitAssessmentFinalAction(
  applicationId: string,
  data: {
    statusForm: any;
    experimentForm: any;
  }
) {
  const session = await getSession();
  if (!session || session.role !== 'SEC_MEMBER') {
    throw new Error('Unauthorized');
  }

  // Validate statusForm: TRL, MRL, IRL levels must be selected
  const sf = data.statusForm || {};
  if (!sf.trl || !sf.mrl || !sf.irl) {
    throw new Error('STATUS_LEVELS_INCOMPLETE: TRL, MRL, and IRL levels must all be evaluated.');
  }

  // Validate experimentForm: 12 questions must be answered
  const ef = data.experimentForm || {};
  const questions = ef.questions || {};
  const answeredCount = Object.keys(questions).length;
  if (answeredCount < 12) {
    throw new Error(`QUESTIONS_INCOMPLETE: All 12 evaluation questions must be answered (currently ${answeredCount}/12).`);
  }

  if (!ef.grantEvaluation) {
    throw new Error('GRANT_EVALUATION_REQUIRED: Please select recommended grant type.');
  }

  await saveAssessment(
    { userId: session.userId, role: session.role },
    applicationId,
    {
      statusForm: data.statusForm,
      experimentForm: data.experimentForm,
    },
    true
  );

  revalidatePath(`/sec/${applicationId}`);
  return { success: true };
}

export async function claimMilestoneAction(
  applicationId: string,
  track: 'PROTOTYPING' | 'PROFESSIONAL',
  milestoneNames: string[]
) {
  const session = await getSession();
  if (!session || session.role !== 'SEC_MEMBER') {
    throw new Error('Unauthorized');
  }

  const result = await claimMilestone(
    { userId: session.userId, role: session.role },
    applicationId,
    track,
    milestoneNames
  );

  revalidatePath(`/sec/${applicationId}`);
  return { success: true, milestoneId: result.id };
}

export async function updateMilestoneStateAction(
  applicationId: string,
  itemId: string,
  state: 'COMPLETED' | 'PENDING' | 'IN_PROGRESS',
  ownerRemark?: string
) {
  const session = await getSession();
  if (!session || session.role !== 'SEC_MEMBER') {
    throw new Error('Unauthorized');
  }

  // Audit log old value vs new value for printed Form A audit trail
  const currentItem = await prisma.milestoneItem.findUnique({
    where: { id: itemId },
    select: { state: true, ownerRemark: true, milestoneId: true },
  });

  if (currentItem && (currentItem.state !== state || currentItem.ownerRemark !== (ownerRemark || null))) {
    await prisma.milestoneEditLog.create({
      data: {
        milestoneId: currentItem.milestoneId,
        memberId: session.userId,
        field: `item_${itemId}_state`,
        oldValue: `${currentItem.state}${currentItem.ownerRemark ? ` (${currentItem.ownerRemark})` : ''}`,
        newValue: `${state}${ownerRemark ? ` (${ownerRemark})` : ''}`,
      },
    });
  }

  await setMilestoneState(
    { userId: session.userId, role: session.role },
    itemId,
    state,
    ownerRemark
  );

  revalidatePath(`/sec/${applicationId}`);
  return { success: true };
}

export async function addMilestoneRemarkAction(
  applicationId: string,
  itemId: string,
  remark: string
) {
  const session = await getSession();
  if (!session || session.role !== 'SEC_MEMBER') {
    throw new Error('Unauthorized');
  }

  await addMilestoneRemark(
    { userId: session.userId, role: session.role },
    itemId,
    remark
  );

  revalidatePath(`/sec/${applicationId}`);
  return { success: true };
}

export async function submitMilestoneAction(applicationId: string) {
  const session = await getSession();
  if (!session || session.role !== 'SEC_MEMBER') {
    throw new Error('Unauthorized');
  }

  await submitMilestone({ userId: session.userId, role: session.role }, applicationId);
  revalidatePath(`/sec/${applicationId}`);
  return { success: true };
}
