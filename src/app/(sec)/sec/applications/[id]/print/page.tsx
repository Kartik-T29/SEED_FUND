import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getApplication, adminComparison, getMilestoneAssessment } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { TIERS, getTierBadgeClasses } from '@/lib/tiers';
import { BUDGET_HEADERS, LEVELS, TRACK_LABELS } from '@/lib/seedfund-constants';
import { SEC_QUESTIONS, FLAT_SEC_QUESTIONS } from '@/lib/sec-questions';
import FormAPrintClient from './FormAPrintClient';

export const dynamic = 'force-dynamic';

export default async function FormAPrintPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== 'SEC_MEMBER' && session.role !== 'ADMIN')) redirect('/login');

  const { id } = params;

  const [application, assessments, milestone, activeMembers] = await Promise.all([
    getApplication({ userId: session.userId, role: session.role }, id),
    prisma.assessment.findMany({
      where: { applicationId: id, outdated: false },
      include: {
        member: { select: { id: true, name: true, designation: true, department: true } },
      },
      orderBy: { member: { name: 'asc' } },
    }),
    getMilestoneAssessment({ userId: session.userId, role: session.role }, id),
    prisma.user.findMany({
      where: { role: 'SEC_MEMBER', active: true },
      select: { id: true, name: true, designation: true, department: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <FormAPrintClient
      application={application}
      assessments={assessments}
      milestone={milestone}
      activeMembers={activeMembers}
    />
  );
}
