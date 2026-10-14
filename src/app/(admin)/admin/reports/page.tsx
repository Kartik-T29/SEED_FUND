import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { adminGetReports, adminGetAuditLogs, adminListUsers } from '@/lib/access';
import ReportsClient from './ReportsClient';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    redirect('/login');
  }

  const s = { userId: session.userId, role: session.role };

  const [reportsData, auditLogs, allUsers] = await Promise.all([
    adminGetReports(s),
    adminGetAuditLogs(s),
    adminListUsers(s),
  ]);

  // Sanitize data for client serialization
  const serializedGrants = reportsData.grants.map((g) => ({
    id: g.id,
    startupId: g.startupId,
    startupTeamName: g.startup?.teamName || 'Unknown Team',
    grantType: g.grantType,
    amount: Number(g.amount),
    closedAt: g.closedAt ? g.closedAt.toISOString() : null,
    waived: g.waived,
  }));

  const serializedApplications = reportsData.applications.map((app) => ({
    id: app.id,
    teamName: app.startup?.teamName || 'Unknown',
    applicantName: app.startup?.user?.name || 'Unknown',
    grantType: app.grantType,
    status: app.status,
    requestedTotal: Number(app.requestedTotal),
    submittedAt: app.submittedAt ? app.submittedAt.toISOString() : null,
    evaluation: app.evaluation
      ? {
          decision: app.evaluation.decision,
          approvedTotal: Number(app.evaluation.approvedTotal),
          decidedAt: app.evaluation.decidedAt.toISOString(),
          forced: app.evaluation.forced,
        }
      : null,
  }));

  const serializedAuditLogs = auditLogs.map((log) => ({
    id: log.id,
    actorId: log.actorId,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    reason: log.reason,
    details: log.details as any,
    at: log.at.toISOString(),
  }));

  const userMap: Record<string, { name: string; email: string; role: string }> = {};
  for (const u of allUsers) {
    userMap[u.id] = { name: u.name, email: u.email, role: u.role };
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports, Policy Summary & Audit Trail</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review half-yearly grant allocations, export disbursement records, and inspect system audit logs with full rationale tracking.
        </p>
      </div>

      <ReportsClient
        totalGrantsAwarded={reportsData.totalGrantsAwarded}
        totalApprovedAmount={reportsData.totalApprovedAmount}
        perTierBreakdown={reportsData.perTierBreakdown}
        grants={serializedGrants}
        applications={serializedApplications}
        auditLogs={serializedAuditLogs}
        userMap={userMap}
      />
    </div>
  );
}
