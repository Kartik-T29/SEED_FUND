import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { buildFormBData, canonicalizeFormBData } from '@/lib/form-b-data';
import { logFormPrintAudit } from '@/lib/access';
import { Logo } from '@/components/brand/Logo';
import PrintButton from '@/components/ui/PrintButton';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PrintableFormB({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    redirect('/login');
  }

  const { id } = await Promise.resolve(params);

  const data = await buildFormBData(id, session as any);
  const { shortHash } = canonicalizeFormBData(data);

  // Server-side audit log for print preview
  await logFormPrintAudit(session as any, 'FORM_B', id, shortHash, false);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-serif p-4 sm:p-8 max-w-5xl mx-auto print:p-0 print:max-w-none text-xs">
      {/* Print & Download Action Controls (Hidden when printing) */}
      <div className="no-print mb-6 p-4 bg-slate-50 border border-slate-300 rounded-lg flex flex-wrap items-center justify-between gap-3 font-sans">
        <div>
          <span className="font-bold text-slate-800 block text-sm">
            Form B Printable View (Admin Grant Sanction Document)
          </span>
          <span className="text-xs text-slate-600">
            {data.isFinal ? (
              <span className="text-green-700 font-semibold">Status: FINAL (Sanction Decision Recorded)</span>
            ) : (
              <span className="text-amber-700 font-semibold">Status: DRAFT (Pending Administrative Sanction Order)</span>
            )}
            {' · '}
            Canonical Hash: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">{shortHash}</code>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/application/${id}`}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
          >
            ← Back to Admin View
          </Link>
          <a
            href={`/admin/application/${id}/pdf`}
            download
            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 rounded hover:bg-slate-900 shadow-sm"
          >
            Download Form B PDF
          </a>
          <PrintButton label="Print Form B" />
        </div>
      </div>

      {/* Watermark Banner for Draft */}
      {!data.isFinal && (
        <div className="mb-4 p-3 bg-red-50 border-2 border-dashed border-red-400 text-red-800 text-center font-bold font-sans tracking-wide">
          DRAFT - NOT FOR SIGNATURE
          <div className="text-xs font-normal mt-0.5">
            This sanction document is provisional and will become final upon recording of the administrative sanction decision.
          </div>
        </div>
      )}

      {/* Official Form Header */}
      <div className="border-b-2 border-black pb-3 mb-4">
        <div className="flex items-start justify-between gap-4">
          <Logo size="lg" className="h-14 w-auto" />
          <div className="text-right">
            <h1 className="text-base font-bold uppercase tracking-tight text-black">
              FORM B : Grant Evaluation Report
            </h1>
            <p className="text-xs font-semibold text-gray-800 mt-0.5">
              by Startup Evaluation Committee ( SEC)
            </p>
            <p className="text-[11px] text-gray-600">( to be filled in by IDEAPAD )</p>
          </div>
        </div>

        {/* Word Template Meta Table: 2 columns */}
        <table className="w-full mt-3 border border-collapse border-black text-xs">
          <tbody>
            <tr>
              <td className="border border-black p-1.5 font-bold w-1/3 bg-slate-50">
                Name of applicant/team/startup
              </td>
              <td className="border border-black p-1.5 font-bold">
                {data.startup.teamName}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 font-bold bg-slate-50">
                Assessment date
              </td>
              <td className="border border-black p-1.5">
                {data.sanctionDateIST}
                <span className="text-[11px] text-gray-600 ml-2">
                  (Applicant: {data.startup.applicantName} · Enrollment: {data.startup.enrollmentNo} · {data.startup.programAndDept})
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Grant Decision Table */}
      <section className="mb-6">
        <table className="w-full text-xs border border-collapse border-black">
          <thead>
            <tr className="bg-slate-100 border-b border-black">
              <th className="border border-black p-1.5 text-left font-bold w-2/3">Type of grant</th>
              <th className="border border-black p-1.5 text-center font-bold w-1/3">Approved grant</th>
            </tr>
          </thead>
          <tbody>
            {data.grantEvaluation.rows.map((row) => (
              <tr key={row.key} className="border-b border-black">
                <td className="border border-black p-1.5 font-medium">{row.label}</td>
                <td className="border border-black p-1.5 text-center font-bold text-green-800">
                  {row.approved}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Grant approved for various headers : */}
      <section className="mb-6">
        <h2 className="text-sm font-bold border-b border-black pb-1 mb-2">
          Grant approved for various headers :
        </h2>
        <table className="w-full text-xs border border-collapse border-black">
          <thead>
            <tr className="bg-slate-100 border-b border-black">
              <th className="border border-black p-1.5 text-left font-bold w-2/3">Grant approved for</th>
              <th className="border border-black p-1.5 text-right font-bold w-1/3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.sanctionedBudget.headers.map((h) => (
              <tr key={h.key} className="border-b border-black">
                <td className="border border-black p-1.5 font-medium">{h.name}</td>
                <td className="border border-black p-1.5 text-right font-mono">{h.amount}</td>
              </tr>
            ))}
            <tr className="bg-slate-100 font-bold border-t-2 border-black">
              <td className="border border-black p-1.5">total :</td>
              <td className="border border-black p-1.5 text-right font-mono text-sm">
                {data.sanctionedBudget.totalAmount}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Range warning note ONLY if total is outside tier range */}
        {data.sanctionedBudget.rangeNotice && (
          <p className="mt-2 text-[11px] text-amber-800 font-medium italic">
            {data.sanctionedBudget.rangeNotice}
          </p>
        )}
      </section>

      {/* Approved timeline : */}
      <section className="mb-6">
        <h2 className="text-sm font-bold border-b border-black pb-1 mb-2">
          Approved timeline :
        </h2>
        <table className="w-full text-xs border border-collapse border-black">
          <thead>
            <tr className="bg-slate-100 border-b border-black">
              <th className="border border-black p-1.5 text-left font-bold w-[28%]">date type</th>
              <th className="border border-black p-1.5 text-left font-bold w-[47%]">description</th>
              <th className="border border-black p-1.5 text-center font-bold w-[25%]">calander dates</th>
            </tr>
          </thead>
          <tbody>
            {data.timeline.map((t) => (
              <tr key={t.key} className="border-b border-black">
                <td className="border border-black p-1.5 font-bold align-top">{t.label}</td>
                <td className="border border-black p-1.5 text-gray-700 align-top text-[11px] leading-tight">
                  {t.description}
                </td>
                <td className="border border-black p-1.5 text-center font-bold align-top">
                  {t.dateIST}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Final Recommendation Note from SEC : */}
      <section className="mb-6">
        <h2 className="text-sm font-bold border-b border-black pb-1 mb-2">
          Final Recommendation Note from SEC :
        </h2>
        <div className="p-3 border border-black bg-slate-50 text-[11px] leading-relaxed text-gray-800">
          {data.secRecommendationNote}
        </div>
      </section>

      {/* Terms and conditions : (Policy P10 exact text) */}
      <section className="mb-6">
        <h2 className="text-sm font-bold border-b border-black pb-1 mb-2">
          Terms and conditions :
        </h2>
        <ul className="list-disc pl-5 space-y-1 text-xs text-gray-800 mb-2">
          {data.termsAndConditions.map((tc, idx) => (
            <li key={idx}>{tc}</li>
          ))}
        </ul>
        <p className="text-[11px] font-bold text-gray-700 italic">
          {data.acknowledgement}
        </p>
      </section>

      {/* Approved By: (Signatories from settings in specified order) */}
      <section className="mt-8 pt-4 border-t-2 border-black">
        <h2 className="text-sm font-bold uppercase mb-4">Approved By:</h2>
        <div className="grid grid-cols-3 gap-6">
          {data.approvalBlock.map((sig) => (
            <div key={sig.key} className="border border-black p-3 text-center">
              <div className="h-10 border-b border-black mb-2 flex items-end justify-center">
                <span className="text-[10px] text-gray-500 italic">Signature & Date</span>
              </div>
              {sig.hasName ? (
                <strong className="block text-xs font-bold text-black">{sig.name}</strong>
              ) : (
                <div className="h-4 border-b border-gray-400 mb-1 mx-4" />
              )}
              <span className="block text-[11px] text-gray-800">{sig.designation}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Running Footer */}
      <div className="mt-8 pt-3 border-t border-black flex items-center justify-between text-[10px] text-gray-600 font-sans">
        <span>Form B: Grant Evaluation Report · App ID: {data.applicationId}</span>
        <span>Generated: {data.generatedAtIST}</span>
        <span>Canonical Hash: <code className="font-mono">{shortHash}</code></span>
      </div>
    </div>
  );
}
