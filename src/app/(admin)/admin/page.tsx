import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listApplications, listPendingSecMembers } from '@/lib/access';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { SecApprovalItem } from '@/components/admin/SecApprovalItem';

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect('/login');

  const [applications, pendingSec] = await Promise.all([
    listApplications(session as any),
    listPendingSecMembers(session as any),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Operations Console</h1>
          <p className="text-xs text-gray-500 mt-1">
            IDEAPAD Seed Fund Governance, SEC Evaluator Verification & Sanction Orders
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="default">Admin Role</Badge>
          <Link href="/change-password">
            <Button variant="outline" className="text-xs px-3 py-1.5 flex items-center gap-1.5 border-gray-300 hover:bg-gray-100">
              <KeyRound className="w-3.5 h-3.5 text-gray-600" />
              Change Password
            </Button>
          </Link>
        </div>
      </div>

      {/* SEC Evaluator Verification Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>SEC Evaluator Verification</span>
            {pendingSec.length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 font-bold rounded-full border border-amber-300">
                {pendingSec.length} Pending
              </span>
            )}
          </h2>
        </div>

        {pendingSec.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500 text-center">
            No SEC evaluators currently pending verification. All committee members are active and verified.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingSec.map((member) => (
              <SecApprovalItem key={member.id} member={member} />
            ))}
          </div>
        )}
      </div>

      {/* Applications Review & Sanction Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Submitted Startup Proposals</h2>
        <div className="grid gap-6">
          {applications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No applications currently submitted in the system.
              </CardContent>
            </Card>
          ) : (
            applications.map((app: any) => {
              const assessedCount = app._count.assessments;
              
              return (
                <Card key={app.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-gray-900">
                            {app.startup.teamName}
                          </h3>
                          <Badge variant={
                            app.status === 'SUBMITTED' ? 'warning' :
                            app.status === 'IN_REVIEW' ? 'info' :
                            app.status === 'APPROVED' ? 'success' : 'default'
                          }>
                            {app.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          Submitted: {app.submittedAt ? formatDate(app.submittedAt) : 'N/A'}
                        </p>
                      </div>
                      
                      <div className="flex flex-col sm:items-end gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">Assessments Submitted: {assessedCount}</span>
                        </div>
                        <Link href={`/admin/application/${app.id}`}>
                          <Button>
                            Manage & Review
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
