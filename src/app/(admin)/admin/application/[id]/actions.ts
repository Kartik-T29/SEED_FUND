'use server';

import { getSession } from '@/lib/auth';
import { submitFormB, getApplication, formBReadiness } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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
