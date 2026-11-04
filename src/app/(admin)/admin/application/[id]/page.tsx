import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { adminComparison, formBReadiness, getApplication } from '@/lib/access';
import { getSignatories } from '@/lib/signatories';
import AdminFormB from '@/components/admin/AdminFormB';
import AdminPanelAndSignatories from '@/components/admin/AdminPanelAndSignatories';

export const dynamic = 'force-dynamic';

export default async function AdminApplicationDetail({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect('/login');

  const { id } = await Promise.resolve(params);

  const [app, assessments, readiness, signatories] = await Promise.all([
    getApplication(session as any, id),
    adminComparison(session as any, id),
    formBReadiness(id),
    getSignatories(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Panel Members & Signatories Management */}
      <AdminPanelAndSignatories
        applicationId={app.id}
        panelMembers={app.panelMembers || []}
        assessments={assessments || []}
        signatories={signatories}
      />

      {/* Admin Form B Evaluation & Sanction View */}
      <AdminFormB
        application={app}
        assessments={assessments}
        readiness={readiness}
        signatories={signatories}
      />
    </div>
  );
}
