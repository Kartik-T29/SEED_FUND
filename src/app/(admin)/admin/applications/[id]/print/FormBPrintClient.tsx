'use client';

import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { BUDGET_HEADERS } from '@/lib/seedfund-constants';
import { formatDate } from '@/lib/utils';

interface FormBPrintClientProps {
  application: any;
  evaluation: any;
}

export default function FormBPrintClient({
  application,
  evaluation,
}: FormBPrintClientProps) {
  const startup = application.startup || {};
  const user = startup.user || {};
  const amounts = evaluation.amounts || {};
  const timeline = evaluation.timeline || {};

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 bg-white text-gray-900 print:p-0">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between pb-6 mb-6 border-b print:hidden">
        <Link href={`/admin/applications/${application.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Application
          </Button>
        </Link>
        <Button onClick={() => window.print()} className="bg-brand-primary">
          <Printer className="h-4 w-4 mr-1.5" /> Print Official Form B Sanction
        </Button>
      </div>

      {/* Official Header */}
      <div className="text-center border-b pb-4 mb-6">
        <img src="/logo.png" alt="IDEAPAD Logo" className="h-12 mx-auto mb-2" />
        <h1 className="text-xl font-bold tracking-tight uppercase">IDEAPAD Seed Fund Sanction Order (Form B)</h1>
        <p className="text-xs text-gray-600 mt-1">
          Final Administrative Approval & Grant Allocation Order
        </p>
      </div>

      {/* Forced Warning Line if forced */}
      {evaluation.forced && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded text-center text-xs font-bold text-amber-900">
          ⚠️ Decided with incomplete committee input. Justification: &ldquo;{evaluation.forceReason}&rdquo;
        </div>
      )}

      {/* Applicant Metadata Table */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded border text-xs mb-6">
        <div>
          <span className="text-gray-500 block">Startup Team:</span>
          <strong className="text-gray-900 font-bold">{startup.teamName}</strong>
        </div>
        <div>
          <span className="text-gray-500 block">Lead Founder:</span>
          <strong className="text-gray-900">{user.name} ({startup.enrollmentNo})</strong>
        </div>
        <div>
          <span className="text-gray-500 block">Decision Order:</span>
          <strong className="text-emerald-700 font-bold uppercase">{evaluation.decision}</strong>
        </div>
        <div>
          <span className="text-gray-500 block">Sanction Date:</span>
          <strong className="text-gray-900">
            {evaluation.assessmentDate ? formatDate(evaluation.assessmentDate) : formatDate(evaluation.decidedAt)}
          </strong>
        </div>
      </div>

      {/* Approved Budget Allocation */}
      <div className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 bg-gray-100 p-2 border rounded-t">
          1. Sanctioned Budget Allocation under Approved Headers
        </h2>
        <table className="w-full text-xs border border-t-0 text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-2 border-r">Budget Header</th>
              <th className="p-2 border-r text-right">Requested (₹)</th>
              <th className="p-2 text-right">Approved Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {BUDGET_HEADERS.map((h) => {
              const req = application.budgetItems
                ?.filter((b: any) => b.header === h.key)
                .reduce((acc: number, b: any) => acc + Number(b.total), 0) || 0;
              const apprv = Number(amounts[h.key]) || 0;
              return (
                <tr key={h.key}>
                  <td className="p-2 border-r font-medium">{h.name}</td>
                  <td className="p-2 border-r text-right font-mono text-gray-500">{req.toLocaleString('en-IN')}</td>
                  <td className="p-2 text-right font-mono font-bold text-gray-900">₹{apprv.toLocaleString('en-IN')}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-100 font-bold border-t">
            <tr>
              <td className="p-2 border-r">Total Grant Sanctioned:</td>
              <td className="p-2 border-r text-right font-mono text-gray-500">
                ₹{Number(application.requestedTotal).toLocaleString('en-IN')}
              </td>
              <td className="p-2 text-right font-mono text-sm text-brand-primary">
                ₹{Number(evaluation.approvedTotal).toLocaleString('en-IN')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Approved Timeline Schedule */}
      <div className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 bg-gray-100 p-2 border rounded-t">
          2. Approved Milestone & Fund Utilization Timeline
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 border border-t-0 text-xs">
          <div>
            <span className="text-gray-500 block">Sanction Date:</span>
            <strong>{timeline.grantApprovalDate || '—'}</strong>
          </div>
          <div>
            <span className="text-gray-500 block">Fund Release Date:</span>
            <strong>{timeline.fundReleaseDate || '—'}</strong>
          </div>
          <div>
            <span className="text-gray-500 block">Experiment Duration:</span>
            <strong>{timeline.experimentDuration || '—'}</strong>
          </div>
          <div>
            <span className="text-gray-500 block">Mid-Review Date:</span>
            <strong>{timeline.midReviewDate || '—'}</strong>
          </div>
          <div>
            <span className="text-gray-500 block">Utilization Deadline:</span>
            <strong>{timeline.grantUtilizationDeadline || '—'}</strong>
          </div>
          <div>
            <span className="text-gray-500 block">Completion Date:</span>
            <strong>{timeline.experimentCompletionDate || '—'}</strong>
          </div>
          <div>
            <span className="text-gray-500 block">Final Submission:</span>
            <strong>{timeline.finalSubmissionDate || '—'}</strong>
          </div>
          <div>
            <span className="text-gray-500 block">Closure Date:</span>
            <strong>{timeline.closureDate || '—'}</strong>
          </div>
        </div>
      </div>

      {/* Recommendation Note */}
      {evaluation.note && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 bg-gray-100 p-2 border rounded-t">
            3. Final Committee Recommendation & Directions
          </h2>
          <div className="p-3 border border-t-0 text-xs text-gray-800 whitespace-pre-wrap italic">
            &ldquo;{evaluation.note}&rdquo;
          </div>
        </div>
      )}

      {/* Terms and Conditions */}
      <div className="mb-8 p-3 bg-gray-50 rounded border text-[11px] space-y-1">
        <h3 className="font-bold text-gray-900 uppercase">Sanction Terms & Governing Rules:</h3>
        <p>1. Funds must not be transferred into any personal bank accounts under any circumstances.</p>
        <p>2. Equipment procurement and consumables acquisition shall follow standard institute procurement norms.</p>
        <p>3. Startup shall complete incorporation within 6 months and execute equity participation agreement.</p>
        <p>4. Original vouchers, bills, and physical verification evidence must be submitted prior to grant closure.</p>
      </div>

      {/* Official Signatures Blocks (5 Authorities) */}
      <div className="mt-12 pt-6 border-t page-break-inside-avoid space-y-12">
        <div className="grid grid-cols-3 gap-8 text-xs">
          <div className="border-t border-gray-400 pt-2 text-center">
            <p className="font-bold">Director IDEAPAD</p>
            <p className="text-[10px] text-gray-500">Innovation & Incubation Centre</p>
          </div>
          <div className="border-t border-gray-400 pt-2 text-center">
            <p className="font-bold">Assistant Director Startups</p>
            <p className="text-[10px] text-gray-500">Seed Fund Secretariat</p>
          </div>
          <div className="border-t border-gray-400 pt-2 text-center">
            <p className="font-bold">School / HoD Representative</p>
            <p className="text-[10px] text-gray-500">Department of Applicant</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-16 text-xs max-w-lg mx-auto">
          <div className="border-t border-gray-400 pt-2 text-center">
            <p className="font-bold">SOM Representative</p>
            <p className="text-[10px] text-gray-500">School of Management</p>
          </div>
          <div className="border-t border-gray-400 pt-2 text-center">
            <p className="font-bold">Vice Chancellor</p>
            <p className="text-[10px] text-gray-500">Sanctioning Authority</p>
          </div>
        </div>
      </div>
    </div>
  );
}
