import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getOrCreateDraft, getStartupApplication } from '@/lib/access';
import ApplicationWizard from './ApplicationWizard';

export const dynamic = 'force-dynamic';

export default async function DashboardApplyPage({
  searchParams,
}: {
  searchParams?: Promise<{ id?: string; new?: string }> | { id?: string; new?: string };
}) {
  const session = await getSession();
  if (!session || session.role !== 'STARTUP') redirect('/login');

  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : {};
  const { id, new: isNew } = resolvedParams || {};

  // If no application ID is pinned in the query string, resolve or create it and redirect immediately.
  // This ensures the application ID is permanently in the URL so that subsequent revalidations
  // and debounced saves always operate on the SAME application draft rather than creating new ones.
  if (!id) {
    if (isNew === 'true') {
      const freshDraft = await getOrCreateDraft({ userId: session.userId, role: session.role }, true);
      redirect(`/dashboard/apply?id=${freshDraft.id}`);
    } else {
      const existing = await getStartupApplication({ userId: session.userId, role: session.role });
      if (existing) {
        redirect(`/dashboard/apply?id=${existing.id}`);
      } else {
        const freshDraft = await getOrCreateDraft({ userId: session.userId, role: session.role }, false);
        redirect(`/dashboard/apply?id=${freshDraft.id}`);
      }
    }
  }

  const application = await getStartupApplication({ userId: session.userId, role: session.role }, id);
  if (!application) redirect('/dashboard');

  return <ApplicationWizard application={application} />;
}
