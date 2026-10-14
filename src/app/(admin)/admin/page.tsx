import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listApplicationsByTier, tierCounts } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect('/login');

  const [applications, summary, activeSecMembers] = await Promise.all([
    listApplicationsByTier({ userId: session.userId, role: session.role }),
    tierCounts({ userId: session.userId, role: session.role }),
    prisma.user.findMany({
      where: { role: 'SEC_MEMBER', active: true },
      select: { id: true, name: true, designation: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Seed Grant Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review committee evaluations, compare evaluator assessments side-by-side, sanction Form B grant approvals, and manage portal accounts.
        </p>
      </div>

      <AdminDashboardClient
        initialApplications={applications}
        tierSummary={summary}
        activeSecMembers={activeSecMembers}
      />
    </div>
  );
}
