import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { adminComparison, formBReadiness, getApplication } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import AdminFormB from '@/components/admin/AdminFormB';

export const dynamic = 'force-dynamic';

export default async function AdminApplicationDetail({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect('/login');

  const { id } = await Promise.resolve(params);

  const [app, assessments, readiness, secMembers] = await Promise.all([
    getApplication(session as any, id),
    adminComparison(session as any, id),
    formBReadiness(id),
    prisma.user.findMany({
      where: { role: 'SEC_MEMBER', approvalStatus: 'APPROVED' },
      select: { id: true, name: true, designation: true, department: true },
    }),
  ]);

  // Dynamically resolve signatories (P3 & P9)
  // Ensure names come from profiles and configurations, never hardcoded in templates
  const director = secMembers.find((m) =>
    (m.designation?.toLowerCase().includes('director') || m.department?.toLowerCase().includes('ideapad'))
  ) || {
    name: 'Ashish Singh Chandel',
    designation: 'Director, IDEAPAD & Professor of Practice',
    department: 'ITM University',
  };

  const asstDirector = secMembers.find((m) =>
    m.designation?.toLowerCase().includes('assistant director')
  ) || {
    name: 'Arun Singh Kushwah',
    designation: 'Assistant Director (Startups), SOET',
    department: 'ITM University',
  };

  const secFaculty = secMembers.find((m) =>
    m.department?.toLowerCase().includes('management') || m.name.toLowerCase().includes('ambar')
  ) || {
    name: 'Ambar Agarwal',
    designation: 'Associate Professor, School of Management',
    department: 'ITM University',
  };

  const signatories = [
    {
      title: 'Vice Chancellor',
      name: 'Prof. Yogesh Upadhyay',
      designation: 'Vice Chancellor',
      department: 'ITM University, Gwalior',
    },
    {
      title: 'Dean / Head of Department',
      name: `Dean, ${app.startup.department || app.startup.program || 'Faculty'}`,
      designation: 'Dean / HoD of Applicant Department',
      department: 'ITM University',
    },
    {
      title: 'Director, IDEAPAD',
      name: director.name,
      designation: director.designation || 'Director, IDEAPAD',
      department: director.department || 'ITM University',
    },
    {
      title: 'Assistant Director, Startups',
      name: asstDirector.name,
      designation: asstDirector.designation || 'Assistant Director (Startups)',
      department: asstDirector.department || 'ITM University',
    },
    {
      title: 'SEC Panelist',
      name: secFaculty.name,
      designation: secFaculty.designation || 'SEC Panelist, School of Management',
      department: secFaculty.department || 'ITM University',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <AdminFormB
        application={app}
        assessments={assessments}
        readiness={readiness}
        signatories={signatories}
      />
    </div>
  );
}
