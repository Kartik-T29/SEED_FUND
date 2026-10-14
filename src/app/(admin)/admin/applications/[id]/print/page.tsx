import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getApplication } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import FormBPrintClient from './FormBPrintClient';

export const dynamic = 'force-dynamic';

export default async function FormBPrintPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect('/login');

  const { id } = params;

  const [application, evaluation] = await Promise.all([
    getApplication({ userId: session.userId, role: session.role }, id),
    prisma.grantEvaluation.findUnique({
      where: { applicationId: id },
      include: {
        admin: { select: { id: true, name: true, designation: true } },
      },
    }),
  ]);

  if (!evaluation) {
    redirect(`/admin/applications/${id}`);
  }

  return (
    <FormBPrintClient
      application={application}
      evaluation={evaluation}
    />
  );
}
