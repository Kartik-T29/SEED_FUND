'use client';

import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { BUDGET_HEADERS } from '@/lib/seedfund-constants';
import { FLAT_SEC_QUESTIONS } from '@/lib/sec-questions';

interface FormAPrintClientProps {
  application: any;
  assessments: any[];
  milestone: any;
  activeMembers: any[];
}

export default function FormAPrintClient({
  application,
  assessments,
  milestone,
  activeMembers,
}: FormAPrintClientProps) {
  const startup = application.startup || {};
  const user = startup.user || {};
  const fd = application.formData || {};

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 bg-white text-gray-900 print:p-0">
      {/* Print Action Bar */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b print:hidden">
        <Link href={`/sec/applications/${application.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Assessment
          </Button>
        </Link>
        <Button onClick={() => window.print()} className="bg-brand-primary">
          <Printer className="h-4 w-4 mr-1.5" /> Print Form A Report
        </Button>
      </div>

      {/* Official Header */}
      <div className="text-center border-b pb-4 mb-6">
        <img src="/logo.png" alt="IDEAPAD Logo" className="h-10 mx-auto mb-2" />
        <h1 className="text-xl font-bold tracking-tight uppercase">Startup Evaluation Committee — Form A</h1>
        <p className="text-xs text-gray-600 mt-1">
          Technical & Feasibility Assessment Report for Seed Grant
        </p>
      </div>

      {/* Applicant Meta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded border text-xs mb-6">
        <div>
          <span className="text-gray-500 block">Startup Team:</span>
          <strong className="text-gray-900 font-bold">{startup.teamName}</strong>
        </div>
        <div>
          <span className="text-gray-500 block">Lead Applicant:</span>
          <strong className="text-gray-900">{user.name} ({startup.enrollmentNo})</strong>
        </div>
        <div>
          <span className="text-gray-500 block">Grant Category:</span>
          <strong className="text-gray-900">{application.grantType} Grant (v{application.version})</strong>
        </div>
        <div>
          <span className="text-gray-500 block">Requested Total:</span>
          <strong className="text-gray-900 font-mono">₹{Number(application.requestedTotal).toLocaleString('en-IN')}</strong>
        </div>
      </div>

      {/* 1. Status Levels (TRL/MRL/IRL) Side by Side */}
      <div className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 bg-gray-100 p-2 border rounded-t">
          1. Readiness Levels Assessment (Self vs. Evaluators)
        </h2>
        <table className="w-full text-xs border border-t-0 text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-2 border-r">Readiness Scale</th>
              <th className="p-2 border-r text-center">Self-Assessed</th>
              {activeMembers.map((m) => (
                <th key={m.id} className="p-2 border-r text-center">{m.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="p-2 font-semibold border-r">Technology Readiness (TRL 1-9)</td>
              <td className="p-2 border-r text-center">Level {fd.selfAssessment?.trl || '—'}</td>
              {activeMembers.map((m) => {
                const ass = assessments.find((a) => a.memberId === m.id);
                return (
                  <td key={m.id} className="p-2 border-r text-center font-bold">
                    {ass?.statusForm?.trl ? `Level ${ass.statusForm.trl}` : 'Pending'}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="p-2 font-semibold border-r">Manufacturing Readiness (MRL 1-9)</td>
              <td className="p-2 border-r text-center">Level {fd.selfAssessment?.mrl || '—'}</td>
              {activeMembers.map((m) => {
                const ass = assessments.find((a) => a.memberId === m.id);
                return (
                  <td key={m.id} className="p-2 border-r text-center font-bold">
                    {ass?.statusForm?.mrl ? `Level ${ass.statusForm.mrl}` : 'Pending'}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="p-2 font-semibold border-r">Investment Readiness (IRL 1-9)</td>
              <td className="p-2 border-r text-center">Level {fd.selfAssessment?.irl || '—'}</td>
              {activeMembers.map((m) => {
                const ass = assessments.find((a) => a.memberId === m.id);
                return (
                  <td key={m.id} className="p-2 border-r text-center font-bold">
                    {ass?.statusForm?.irl ? `Level ${ass.statusForm.irl}` : 'Pending'}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2. 12 Questions Yes/No Matrix */}
      <div className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 bg-gray-100 p-2 border rounded-t">
          2. TRL 2/3 Feasibility Questions (Yes / No per Member)
        </h2>
        <table className="w-full text-xs border border-t-0 text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-2 border-r w-12 text-center">#</th>
              <th className="p-2 border-r">Question</th>
              {activeMembers.map((m) => (
                <th key={m.id} className="p-2 border-r text-center w-24">{m.name}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {FLAT_SEC_QUESTIONS.map((q) => (
              <tr key={q.number}>
                <td className="p-2 border-r text-center font-bold text-gray-500">{q.number}</td>
                <td className="p-2 border-r">{q.text}</td>
                {activeMembers.map((m) => {
                  const ass = assessments.find((a) => a.memberId === m.id);
                  const ans = ass?.experimentForm?.answers?.[q.number];
                  return (
                    <td key={m.id} className="p-2 border-r text-center font-bold">
                      {ans === true ? (
                        <span className="text-emerald-700">YES</span>
                      ) : ans === false ? (
                        <span className="text-rose-700">NO</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. Suggested Budget Matrix per Header */}
      <div className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 bg-gray-100 p-2 border rounded-t">
          3. Budget Recommendation per Header (Requested vs Evaluators)
        </h2>
        <table className="w-full text-xs border border-t-0 text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-2 border-r">Budget Header</th>
              <th className="p-2 border-r text-right">Requested (₹)</th>
              {activeMembers.map((m) => (
                <th key={m.id} className="p-2 border-r text-right">{m.name} (₹)</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {BUDGET_HEADERS.map((h) => {
              const req = application.budgetItems
                ?.filter((b: any) => b.header === h.key)
                .reduce((acc: number, b: any) => acc + Number(b.total), 0) || 0;
              return (
                <tr key={h.key}>
                  <td className="p-2 border-r font-medium">{h.name}</td>
                  <td className="p-2 border-r text-right font-mono">{req.toLocaleString('en-IN')}</td>
                  {activeMembers.map((m) => {
                    const ass = assessments.find((a) => a.memberId === m.id);
                    const sug = ass?.suggestedAmounts?.[h.key] || 0;
                    return (
                      <td key={m.id} className="p-2 border-r text-right font-mono font-medium">
                        {ass ? Number(sug).toLocaleString('en-IN') : '—'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-100 font-bold border-t">
            <tr>
              <td className="p-2 border-r">Total Recommended:</td>
              <td className="p-2 border-r text-right font-mono">₹{Number(application.requestedTotal).toLocaleString('en-IN')}</td>
              {activeMembers.map((m) => {
                const ass = assessments.find((a) => a.memberId === m.id);
                const tot = ass
                  ? Object.values(ass.suggestedAmounts || {}).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0)
                  : 0;
                return (
                  <td key={m.id} className="p-2 border-r text-right font-mono text-brand-primary">
                    {ass ? `₹${tot.toLocaleString('en-IN')}` : '—'}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 4. Recommendation Notes */}
      <div className="mb-6 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 bg-gray-100 p-2 border rounded-t">
          4. Evaluator Recommendation Notes & Suggested Grant Type
        </h2>
        <div className="space-y-3 border border-t-0 p-3 rounded-b">
          {activeMembers.map((m) => {
            const ass = assessments.find((a) => a.memberId === m.id);
            return (
              <div key={m.id} className="p-3 bg-gray-50 rounded border text-xs space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span>{m.name} ({m.designation || 'SEC Member'}):</span>
                  <span className="text-brand-primary font-bold">
                    Recommended: {ass?.suggestedGrant ? `${ass.suggestedGrant} Grant` : 'Pending'}
                  </span>
                </div>
                <p className="text-gray-700 italic">
                  &ldquo;{ass?.recommendation || 'No recommendation submitted yet.'}&rdquo;
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Shared Milestone Evaluation */}
      {milestone && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 bg-gray-100 p-2 border rounded-t">
            5. Shared Milestone Progress ({milestone.track} Track)
          </h2>
          <table className="w-full text-xs border border-t-0 text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-2 border-r">Milestone Goal</th>
                <th className="p-2 border-r text-center w-28">Status</th>
                <th className="p-2 border-r">Owner Finding</th>
                <th className="p-2">Member Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {milestone.items?.map((item: any) => (
                <tr key={item.id}>
                  <td className="p-2 border-r font-medium">{item.name}</td>
                  <td className="p-2 border-r text-center font-bold">{item.state}</td>
                  <td className="p-2 border-r text-gray-700">{item.ownerRemark || '—'}</td>
                  <td className="p-2 text-gray-600">
                    {item.remarks?.map((r: any) => (
                      <span key={r.id} className="block text-[11px]">
                        <strong>{r.member?.name}:</strong> {r.remark}
                      </span>
                    )) || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. Signature Block */}
      <div className="mt-10 pt-6 border-t page-break-inside-avoid">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-6">Assessed By & Signatures:</h3>
        <div className="grid grid-cols-3 gap-8">
          {activeMembers.map((m) => (
            <div key={m.id} className="text-xs space-y-8 border-t border-gray-400 pt-3">
              <div>
                <p className="font-bold text-gray-900">{m.name}</p>
                <p className="text-gray-500">{m.designation || 'SEC Member'}</p>
                <p className="text-gray-400">{m.department || 'Committee'}</p>
              </div>
              <div className="border-b border-gray-300 pb-1">
                <span className="text-[10px] text-gray-400 block">Date & Signature</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
