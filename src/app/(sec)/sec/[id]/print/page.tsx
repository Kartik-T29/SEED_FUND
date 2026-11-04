import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { buildFormAData, canonicalizeFormAData } from '@/lib/form-a-data';
import { logFormPrintAudit } from '@/lib/access';
import { Logo } from '@/components/brand/Logo';
import PrintButton from '@/components/ui/PrintButton';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function PrintableFormA({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== 'SEC_MEMBER' && session.role !== 'ADMIN')) {
    redirect('/login');
  }

  const { id } = await Promise.resolve(params);

  let data;
  try {
    data = await buildFormAData(id, session as any);
  } catch (err: any) {
    if (err.message === 'NOT_A_PANEL_MEMBER') {
      return (
        <div className="max-w-lg mx-auto mt-20 p-6 bg-red-50 border border-red-200 rounded-lg text-center font-sans">
          <h2 className="text-lg font-bold text-red-900 mb-2">Access Denied</h2>
          <p className="text-sm text-red-700 mb-4">
            You are not an assigned member of the 3-expert evaluation panel for this application. Form A is accessible only to the 3 panel members and administrators.
          </p>
          <Link href="/sec" className="inline-block px-4 py-2 bg-red-800 text-white text-xs font-semibold rounded">
            Return to SEC Dashboard
          </Link>
        </div>
      );
    }
    throw err;
  }

  const { shortHash } = canonicalizeFormAData(data);

  // Server-side audit log for print preview
  await logFormPrintAudit(session as any, 'FORM_A', id, shortHash, false);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-serif p-4 sm:p-8 max-w-5xl mx-auto print:p-0 print:max-w-none text-xs">
      {/* Print & Download Action Bar (Hidden when printing) */}
      <div className="no-print mb-6 p-4 bg-slate-50 border border-slate-300 rounded-lg flex flex-wrap items-center justify-between gap-3 font-sans">
        <div>
          <span className="font-bold text-slate-800 block text-sm">
            Form A Printable View (Word Template Faithful)
          </span>
          <span className="text-xs text-slate-600">
            {data.isFinal ? (
              <span className="text-green-700 font-semibold">Status: FINAL (All 3 Panel Members Submitted)</span>
            ) : (
              <span className="text-red-700 font-semibold">
                Status: DRAFT (Pending: {data.unsubmittedList.join(', ') || 'panel assignment'})
              </span>
            )}
            {' · '}
            Canonical Hash: <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">{shortHash}</code>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/sec/${id}`}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
          >
            ← Evaluation Form
          </Link>
          <a
            href={`/sec/${id}/pdf`}
            download
            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 rounded hover:bg-slate-900 shadow-sm"
          >
            Download Form A PDF
          </a>
          <PrintButton label="Print Form A" />
        </div>
      </div>

      {/* Watermark Notice for On-Screen Draft */}
      {!data.isFinal && (
        <div className="mb-4 p-3 bg-red-50 border-2 border-dashed border-red-400 text-red-800 text-center font-bold font-sans tracking-wide">
          DRAFT - NOT FOR SIGNATURE
          <div className="text-xs font-normal mt-0.5">
            {data.unstartedList.length > 0 && `Unstarted Slots: ${data.unstartedList.join(', ')}. `}
            {data.unsubmittedList.length > 0 && `Pending Submissions: ${data.unsubmittedList.join(', ')}.`}
          </div>
        </div>
      )}

      {/* Official Header */}
      <div className="border-b-2 border-black pb-3 mb-4">
        <div className="flex items-start justify-between gap-4">
          <Logo size="lg" className="h-14 w-auto" />
          <div className="text-right">
            <h1 className="text-base font-bold uppercase tracking-tight text-black">
              FORM A : SEC Startup Assessment and recommendation
            </h1>
            <p className="text-[11px] text-gray-700 italic mt-0.5">
              (SEC members are requested to fill this form online, when all members have provided the data, the form will be printed for approval signatures)
            </p>
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
                {data.assessmentDateIST}
                <span className="text-[11px] text-gray-600 ml-2">
                  (Applicant: {data.startup.applicantName} · Enrollment: {data.startup.enrollmentNo} · {data.startup.programAndDept})
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SECTION 1: Current Status assessment based on idea pitch : */}
      <section className="mb-6">
        <h2 className="text-sm font-bold border-b border-black pb-1 mb-2">
          1. Current Status assessment based on idea pitch :
        </h2>
        <div className="overflow-x-auto">
          {/* 3 scale blocks side by side: TRL, MRL, IRL */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-black">
            {/* TRL Block */}
            <div className="border-r border-black last:border-r-0">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-black">
                    <th className="border-r border-black p-1 text-left font-bold w-[40%]">TRL</th>
                    <th className="border-r border-black p-1 text-center font-bold text-[10px]" colSpan={3}>
                      SEC MEMBER NAME : 1.
                      <div className="text-[9px] font-normal font-sans">
                        1: {data.panelMembers[0].name.split(' ')[0]} | 2: {data.panelMembers[1].name.split(' ')[0]} | 3: {data.panelMembers[2].name.split(' ')[0]}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.statusAssessment.trl.map((lvl) => (
                    <tr key={lvl.level} className="border-b border-black last:border-b-0">
                      <td className="border-r border-black p-1 text-[10px] leading-tight font-medium">
                        {lvl.label}
                      </td>
                      {lvl.achieved.map((ach, mIdx) => (
                        <td key={mIdx} className="border-r border-black last:border-r-0 p-1 text-center text-[10px] font-bold w-[20%]">
                          {ach ? 'achieved' : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MRL Block */}
            <div className="border-r border-black last:border-r-0">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-black">
                    <th className="border-r border-black p-1 text-left font-bold w-[40%]">MRL</th>
                    <th className="border-r border-black p-1 text-center font-bold text-[10px]" colSpan={3}>
                      SEC MEMBER NAME : 2.
                      <div className="text-[9px] font-normal font-sans">
                        1: {data.panelMembers[0].name.split(' ')[0]} | 2: {data.panelMembers[1].name.split(' ')[0]} | 3: {data.panelMembers[2].name.split(' ')[0]}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.statusAssessment.mrl.map((lvl) => (
                    <tr key={lvl.level} className="border-b border-black last:border-b-0">
                      <td className="border-r border-black p-1 text-[10px] leading-tight font-medium">
                        {lvl.label}
                      </td>
                      {lvl.achieved.map((ach, mIdx) => (
                        <td key={mIdx} className="border-r border-black last:border-r-0 p-1 text-center text-[10px] font-bold w-[20%]">
                          {ach ? 'achieved' : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* IRL Block */}
            <div>
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-black">
                    <th className="border-r border-black p-1 text-left font-bold w-[40%]">IRL</th>
                    <th className="border-r border-black p-1 text-center font-bold text-[10px]" colSpan={3}>
                      SEC MEMBER NAME : 3.
                      <div className="text-[9px] font-normal font-sans">
                        1: {data.panelMembers[0].name.split(' ')[0]} | 2: {data.panelMembers[1].name.split(' ')[0]} | 3: {data.panelMembers[2].name.split(' ')[0]}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.statusAssessment.irl.map((lvl) => (
                    <tr key={lvl.level} className="border-b border-black last:border-b-0">
                      <td className="border-r border-black p-1 text-[10px] leading-tight font-medium">
                        {lvl.label}
                      </td>
                      {lvl.achieved.map((ach, mIdx) => (
                        <td key={mIdx} className="border-r border-black last:border-r-0 p-1 text-center text-[10px] font-bold w-[20%]">
                          {ach ? 'achieved' : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Milestone assessment : */}
      <section className="mb-6">
        <h2 className="text-sm font-bold border-b border-black pb-1 mb-1">
          2. Milestone assessment :
        </h2>
        <p className="text-[11px] font-bold text-gray-800 mb-2">
          {data.milestoneAssessment.note}
        </p>

        <table className="w-full text-[11px] border border-collapse border-black mb-3">
          <thead>
            <tr className="bg-slate-100 border-b border-black">
              <th className="border border-black p-1.5 text-left font-bold w-[26%]">
                Milestones for Idea Prototyping and proof of concept
              </th>
              <th className="border border-black p-1.5 text-left font-bold w-[28%]">
                Milestones for Professional Practice and Entrepreneurship Development
              </th>
              <th className="border border-black p-1.5 text-center font-bold w-[46%]" colSpan={3}>
                Status (Completed/Pending) and remarks from SEC members
              </th>
            </tr>
            <tr className="bg-slate-50 border-b border-black text-[10px]">
              <th className="border border-black p-1"></th>
              <th className="border border-black p-1"></th>
              {data.panelMembers.map((pm, idx) => (
                <th key={idx} className="border border-black p-1 text-center font-bold w-[15.3%]">
                  {idx + 1}. {pm.name.split(' ')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.milestoneAssessment.rows.map((row) => (
              <tr key={row.rowNum} className="border-b border-black">
                <td className="border border-black p-1.5 align-top font-medium leading-tight">
                  {row.setAText}
                </td>
                <td className="border border-black p-1.5 align-top font-medium leading-tight">
                  {row.setBText}
                </td>
                {row.memberRemarks.map((rem, mIdx) => (
                  <td key={mIdx} className="border border-black p-1.5 align-top text-[10px] leading-tight">
                    {rem}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Milestone Corrections Audit Table */}
        {data.milestoneAssessment.corrections.length > 0 && (
          <div className="p-2 border border-black bg-slate-50 text-[10px] mb-3">
            <strong className="block mb-1 uppercase tracking-tight text-gray-800">
              Milestone Corrections Audit Log (Policy Signed Requirement):
            </strong>
            <ul className="list-disc pl-4 space-y-0.5">
              {data.milestoneAssessment.corrections.map((c, i) => (
                <li key={i}>
                  {c.changedAtIST} by {c.changedByName}: Field <strong>{c.field}</strong> changed from "{c.oldValue}" to "{c.newValue}" | Signature: ______________________
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* SECTION 3: TRL 2/TRL3 Experiment Assessment (12 Questions) */}
      <section className="mb-6 page-break">
        <h2 className="text-sm font-bold border-b border-black pb-1 mb-1">
          3. TRL 2/TRL3 Experiment Assessment
        </h2>
        <p className="text-[11px] text-gray-700 italic mb-2">
          This assessment will be done by each SEC member
        </p>

        <table className="w-full text-[11px] border border-collapse border-black mb-2">
          <thead>
            <tr className="bg-slate-100 border-b border-black">
              <th className="border border-black p-1.5 text-left font-bold w-[64%]">
                Evaluation Question
              </th>
              {data.panelMembers.map((pm, i) => (
                <th key={i} className="border border-black p-1.5 text-center font-bold w-[12%]">
                  {i + 1}. {pm.name.split(' ')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.experimentAssessment.questions.map((q) => (
              <tr key={q.id} className="border-b border-black">
                <td className="border border-black p-1.5 leading-tight">
                  <span className="font-bold mr-1">{q.num}.</span>
                  {q.text}
                </td>
                {q.votes.map((vote, mIdx) => (
                  <td
                    key={mIdx}
                    className={`border border-black p-1.5 text-center font-bold ${
                      vote === 'YES' ? 'text-green-800' : vote === 'NO' ? 'text-red-800' : 'text-gray-500'
                    }`}
                  >
                    {vote}
                  </td>
                ))}
              </tr>
            ))}
            {/* Total Votes Row */}
            <tr className="bg-slate-100 font-bold border-t-2 border-black">
              <td className="border border-black p-1.5">Total Votes (YES / NO)</td>
              {data.experimentAssessment.memberVoteTotals.map((tot, mIdx) => (
                <td key={mIdx} className="border border-black p-1.5 text-center font-bold">
                  Y:{tot.yes} · N:{tot.no}
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <p className="text-[11px] font-bold text-gray-900 mb-3">
          {data.experimentAssessment.decisionGuide}
        </p>

        {/* Member Notes Table */}
        <div className="mt-3">
          <p className="text-[11px] font-bold mb-1">
            Notes from SEC members with reference to questions asked above number (to be used for final recommendation):
          </p>
          <table className="w-full text-[11px] border border-collapse border-black">
            <thead>
              <tr className="bg-slate-100 border-b border-black">
                <th className="border border-black p-1.5 text-left font-bold w-[25%]">name of members</th>
                <th className="border border-black p-1.5 text-left font-bold w-[75%]">Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.panelMembers.map((pm, i) => (
                <tr key={i} className="border-b border-black">
                  <td className="border border-black p-1.5 font-bold align-top">
                    member {i + 1} : {pm.name}
                  </td>
                  <td className="border border-black p-1.5 align-top whitespace-pre-wrap text-gray-800">
                    {data.experimentAssessment.memberNotes[i].notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 4: Recommendation Note from SEC members : */}
      <section className="mb-6">
        <h2 className="text-sm font-bold border-b border-black pb-1 mb-2">
          4. Recommendation Note from SEC members :
        </h2>
        <table className="w-full text-[11px] border border-collapse border-black">
          <thead>
            <tr className="bg-slate-100 border-b border-black">
              <th className="border border-black p-1.5 text-left font-bold w-[25%]">name of members</th>
              <th className="border border-black p-1.5 text-left font-bold w-[75%]">recommendation</th>
            </tr>
          </thead>
          <tbody>
            {data.panelMembers.map((pm, i) => (
              <tr key={i} className="border-b border-black">
                <td className="border border-black p-1.5 font-bold align-top">
                  member {i + 1} : {pm.name}
                </td>
                <td className="border border-black p-1.5 align-top whitespace-pre-wrap text-gray-800">
                  {data.recommendationNotes[i].recommendation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* SECTION 5: Grant Evaluation by SEC member */}
      <section className="mb-6">
        <h2 className="text-sm font-bold border-b border-black pb-1 mb-2">
          5: Grant Evaluation by SEC member
        </h2>
        <table className="w-full text-[11px] border border-collapse border-black">
          <thead>
            <tr className="bg-slate-100 border-b border-black">
              <th className="border border-black p-1.5 text-left font-bold w-[55%]">Type of grant</th>
              {data.panelMembers.map((pm, i) => (
                <th key={i} className="border border-black p-1.5 text-center font-bold w-[15%]">
                  Member name: {i + 1}.
                  <div className="text-[9px] font-normal">{pm.name.split(' ')[0]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.grantEvaluation.rows.map((row) => (
              <tr key={row.key} className="border-b border-black">
                <td className="border border-black p-1.5 font-medium">{row.label}</td>
                {row.approved.map((appr, mIdx) => (
                  <td key={mIdx} className="border border-black p-1.5 text-center font-bold text-green-800">
                    {appr}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* SECTION 6: Grant suggested under various headers : */}
      <section className="mb-6">
        <h2 className="text-sm font-bold border-b border-black pb-1 mb-2">
          6. Grant suggested under various headers :
        </h2>
        <table className="w-full text-[11px] border border-collapse border-black">
          <thead>
            <tr className="bg-slate-100 border-b border-black">
              <th className="border border-black p-1.5 text-left font-bold w-[55%]" rowSpan={2}>
                Grant approved for
              </th>
              <th className="border border-black p-1 text-center font-bold w-[45%]" colSpan={3}>
                Amount
              </th>
            </tr>
            <tr className="bg-slate-100 border-b border-black text-[10px]">
              {data.panelMembers.map((pm, i) => (
                <th key={i} className="border border-black p-1 text-center font-bold w-[15%]">
                  member {i + 1}: {pm.name.split(' ')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.suggestedBudgets.headers.map((h) => (
              <tr key={h.key} className="border-b border-black">
                <td className="border border-black p-1.5 font-medium">{h.name}</td>
                {h.amounts.map((amt, mIdx) => (
                  <td key={mIdx} className="border border-black p-1.5 text-right font-mono">
                    {amt}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-slate-100 font-bold border-t-2 border-black">
              <td className="border border-black p-1.5">total :</td>
              {data.suggestedBudgets.totals.map((tot, mIdx) => (
                <td key={mIdx} className="border border-black p-1.5 text-right font-mono text-xs">
                  {tot}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>

      {/* SECTION 7: Assessed By: (3 Panel Members) */}
      <section className="mt-8 pt-4 border-t-2 border-black">
        <h2 className="text-sm font-bold uppercase mb-4">7. Assessed By:</h2>
        <div className="grid grid-cols-3 gap-6">
          {data.panelMembers.map((pm, i) => (
            <div key={i} className="border border-black p-3 text-center">
              <div className="h-10 border-b border-black mb-2 flex items-end justify-center">
                <span className="text-[10px] text-gray-500 italic">Signature & Date</span>
              </div>
              <strong className="block text-xs font-bold text-black">{pm.name}</strong>
              <span className="block text-[11px] text-gray-800">{pm.designation}</span>
              <span className="block text-[10px] text-gray-600">{pm.department}</span>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 8: Reviewed by: (Signatories from Settings: Head Incubation & Director IDEAPAD) */}
      <section className="mt-6 pt-4 border-t border-black">
        <h2 className="text-sm font-bold uppercase mb-4">Reviewed by:</h2>
        <div className="grid grid-cols-2 gap-8">
          {data.signatories.reviewedBy.map((sig) => (
            <div key={sig.key} className="border border-black p-3 text-center">
              <div className="h-10 border-b border-black mb-2 flex items-end justify-center">
                <span className="text-[10px] text-gray-500 italic">Signature & Date</span>
              </div>
              <strong className="block text-xs font-bold text-black">{sig.name}</strong>
              <span className="block text-[11px] text-gray-800">{sig.designation}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Running Footer (Visible in print on each page) */}
      <div className="mt-8 pt-3 border-t border-black flex items-center justify-between text-[10px] text-gray-600 font-sans">
        <span>Form A: SEC Startup Assessment · App ID: {data.applicationId}</span>
        <span>Generated: {data.generatedAtIST}</span>
        <span>Canonical Hash: <code className="font-mono">{shortHash}</code></span>
      </div>
    </div>
  );
}
