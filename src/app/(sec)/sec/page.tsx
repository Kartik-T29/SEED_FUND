import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listApplications } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import SecProfilePrompt from '@/components/sec/SecProfilePrompt';
import StartAssessmentButton from '@/components/sec/StartAssessmentButton';
import { Printer, Download, ArrowRight, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SECDashboard() {
  const session = await getSession();
  if (!session || session.role !== 'SEC_MEMBER') redirect('/login');

  const [currentUser, applications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, designation: true, department: true, approvalStatus: true, active: true },
    }),
    listApplications(session as any),
  ]);

  if (!currentUser || currentUser.approvalStatus !== 'APPROVED' || !currentUser.active) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">SEC Dashboard</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-8 text-center text-amber-900">
            <h2 className="text-base font-bold mb-2">Evaluator Account Pending Approval</h2>
            <p className="text-sm">
              Your SEC evaluator profile has not been activated or approved by the administrator yet.
              Once approved, you will be able to review applications and claim evaluation panel slots.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isProfileComplete = Boolean(
    currentUser.name &&
    currentUser.name.trim() !== '' &&
    currentUser.designation &&
    currentUser.designation.trim() !== '' &&
    currentUser.department &&
    currentUser.department.trim() !== ''
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEC Evaluation Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Seed Evaluation Committee portal. Panel rule: first 3 approved evaluators to start form the official panel.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-500 block">Logged in as</span>
          <span className="text-sm font-semibold text-gray-900">{currentUser.name}</span>
          <span className="text-xs text-brand-primary block">{currentUser.designation || 'SEC Member'}</span>
        </div>
      </div>

      {/* Evaluator Profile Prompt */}
      <SecProfilePrompt
        initialName={currentUser.name}
        initialDesignation={currentUser.designation || ''}
        initialDepartment={currentUser.department || ''}
        isComplete={isProfileComplete}
      />

      <div className="grid gap-5">
        {applications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No applications pending review at this time.
            </CardContent>
          </Card>
        ) : (
          applications.map((app: any) => {
            const mySlot = app.panelMembers?.find((pm: any) => pm.memberId === session.userId);
            const panelCount = app.panelMembers?.length || 0;
            const isPanelFull = panelCount >= 3;
            const assessedCount = app._count?.assessments || 0;

            // Scenario 1: User is already an assigned panel member (Position 1, 2, or 3)
            if (mySlot) {
              return (
                <Card key={app.id} className="border-l-4 border-l-brand-primary hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="font-semibold text-lg text-gray-900">
                            {app.startup.teamName}
                          </h3>
                          <Badge variant="info" className="text-xs font-semibold">
                            SEC Member {mySlot.position} {mySlot.position === 1 && '(Milestone Lead)'}
                          </Badge>
                          <Badge variant={
                            app.status === 'SUBMITTED' ? 'warning' :
                            app.status === 'IN_REVIEW' ? 'info' :
                            app.status === 'APPROVED' ? 'success' : 'default'
                          }>
                            {app.status.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
                            Tier: {app.grantType || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                          <span>Submitted: {app.submittedAt ? formatDate(app.submittedAt) : 'N/A'}</span>
                          <span>•</span>
                          <span>Panel: {panelCount} of 3 evaluators assigned</span>
                          <span>•</span>
                          <span>Completed Assessments: {assessedCount} of 3</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/sec/${app.id}/print`} target="_blank">
                          <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
                            <Printer className="w-3.5 h-3.5" /> Form A
                          </Button>
                        </Link>
                        <Link href={`/sec/${app.id}/pdf`} target="_blank">
                          <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
                            <Download className="w-3.5 h-3.5" /> PDF
                          </Button>
                        </Link>
                        <Link href={`/sec/${app.id}`}>
                          <Button variant="primary" size="sm" className="flex items-center gap-1.5 text-xs">
                            Continue Assessment <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            // Scenario 2: Approved SEC member NOT on panel yet
            // Requirement: "Before starting, an approved SEC member sees only a minimal card:
            // startup name, grant tier and submitted date, and a Start button.
            // A fourth member gets a clear message 'The panel for this application is complete'."
            return (
              <Card key={app.id} className="bg-gray-50/60 border-dashed">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-base text-gray-900">
                          {app.startup.teamName}
                        </h3>
                        <span className="text-xs font-medium text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded">
                          Grant Tier: {app.grantType || 'N/A'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Submitted: {app.submittedAt ? formatDate(app.submittedAt) : 'N/A'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {isPanelFull ? (
                        <div className="px-3 py-1.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-semibold flex items-center gap-1.5">
                          <span>The panel for this application is complete</span>
                        </div>
                      ) : (
                        <StartAssessmentButton applicationId={app.id} />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
