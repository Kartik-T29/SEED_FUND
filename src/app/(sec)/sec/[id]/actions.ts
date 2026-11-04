'use server';

import { getSession } from '@/lib/auth';
import {
  startAssessment,
  updateSecProfile,
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

export async function startAssessmentAction(applicationId: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SEC_MEMBER') {
      return { success: false, error: 'Unauthorized: SEC Member session required.' };
    }

    const result = await startAssessment(
      { userId: session.userId, role: session.role },
      applicationId
    );

    revalidatePath('/sec');
    revalidatePath(`/sec/${applicationId}`);
    return { success: true, position: result.position };
  } catch (err: any) {
    console.error('startAssessmentAction error:', err);
    let msg = err.message || 'Failed to start assessment.';
    if (msg.includes('The panel for this application is complete')) {
      msg = 'The panel for this application is complete';
    }
    return { success: false, error: msg };
  }
}

export async function updateSecProfileAction(data: { name: string; designation: string; department?: string }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SEC_MEMBER') {
      return { success: false, error: 'Unauthorized: SEC Member session required.' };
    }

    await updateSecProfile(
      { userId: session.userId, role: session.role },
      data
    );

    revalidatePath('/sec');
    return { success: true };
  } catch (err: any) {
    console.error('updateSecProfileAction error:', err);
    return { success: false, error: err.message || 'Failed to update profile' };
  }
}

export async function saveAssessmentDraftAction(
  applicationId: string,
  data: {
    statusForm: any;
    experimentForm: any;
  }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SEC_MEMBER') {
      return { success: false, error: 'Unauthorized: SEC Member session required.' };
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
  } catch (err: any) {
    console.error('saveAssessmentDraftAction error:', err);
    let msg = err.message || 'Failed to save draft.';
    if (msg.includes('REVIEW_CLOSED')) {
      msg = 'Evaluation is closed because this application has already been finalized (Approved/Rejected).';
    } else if (msg.includes('ALREADY_SUBMITTED')) {
      msg = 'You have already submitted and locked your evaluation for this application.';
    }
    return { success: false, error: msg };
  }
}

export async function submitAssessmentFinalAction(
  applicationId: string,
  data: {
    statusForm: any;
    experimentForm: any;
  }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SEC_MEMBER') {
      return { success: false, error: 'Unauthorized: SEC Member session required.' };
    }

    // Validate statusForm: TRL, MRL, IRL levels must be selected
    const sf = data.statusForm || {};
    if (!sf.trl || !sf.mrl || !sf.irl) {
      return { success: false, error: 'STATUS_LEVELS_INCOMPLETE: TRL, MRL, and IRL levels must all be evaluated.' };
    }

    // Validate experimentForm: 12 questions must be answered
    const ef = data.experimentForm || {};
    const questions = ef.questions || {};
    const answeredCount = Object.keys(questions).length;
    if (answeredCount < 12) {
      return { success: false, error: `QUESTIONS_INCOMPLETE: All 12 evaluation questions must be answered (currently ${answeredCount}/12).` };
    }

    if (!ef.grantEvaluation) {
      return { success: false, error: 'GRANT_EVALUATION_REQUIRED: Please select recommended grant type.' };
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
  } catch (err: any) {
    console.error('submitAssessmentFinalAction error:', err);
    let msg = err.message || 'Final submission failed.';
    if (msg.includes('REVIEW_CLOSED')) {
      msg = 'Evaluation is closed because this application has already been finalized (Approved/Rejected).';
    } else if (msg.includes('ALREADY_SUBMITTED')) {
      msg = 'You have already submitted and locked your evaluation for this application.';
    }
    return { success: false, error: msg };
  }
}

export async function claimMilestoneAction(
  applicationId: string,
  track: 'PROTOTYPING' | 'PROFESSIONAL',
  milestoneNames: string[]
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SEC_MEMBER') {
      return { success: false, error: 'Unauthorized' };
    }

    const result = await claimMilestone(
      { userId: session.userId, role: session.role },
      applicationId,
      track,
      milestoneNames
    );

    revalidatePath(`/sec/${applicationId}`);
    return { success: true, milestoneId: result.id };
  } catch (err: any) {
    console.error('claimMilestoneAction error:', err);
    let msg = err.message || 'Failed to claim milestone form.';
    if (msg.includes('ALREADY_CLAIMED')) {
      msg = 'This milestone assessment has already been claimed by another SEC member.';
    }
    return { success: false, error: msg };
  }
}

export async function updateMilestoneStateAction(
  applicationId: string,
  itemId: string,
  state: 'COMPLETED' | 'PENDING' | 'IN_PROGRESS',
  ownerRemark?: string
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SEC_MEMBER') {
      return { success: false, error: 'Unauthorized' };
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
  } catch (err: any) {
    console.error('updateMilestoneStateAction error:', err);
    return { success: false, error: err.message || 'Failed to update milestone item.' };
  }
}

export async function addMilestoneRemarkAction(
  applicationId: string,
  itemId: string,
  remark: string
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SEC_MEMBER') {
      return { success: false, error: 'Unauthorized' };
    }

    await addMilestoneRemark(
      { userId: session.userId, role: session.role },
      itemId,
      remark
    );

    revalidatePath(`/sec/${applicationId}`);
    return { success: true };
  } catch (err: any) {
    console.error('addMilestoneRemarkAction error:', err);
    return { success: false, error: err.message || 'Failed to add remark.' };
  }
}

export async function submitMilestoneAction(applicationId: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SEC_MEMBER') {
      return { success: false, error: 'Unauthorized' };
    }

    await submitMilestone({ userId: session.userId, role: session.role }, applicationId);
    revalidatePath(`/sec/${applicationId}`);
    return { success: true };
  } catch (err: any) {
    console.error('submitMilestoneAction error:', err);
    return { success: false, error: err.message || 'Failed to submit milestone form.' };
  }
}
