import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getApplication, getMyAssessment, getMilestoneAssessment } from '@/lib/access';
import SecAssessmentFormClient from './SecAssessmentFormClient';
import { prisma } from '@/lib/prisma';

export default async function SecApplicationPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session || session.role !== 'SEC_MEMBER') redirect('/login');

  const { id } = params;

  const [application, myAssessment, milestone, currentMember] = await Promise.all([
    getApplication({ userId: session.userId, role: session.role }, id),
    getMyAssessment({ userId: session.userId, role: session.role }, id),
    getMilestoneAssessment({ userId: session.userId, role: session.role }, id),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, designation: true, department: true },
    }),
  ]);

  return (
    <div className="w-full h-[calc(100vh-64px)] overflow-hidden">
      <SecAssessmentFormClient
        application={application}
        myAssessment={myAssessment}
        milestone={milestone}
        currentMember={currentMember}
      />
    </div>
  );
}
