import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getApplication } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { Logo } from '@/components/brand/Logo';
import {
  LEVELS,
  EXPERIMENT_QUESTIONS,
  BUDGET_HEADERS,
  TRACK_LABELS,
} from '@/lib/seedfund-constants';
import { formatISTDate, formatISTDateTime } from '@/lib/dates';
import Link from 'next/link';
import PrintButton from '@/components/ui/PrintButton';

export const dynamic = 'force-dynamic';

export default async function PrintableFormA({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== 'SEC_MEMBER' && session.role !== 'ADMIN')) {
    redirect('/login');
  }

  const { id } = await Promise.resolve(params);
  const app = await getApplication(session as any, id);

  // Fetch all assessments for this application
  const assessments = await prisma.assessment.findMany({
    where: { applicationId: id },
    include: {
      member: {
        select: { id: true, name: true, designation: true, department: true },
      },
    },
  });

  // Fetch milestone edit logs for the correction audit trail
  const editLogs = app.milestone
    ? await prisma.milestoneEditLog.findMany({
        where: { milestoneId: app.milestone.id },
        orderBy: { at: 'asc' },
      })
    : [];

  // Fetch approved SEC members to ensure names come dynamically from profiles (P3)
  const secProfiles = await prisma.user.findMany({
    where: { role: 'SEC_MEMBER', approvalStatus: 'APPROVED' },
    select: { id: true, name: true, designation: true, department: true },
    take: 3,
  });

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8 max-w-5xl mx-auto font-sans">
      {/* Print action controls (hidden when printing) */}
      <div className="no-print mb-6 p-4 bg-gray-50 border rounded-lg flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Form A Printable Document Preview (Optimized for A4 Print / PDF Export)
        </span>
        <div className="flex items-center gap-3">
          <Link
            href={`/sec/${id}`}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border rounded hover:bg-gray-100"
          >
            ← Back to Evaluation Form
          </Link>
          <PrintButton label="Print Form A PDF" />
        </div>
      </div>

      {/* Official Form Header */}
      <div className="border-b-2 border-black pb-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <Logo size="lg" className="h-14 w-auto" />
          <div className="text-right">
            <h1 className="text-xl font-bold uppercase tracking-tight">Form A: SEC Assessment & Recommendation</h1>
            <p className="text-xs text-gray-600 font-semibold mt-0.5">
              Startup Evaluation Committee (SEC) — Innovation Fund
            </p>
            <p className="text-[11px] text-gray-500">IDEAPAD, ITM University Gwalior</p>
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
            <span className="text-gray-500 block">Enrollment No & Dept:</span>
            <span className="text-gray-900 font-medium">
              {app.startup.enrollmentNo} ({app.startup.program} {app.startup.department ? `· ${app.startup.department}` : ''})
            </span>
          </div>
          <div>
            <span className="text-gray-500 block">Assessment Date:</span>
            <span className="text-gray-900 font-medium">
              {formatISTDate(new Date())}
            </span>
          </div>
        </div>
      </div>

      {/* 1. Status Assessment (TRL, MRL, IRL) */}
      <section className="mb-6">
        <h2 className="text-sm font-bold uppercase border-b border-gray-400 pb-1 mb-2">
          1. Current Status Assessment from Idea Pitch (TRL, MRL, IRL)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-collapse border-black">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-black p-2 text-left">Readiness Scale</th>
                {assessments.map((a, i) => (
                  <th key={a.id} className="border border-black p-2 text-center">
                    Member {i + 1}: {a.member.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2 font-semibold">Technology Readiness (TRL 1–9)</td>
                {assessments.map((a) => {
                  const trl = (a.statusForm as any)?.trl || '—';
                  const desc = typeof trl === 'number' && trl > 0 ? LEVELS.TRL[trl - 1] : '';
                  return (
                    <td key={a.id} className="border border-black p-2 text-center">
                      <strong>TRL {trl}</strong> {desc && <span className="block text-[10px] text-gray-600">{desc}</span>}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold">Manufacturing Readiness (MRL 1–9)</td>
                {assessments.map((a) => {
                  const mrl = (a.statusForm as any)?.mrl || '—';
                  const desc = typeof mrl === 'number' && mrl > 0 ? LEVELS.MRL[mrl - 1] : '';
                  return (
                    <td key={a.id} className="border border-black p-2 text-center">
                      <strong>MRL {mrl}</strong> {desc && <span className="block text-[10px] text-gray-600">{desc}</span>}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold">Integration Readiness (IRL 1–9)</td>
                {assessments.map((a) => {
                  const irl = (a.statusForm as any)?.irl || '—';
                  const desc = typeof irl === 'number' && irl > 0 ? LEVELS.IRL[irl - 1] : '';
                  return (
                    <td key={a.id} className="border border-black p-2 text-center">
                      <strong>IRL {irl}</strong> {desc && <span className="block text-[10px] text-gray-600">{desc}</span>}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Milestone Assessment (Shared Form) */}
      <section className="mb-6">
        <h2 className="text-sm font-bold uppercase border-b border-gray-400 pb-1 mb-2">
          2. Milestone Assessment (Shared Committee Assessment)
        </h2>
        <div className="text-xs mb-2">
          <strong>Milestone Track:</strong>{' '}
          {app.milestone
            ? TRACK_LABELS[app.milestone.track as 'PROTOTYPING' | 'PROFESSIONAL'] || app.milestone.track
            : 'Pending'}
        </div>
        {app.milestone ? (
          <table className="w-full text-xs border border-collapse border-black mb-3">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-black p-1.5 text-center w-10">S.No</th>
                <th className="border border-black p-1.5 text-left">Milestone Description</th>
                <th className="border border-black p-1.5 text-center w-28">Status</th>
                <th className="border border-black p-1.5 text-left">Remarks & Observations</th>
              </tr>
            </thead>
            <tbody>
              {app.milestone.items.map((item: any, i: number) => (
                <tr key={item.id}>
                  <td className="border border-black p-1.5 text-center">{i + 1}</td>
                  <td className="border border-black p-1.5 font-medium">{item.name}</td>
                  <td className="border border-black p-1.5 text-center font-bold">{item.state}</td>
                  <td className="border border-black p-1.5 text-gray-700">
                    {item.ownerRemark || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs italic text-gray-500 mb-3">Shared milestones not yet completed.</p>
        )}

        {/* Edit & Correction Audit Trail (Policy requirement for signed corrections) */}
        {editLogs.length > 0 && (
          <div className="p-3 bg-gray-50 border border-black text-[11px] space-y-1">
            <strong>Milestone Form Correction & Audit Log (Policy Signed Requirement):</strong>
            <ul className="list-disc pl-5 text-gray-700">
              {editLogs.map((log: any, idx: number) => (
                <li key={idx}>
                  {formatISTDateTime(log.at)}: Field {log.field} changed from "{log.oldValue || 'none'}" to "{log.newValue}"
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 3. TRL 2/TRL 3 Experiment Assessment (12 Questions) */}
      <section className="mb-6 page-break">
        <h2 className="text-sm font-bold uppercase border-b border-gray-400 pb-1 mb-2">
          3. TRL 2 / TRL 3 Experiment Assessment (12 Evaluation Questions)
        </h2>
        <table className="w-full text-xs border border-collapse border-black">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-black p-1.5 text-center w-10">#</th>
              <th className="border border-black p-1.5 text-left">Evaluation Question</th>
              {assessments.map((a, i) => (
                <th key={a.id} className="border border-black p-1.5 text-center w-24">
                  M{i + 1} Vote
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EXPERIMENT_QUESTIONS.map((q) => (
              <tr key={q.id}>
                <td className="border border-black p-1.5 text-center font-semibold">{q.num}</td>
                <td className="border border-black p-1.5">
                  <span className="text-[10px] text-gray-500 block uppercase font-bold">{q.category}</span>
                  {q.text}
                </td>
                {assessments.map((a) => {
                  const ans = (a.experimentForm as any)?.questions?.[q.id];
                  const text = ans === true ? 'YES' : ans === false ? 'NO' : '—';
                  const color = ans === true ? 'text-green-800' : ans === false ? 'text-red-800' : '';
                  return (
                    <td key={a.id} className={`border border-black p-1.5 text-center font-bold ${color}`}>
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Member Notes on Questions */}
        <div className="mt-3 space-y-2">
          {assessments.map((a, i) => (
            <div key={a.id} className="p-2 border border-gray-300 text-xs bg-gray-50">
              <strong>Member {i + 1} ({a.member.name}) Question Notes:</strong>
              <p className="italic mt-0.5 whitespace-pre-wrap">
                {(a.experimentForm as any)?.questionNotes || 'No specific question notes recorded.'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Recommendation Notes */}
      <section className="mb-6">
        <h2 className="text-sm font-bold uppercase border-b border-gray-400 pb-1 mb-2">
          4. Member Recommendation Notes
        </h2>
        <div className="space-y-2 text-xs">
          {assessments.map((a, i) => (
            <div key={a.id} className="p-3 border border-black bg-white space-y-1">
              <strong>
                Member {i + 1}: {a.member.name} ({a.member.designation || 'Panelist'})
              </strong>
              <p className="whitespace-pre-wrap text-gray-800">
                {(a.experimentForm as any)?.recommendationNote || 'No recommendation note entered.'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Grant Evaluation & 6. Suggested Budgets under 9 Headers */}
      <section className="mb-6">
        <h2 className="text-sm font-bold uppercase border-b border-gray-400 pb-1 mb-2">
          5 & 6. Grant Category Evaluation & Suggested Budget Moderation
        </h2>
        <table className="w-full text-xs border border-collapse border-black">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-black p-2 text-left">Grant Header / Evaluation</th>
              {assessments.map((a, i) => (
                <th key={a.id} className="border border-black p-2 text-center">
                  Member {i + 1}: {a.member.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-gray-50 font-bold">
              <td className="border border-black p-2">Recommended Grant Category</td>
              {assessments.map((a) => (
                <td key={a.id} className="border border-black p-2 text-center text-brand-primary">
                  {(a.experimentForm as any)?.grantEvaluation || 'Pending'}
                </td>
              ))}
            </tr>
            {BUDGET_HEADERS.map((h, idx) => (
              <tr key={h.key}>
                <td className="border border-black p-1.5 font-medium">
                  {idx + 1}. {h.name}
                </td>
                {assessments.map((a) => {
                  const val = (a.experimentForm as any)?.suggestedAmounts?.[h.key] ?? 0;
                  return (
                    <td key={a.id} className="border border-black p-1.5 text-right font-mono">
                      ₹{Number(val).toLocaleString('en-IN')}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-gray-100 font-bold">
              <td className="border border-black p-2">Suggested Total Amount (₹)</td>
              {assessments.map((a) => {
                const total = (a.experimentForm as any)?.suggestedTotal ?? 0;
                return (
                  <td key={a.id} className="border border-black p-2 text-right font-mono text-sm">
                    ₹{Number(total).toLocaleString('en-IN')}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </section>

      {/* 7. Assessed By (3 SEC Signatures with Names & Designations from Profiles) */}
      <section className="mt-10 pt-4 border-t-2 border-black">
        <h2 className="text-xs font-bold uppercase tracking-wider mb-6">
          7. Assessed By — Startup Evaluation Committee (SEC Members):
        </h2>
        <div className="grid grid-cols-3 gap-6 text-center text-xs">
          {secProfiles.map((sec) => (
            <div key={sec.id} className="space-y-1">
              <div className="h-14 border-b border-black mb-2" />
              <strong className="block text-sm font-bold text-gray-900">{sec.name}</strong>
              <span className="block text-gray-700">{sec.designation || 'SEC Panel Member'}</span>
              <span className="block text-gray-500 text-[11px]">{sec.department || 'ITM University'}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
