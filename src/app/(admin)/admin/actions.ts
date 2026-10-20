'use server';

import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  submitFormB as accessSubmitFormB,
  saveFormBDraft as accessSaveFormBDraft,
  adminReopenAssessment,
  adminReopenApplication,
  adminReassignMilestoneOwner,
  adminChangeTier,
  adminWaiveGrantLimit,
  adminReopenFormB,
  adminCreateSecUser,
  adminApproveSecUser,
  adminRejectSecUser,
  adminUpdateUser,
  adminToggleUserActive,
  adminResetUserPassword,
} from '@/lib/access';
import type { GrantType } from '@prisma/client';

export async function saveFormBDraftAction(
  applicationId: string,
  data: any,
  adminReason: string = "Save Form B Draft"
) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');

  const evalRecord = await accessSaveFormBDraft(session, applicationId, data, adminReason);
  revalidatePath('/admin');
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath(`/admin/application/${applicationId}`);
  return { success: true, evaluation: evalRecord };
}

export async function submitFormBAction(
  applicationId: string,
  data: any,
  adminReason: string
) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');

  const evalRecord = await accessSubmitFormB(session, applicationId, data, adminReason);
  revalidatePath('/admin');
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath(`/admin/application/${applicationId}`);
  return { success: true, evaluation: evalRecord };
}

export async function reopenAssessmentAction(
  memberId: string,
  applicationId: string,
  reason: string
) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');

  await adminReopenAssessment(session, memberId, applicationId, reason);
  revalidatePath('/admin');
  revalidatePath(`/admin/applications/${applicationId}`);
  return { success: true };
}

export async function reopenApplicationAction(
  applicationId: string,
  reason: string
) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');

  await adminReopenApplication(session, applicationId, reason);
  revalidatePath('/admin');
  revalidatePath(`/admin/applications/${applicationId}`);
  return { success: true };
}

export async function reassignMilestoneOwnerAction(
  applicationId: string,
  newOwnerId: string,
  reason: string
) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');

  await adminReassignMilestoneOwner(session, applicationId, newOwnerId, reason);
  revalidatePath('/admin');
  revalidatePath(`/admin/applications/${applicationId}`);
  return { success: true };
}

export async function changeTierAction(
  applicationId: string,
  newGrantType: GrantType,
  reason: string
) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');

  await adminChangeTier(session, applicationId, newGrantType, reason);
  revalidatePath('/admin');
  revalidatePath(`/admin/applications/${applicationId}`);
  return { success: true };
}

export async function waiveGrantLimitAction(
  startupId: string,
  reason: string
) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');

  await adminWaiveGrantLimit(session, startupId, reason);
  revalidatePath('/admin');
  return { success: true };
}

export async function reopenFormBAction(
  applicationId: string,
  reason: string
) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');

  await adminReopenFormB(session, applicationId, reason);
  revalidatePath('/admin');
  revalidatePath(`/admin/applications/${applicationId}`);
  return { success: true };
}

export async function createSecUserAction(
  data: { email: string; name: string; designation?: string; department?: string; password: string },
  reason: string
) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');

  const user = await adminCreateSecUser(session, data, reason);
  revalidatePath('/admin/users');
  return { success: true, user };
}

export async function updateUserAction(
  userId: string,
  data: { name?: string; designation?: string; department?: string },
  reason: string
) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');

  const user = await adminUpdateUser(session, userId, data, reason);
  revalidatePath('/admin/users');
  return { success: true, user };
}

export async function toggleUserActiveAction(
  userId: string,
  active: boolean,
  reason: string
) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');

  const user = await adminToggleUserActive(session, userId, active, reason);
  revalidatePath('/admin/users');
  return { success: true, user };
}

export async function approveSecUserAction(
  userId: string,
  reason: string = "Approved by admin"
) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');

  const user = await adminApproveSecUser(session, userId, reason);
  revalidatePath('/admin/users');
  return { success: true, user };
}

export async function rejectSecUserAction(
  userId: string,
  reason: string = "Rejected by admin"
) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');

  const user = await adminRejectSecUser(session, userId, reason);
  revalidatePath('/admin/users');
  return { success: true, user };
}

export async function resetUserPasswordAction(
  userId: string,
  newPassword: string,
  reason: string
) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') throw new Error('Unauthorized');

  await adminResetUserPassword(session, userId, newPassword, reason);
  revalidatePath('/admin/users');
  return { success: true };
}
