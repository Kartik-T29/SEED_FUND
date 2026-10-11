import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { listApplications } from '@/lib/access';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect('/login');

  const applications = await listApplications(session as any);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      <div className="grid gap-6">
        {applications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No applications in the system.
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
  );
}
