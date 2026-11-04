import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getApplication, getMyAssessment } from '@/lib/access';
import SecEvaluationForm from '@/components/sec/SecEvaluationForm';

export const dynamic = 'force-dynamic';

export default async function SECApplicationDetail({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'SEC_MEMBER') redirect('/login');

  const { id } = await Promise.resolve(params);
  const app = await getApplication(session as any, id);
  const assessment = await getMyAssessment(session as any, id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <SecEvaluationForm
        application={app}
        initialAssessment={assessment}
        currentUserId={session.userId}
        currentUserName={(session as any).name || (session as any).email || 'SEC Panelist'}
      />
    </div>
  );
}
