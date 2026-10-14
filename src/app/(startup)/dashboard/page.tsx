import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, FileText, Activity, PlusCircle, ExternalLink, ArrowRight } from 'lucide-react';
import { listApplications, isStatusUnlocked } from '@/lib/access';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function StartupDashboard() {
  const session = await getSession();
  if (!session || session.role !== 'STARTUP') redirect('/login');

  const rawApplications = await listApplications({ userId: session.userId, role: session.role });
  const applications = [...rawApplications].sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const openDraft = applications.find((app: any) => app.status === 'DRAFT');
  const unlocked = await isStatusUnlocked(session.userId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Title and Start New Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Startup Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage seed fund applications, track evaluations, and view panel feedback.
          </p>
        </div>
        <Link href="/dashboard/apply?new=true">
          <Button className="w-full sm:w-auto flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Start New Application
          </Button>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Apply Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-brand-primary rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Seed Fund Application</CardTitle>
                <CardDescription>
                  {openDraft ? 'Draft in progress' : 'Apply for IDEAPAD seed grant'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              {openDraft
                ? `You have an unsubmitted draft application in progress (v${openDraft.version}). You can continue editing or start a fresh application.`
                : 'Complete the 8-step application wizard to request seed funding for your startup experiment. You can apply for another grant even while previous applications are under review.'}
            </p>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-2">
            {openDraft ? (
              <>
                <Link href={`/dashboard/apply?id=${openDraft.id}`} className="w-full sm:flex-1">
                  <Button className="w-full">Continue Draft</Button>
                </Link>
                <Link href="/dashboard/apply?new=true" className="w-full sm:flex-1">
                  <Button variant="outline" className="w-full">
                    + New Draft
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/dashboard/apply?new=true" className="w-full">
                <Button className="w-full">+ Start Application</Button>
              </Link>
            )}
          </CardFooter>
        </Card>

        {/* Status Card */}
        <Card className={`flex flex-col justify-between ${!unlocked ? 'bg-gray-50/50' : ''}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>Track Status</CardTitle>
                  <CardDescription>View SEC review progress</CardDescription>
                </div>
              </div>
              {!unlocked && <Lock className="h-5 w-5 text-gray-400" />}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              {unlocked
                ? 'Monitor the evaluation timeline, reviewer milestones, and final committee decisions across your submitted applications.'
                : 'Review tracking will unlock once your first application is submitted.'}
            </p>
          </CardContent>
          <CardFooter>
            {unlocked ? (
              <Link href="/status" className="w-full">
                <Button variant="secondary" className="w-full text-brand-primary border-brand-primary">
                  View Status Timeline
                </Button>
              </Link>
            ) : (
              <div className="w-full cursor-not-allowed">
                <Button variant="secondary" className="w-full opacity-50 pointer-events-none" disabled>
                  Check Status (Locked)
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Applications List Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">My Applications</h2>
          <span className="text-sm text-gray-500">{applications.length} Total</span>
        </div>

        {applications.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700 font-medium">No applications created yet</p>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Get started by creating your first seed fund grant application.
              </p>
              <Link href="/dashboard/apply?new=true">
                <Button size="sm">Start Application</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {applications.map((app: any) => {
              const isDraft = app.status === 'DRAFT';
              const badgeVariant =
                app.status === 'SUBMITTED'
                  ? 'warning'
                  : app.status === 'IN_REVIEW'
                  ? 'info'
                  : app.status === 'APPROVED'
                  ? 'success'
                  : app.status === 'REJECTED'
                  ? 'danger'
                  : app.status === 'DRAFT'
                  ? 'default'
                  : 'outline';

              return (
                <Card key={app.id} className="hover:border-gray-300 transition-colors">
                  <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {app.grantType ? `${app.grantType} Grant` : 'Grant Application'}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          v{app.version}
                        </span>
                        <Badge variant={badgeVariant}>{app.status.replace('_', ' ')}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                        <span>
                          Requested: <strong className="text-gray-800">₹{Number(app.requestedTotal).toLocaleString('en-IN')}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          {isDraft
                            ? `Created: ${formatDate(app.createdAt)}`
                            : `Submitted: ${app.submittedAt ? formatDate(app.submittedAt) : formatDate(app.createdAt)}`}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-gray-400">ID: {app.id.slice(0, 10)}...</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {isDraft ? (
                        <Link href={`/dashboard/apply?id=${app.id}`}>
                          <Button size="sm">Continue Draft</Button>
                        </Link>
                      ) : (
                        <>
                          <Link href={`/dashboard/apply?id=${app.id}`}>
                            <Button variant="outline" size="sm">
                              View Form
                            </Button>
                          </Link>
                          <Link href={`/status?id=${app.id}`}>
                            <Button variant="secondary" size="sm">
                              Track Status
                            </Button>
                          </Link>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
