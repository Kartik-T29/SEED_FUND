import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getApplication } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { Logo } from '@/components/brand/Logo';
import {
  BUDGET_HEADERS,
  FORM_B_TIMELINE_FIELDS,
  POLICY_TERMS_AND_CONDITIONS,
} from '@/lib/seedfund-constants';
import { formatDateOnly, formatISTDate } from '@/lib/dates';
import Link from 'next/link';
import PrintButton from '@/components/ui/PrintButton';

export const dynamic = 'force-dynamic';

export default async function PrintableFormB({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect('/login');

  const { id } = await Promise.resolve(params);
  const app = await getApplication(session as any, id);

  const evaluation: any = (app as any).evaluation || {};
  const amounts = evaluation.amounts || {};
  const timeline = evaluation.timeline || {};

  // Fetch approved SEC profiles to dynamically render signatories (P3 & P9)
  const secMembers = await prisma.user.findMany({
    where: { role: 'SEC_MEMBER', approvalStatus: 'APPROVED' },
    select: { id: true, name: true, designation: true, department: true },
  });

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
      designation: 'Vice Chancellor, ITM University, Gwalior',
    },
    {
      title: 'Dean / Head of Department',
      name: `Dean / HoD, ${app.startup.department || app.startup.program || 'Faculty'}`,
      designation: "Dean / HoD of Applicant's School / Department",
    },
    {
      title: 'Director, IDEAPAD',
      name: director.name,
      designation: director.designation || 'Director, IDEAPAD',
    },
    {
      title: 'Assistant Director, Startups',
      name: asstDirector.name,
      designation: asstDirector.designation || 'Assistant Director (Startups)',
    },
    {
      title: 'SEC Member',
      name: secFaculty.name,
      designation: secFaculty.designation || 'SEC Member, School of Management',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8 max-w-5xl mx-auto font-sans">
      {/* Print Controls (hidden when printing) */}
      <div className="no-print mb-6 p-4 bg-gray-50 border rounded-lg flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Form B Printable Sanction Document (Optimized for A4 Print / PDF Export)
        </span>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/application/${id}`}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border rounded hover:bg-gray-100"
          >
            ← Back to Admin View
          </Link>
          <PrintButton label="Print Form B PDF" />
        </div>
      </div>

      {/* Official Form Header */}
      <div className="border-b-2 border-black pb-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <Logo size="lg" className="h-14 w-auto" />
          <div className="text-right">
            <h1 className="text-xl font-bold uppercase tracking-tight">FORM B: Grant Evaluation Report</h1>
            <p className="text-xs text-gray-600 font-semibold mt-0.5">
              Startup Evaluation Committee (SEC) — Innovation Fund
            </p>
            <p className="text-[11px] text-gray-500">(To be filled in by IDEAPAD)</p>
          </div>
        </div>

        {/* Applicant Meta Box */}
        <div className="mt-4 pt-3 border-t grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-gray-500 block">Startup / Project Name:</span>
            <strong className="text-sm font-bold text-gray-900">{app.startup.teamName}</strong>
          </div>
          <div>
            <span className="text-gray-500 block">Applicant (Team Leader):</span>
            <strong className="text-gray-900">{app.startup.user?.name || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-gray-500 block">Enrollment & Program:</span>
            <span className="text-gray-900 font-medium">
              {app.startup.enrollmentNo} ({app.startup.program} {app.startup.department ? `· ${app.startup.department}` : ''})
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Sanction Date:</span>
            <span className="text-gray-900 font-medium">
              {formatISTDate(evaluation.decidedAt || new Date())}
            </span>
          </div>
        </div>
      </div>

      {/* Grant Decision Banner */}
      <div className="p-3 mb-6 bg-gray-100 border border-black flex items-center justify-between text-xs">
        <div>
          <span className="text-gray-600 block uppercase font-bold text-[10px]">Approved Grant Category</span>
          <strong className="text-base text-gray-900">{evaluation.decision || app.grantType || 'Pending'}</strong>
        </div>
        <div className="text-right">
          <span className="text-gray-600 block uppercase font-bold text-[10px]">Total Sanctioned Amount</span>
          <strong className="text-lg text-brand-primary font-mono">
            ₹{Number(evaluation.approvedTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </strong>
        </div>
      </div>

      {/* Approved Budget Table under 9 Headers */}
      <section className="mb-6">
        <h2 className="text-sm font-bold uppercase border-b border-gray-400 pb-1 mb-2">
          Grant Approved for Various Headers (Annexure 1)
        </h2>
        <table className="w-full text-xs border border-collapse border-black">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-black p-2 text-left w-12">S.No</th>
              <th className="border border-black p-2 text-left">Major Grant Header</th>
              <th className="border border-black p-2 text-right w-44">Approved Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {BUDGET_HEADERS.map((h, idx) => {
              const val = amounts[h.key] ?? 0;
              return (
                <tr key={h.key}>
                  <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                  <td className="border border-black p-1.5 font-medium">{h.name}</td>
                  <td className="border border-black p-1.5 text-right font-mono font-semibold">
                    ₹{Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-gray-100 font-bold">
              <td colSpan={2} className="border border-black p-2 text-right uppercase">
                Grand Total Sanctioned:
              </td>
              <td className="border border-black p-2 text-right font-mono text-sm text-brand-primary">
                ₹{Number(evaluation.approvedTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Approved Timeline (8 Dates) */}
      <section className="mb-6">
        <h2 className="text-sm font-bold uppercase border-b border-gray-400 pb-1 mb-2">
          Approved Milestones & Binding Timeline
        </h2>
        <table className="w-full text-xs border border-collapse border-black">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-black p-2 text-left w-48">Date Type</th>
              <th className="border border-black p-2 text-left">Description</th>
              <th className="border border-black p-2 text-right w-40">Calendar Date</th>
            </tr>
          </thead>
          <tbody>
            {FORM_B_TIMELINE_FIELDS.map((f) => {
              const rawVal = timeline[f.id];
              const displayVal = f.id === 'experimentDuration' ? (rawVal || '4 to 6 months') : formatDateOnly(rawVal);
              return (
                <tr key={f.id}>
                  <td className="border border-black p-2 font-bold">{f.label}</td>
                  <td className="border border-black p-2 text-gray-700">{f.desc}</td>
                  <td className="border border-black p-2 text-right font-medium">{displayVal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Final Recommendation Note from SEC */}
      <section className="mb-6">
        <h2 className="text-sm font-bold uppercase border-b border-gray-400 pb-1 mb-2">
          Final Recommendation Note from SEC
        </h2>
        <div className="p-3 border border-black bg-white text-xs whitespace-pre-wrap text-gray-800 italic">
          {evaluation.note ||
            'The team is working diligently to create product range. Sanction recommended subject to adherence to incubator purchase procedures.'}
        </div>
      </section>

      {/* Terms and Conditions */}
      <section className="mb-8">
        <h2 className="text-sm font-bold uppercase border-b border-gray-400 pb-1 mb-2">
          Terms and Conditions
        </h2>
        <ul className="list-decimal pl-5 text-xs text-gray-800 space-y-1">
          {POLICY_TERMS_AND_CONDITIONS.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </section>

      {/* Approval Block: 5 Signatories */}
      <section className="mt-12 pt-4 border-t-2 border-black page-break">
        <h2 className="text-xs font-bold uppercase tracking-wider mb-8">Approved By:</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-center text-xs">
          {signatories.map((sig, i) => (
            <div key={i} className="space-y-1">
              <div className="h-16 border-b border-black mb-2" />
              <strong className="block text-sm font-bold text-gray-900">{sig.name}</strong>
              <span className="block text-gray-700 leading-tight">{sig.designation}</span>
              <span className="block text-gray-500 text-[11px]">{sig.title}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
