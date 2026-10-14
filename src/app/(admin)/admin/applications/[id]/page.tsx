import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  getApplication,
  getConsolidatedReport,
  getFormBPrefill,
  getMilestoneAssessment,
  formBReadiness,
} from '@/lib/access';
import { prisma } from '@/lib/prisma';
import AdminApplicationDetailClient from './AdminApplicationDetailClient';

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect('/login');

  const { id } = params;

  const [application, report, formBPrefillData, milestone, readiness, activeSecMembers] = await Promise.all([
    getApplication({ userId: session.userId, role: session.role }, id),
    getConsolidatedReport({ userId: session.userId, role: session.role }, id),
    getFormBPrefill({ userId: session.userId, role: session.role }, id),
    getMilestoneAssessment({ userId: session.userId, role: session.role }, id),
    formBReadiness(id),
    prisma.user.findMany({
      where: { role: 'SEC_MEMBER', active: true },
      select: { id: true, name: true, designation: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <AdminApplicationDetailClient
        application={application}
        report={report}
        formBPrefillData={formBPrefillData}
        milestone={milestone}
        readiness={readiness}
        activeSecMembers={activeSecMembers}
      />
    </div>
  );
}
