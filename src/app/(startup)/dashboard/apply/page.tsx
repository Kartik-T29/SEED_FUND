import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getOrCreateDraft, getStartupApplication } from '@/lib/access';
import ApplicationWizard from './ApplicationWizard';

export default async function DashboardApplyPage({
  searchParams,
}: {
  searchParams?: Promise<{ id?: string; new?: string }> | { id?: string; new?: string };
}) {
  const session = await getSession();
  if (!session || session.role !== 'STARTUP') redirect('/login');

  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : {};
  const { id, new: isNew } = resolvedParams || {};

  let application;
  if (id) {
    application = await getStartupApplication({ userId: session.userId, role: session.role }, id);
    if (!application) redirect('/dashboard');
  } else if (isNew === 'true') {
    application = await getOrCreateDraft({ userId: session.userId, role: session.role }, true);
  } else {
    // Check if open draft or existing application exists
    application = await getStartupApplication({ userId: session.userId, role: session.role });
    if (!application) {
      application = await getOrCreateDraft({ userId: session.userId, role: session.role }, false);
    }
  }

  return <ApplicationWizard application={application} />;
}
