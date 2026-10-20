import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listApplicationsByTier, tierCounts } from '@/lib/access';
import SecDashboardClient from './SecDashboardClient';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function SECDashboard() {
  const session = await getSession();
  if (!session || session.role !== 'SEC_MEMBER') redirect('/login');

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, active: true, approvalStatus: true },
  });
  if (!currentUser || !currentUser.active || currentUser.approvalStatus !== 'APPROVED') {
    redirect('/login');
  }

  const [applications, summary] = await Promise.all([
    listApplicationsByTier({ userId: session.userId, role: session.role }),
    tierCounts({ userId: session.userId, role: session.role }),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">SEC Member Evaluation Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review startup grant applications, evaluate milestones and TRL feasibility, and submit Form A assessments.
        </p>
      </div>

      <SecDashboardClient
        initialApplications={applications}
        tierSummary={summary}
        currentUserId={session.userId}
      />
    </div>
  );
}
