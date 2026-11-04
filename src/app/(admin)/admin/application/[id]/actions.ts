'use server';

import { getSession } from '@/lib/auth';
import { submitFormB, getApplication, formBReadiness, adminReleasePanelSlot } from '@/lib/access';
import { updateSignatory } from '@/lib/signatories';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function adminReleasePanelSlotAction(
  applicationId: string,
  memberId: string,
  reason: string
) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized: Admin role required.' };
  }

  try {
    await adminReleasePanelSlot(
      { userId: session.userId, role: session.role },
      applicationId,
      memberId,
      reason
    );
    revalidatePath(`/admin/application/${applicationId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to release panel slot' };
  }
}

export async function updateSignatoryAction(
  key: string,
  data: { name: string; designation: string }
) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized: Admin role required.' };
  }

  try {
    await updateSignatory(
      { userId: session.userId, role: session.role },
      key,
      data
    );
    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update signatory' };
  }
}

export async function submitAdminFormBAction(
  applicationId: string,
  payload: {
    decision: string;
    approvedTotal: number;
    amounts: Record<string, number>;
    timeline: Record<string, string>;
    note?: string;
    termsAcknowledged: boolean;
  }
) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin role required.');
  }

  // Validate mandatory fields
  if (!payload.decision) {
    throw new Error('DECISION_REQUIRED: Please select final grant decision.');
  }

  if (payload.decision !== 'REJECTED' && payload.decision !== 'REPRESENT') {
    if (payload.approvedTotal <= 0) {
      throw new Error('APPROVED_TOTAL_REQUIRED: Approved grant total must be positive.');
    }
  }

  if (!payload.termsAcknowledged && payload.decision !== 'REJECTED') {
    throw new Error('TERMS_ACKNOWLEDGED_REQUIRED: Institutional terms and conditions must be acknowledged.');
  }

  await submitFormB(
    { userId: session.userId, role: session.role },
    applicationId,
    {
      decision: payload.decision,
      approvedTotal: payload.approvedTotal,
      amounts: payload.amounts,
      timeline: payload.timeline,
      note: payload.note,
    }
  );

  revalidatePath(`/admin/application/${applicationId}`);
  revalidatePath('/admin');
  return { success: true };
}
