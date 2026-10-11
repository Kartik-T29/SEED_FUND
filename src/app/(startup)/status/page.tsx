import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Timeline } from '@/components/ui/timeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { startupStatusView, isStatusUnlocked, listApplications } from '@/lib/access';
import { ArrowLeft, FileText } from 'lucide-react';

export default async function StatusPage({
  searchParams,
}: {
  searchParams?: Promise<{ id?: string }> | { id?: string };
}) {
  const session = await getSession();
  if (!session || session.role !== 'STARTUP') redirect('/login');

  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : {};
  const targetId = resolvedParams?.id;

  const unlocked = await isStatusUnlocked(session.userId);

  if (!unlocked) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Locked</h1>
        <p className="text-gray-500 mb-6">
          You must submit your seed fund application before you can view its status.
        </p>
        <Link href="/dashboard/apply">
          <Button>Go to Application</Button>
        </Link>
      </div>
    );
  }

  // Get applications
  const apps = await listApplications({ userId: session.userId, role: session.role });
  const submittedApps = apps.filter((a: any) => a.status !== 'DRAFT');

  if (submittedApps.length === 0) {
    redirect('/dashboard');
  }

  // Find target or default to latest submitted
  const currentApp = targetId
    ? submittedApps.find((a: any) => a.id === targetId) || submittedApps[0]
    : submittedApps[0];

  const statusView = await startupStatusView({ userId: session.userId, role: session.role }, currentApp.id);

  const items = [
    {
      title: 'Application Submitted',
      description: 'Your application has been received and verified.',
      status: 'completed' as const,
      date: statusView.submittedAt ? new Date(statusView.submittedAt).toLocaleDateString() : undefined,
    },
    {
      title: 'Under SEC Review',
      description: `The Startup Evaluation Committee is reviewing your application. Assessments submitted: ${statusView.assessedCount}`,
      status: (statusView.status === 'SUBMITTED' || statusView.status === 'IN_REVIEW' ? 'current' : 'completed') as 'current' | 'completed' | 'pending',
    },
    {
      title: 'Final Decision',
      description: statusView.decision
        ? statusView.status === 'APPROVED'
          ? `Approved: ₹${Number(statusView.decision.approvedTotal).toLocaleString('en-IN')}`
          : statusView.status === 'REJECTED'
          ? 'Application Rejected by panel'
          : 'Re-presentation Requested'
        : 'Awaiting final decision from Admin & Evaluation Committee.',
      status: (statusView.decision ? 'completed' : 'pending') as 'current' | 'completed' | 'pending',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Application Status</h1>
        </div>
        <Link href={`/dashboard/apply?id=${currentApp.id}`}>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" /> View Full Form
          </Button>
        </Link>
      </div>

      {/* Multiple Applications Selector */}
      {submittedApps.length > 1 && (
        <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Select Application ({submittedApps.length} Submitted)
          </p>
          <div className="flex flex-wrap gap-2">
            {submittedApps.map((a: any) => {
              const isSelected = a.id === currentApp.id;
              return (
                <Link
                  key={a.id}
                  href={`/status?id=${a.id}`}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2 ${
                    isSelected
                      ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span>{a.grantType || 'Grant'} (v{a.version})</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {a.status}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Application Info */}
      <div className="mb-6 flex items-center gap-3">
        <Badge
          variant={
            statusView.status === 'SUBMITTED'
              ? 'warning'
              : statusView.status === 'IN_REVIEW'
              ? 'info'
              : statusView.status === 'APPROVED'
              ? 'success'
              : statusView.status === 'REJECTED'
              ? 'danger'
              : 'default'
          }
        >
          {statusView.status}
        </Badge>
        <span className="text-sm text-gray-500">
          ID: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{currentApp.id}</code>
        </span>
        {currentApp.grantType && (
          <span className="text-sm font-medium text-gray-700">
            • {currentApp.grantType} Grant (v{currentApp.version})
          </span>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evaluation Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline items={items} />
        </CardContent>
      </Card>
    </div>
  );
}
