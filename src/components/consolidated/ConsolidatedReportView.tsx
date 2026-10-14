'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { getTierBadgeClasses } from '@/lib/tiers';
import { BUDGET_HEADERS } from '@/lib/seedfund-constants';
import { FLAT_SEC_QUESTIONS } from '@/lib/sec-questions';
import {
  TRL_LABELS_FORM_A,
  MRL_LABELS_FORM_A,
  IRL_LABELS_FORM_A,
  GRANT_EVALUATION_OPTIONS,
} from '@/lib/consolidated-constants';
import { AlertCircle, CheckCircle2, ChevronRight, FileText, UserCheck } from 'lucide-react';

interface ConsolidatedReportViewProps {
  report: any;
  showSectionAnchors?: boolean;
}

export default function ConsolidatedReportView({
  report,
  showSectionAnchors = true,
}: ConsolidatedReportViewProps) {
  const [activeSection, setActiveSection] = useState('section1');

  const {
    application,
    submittedAssessments = [],
    milestone,
    isComplete,
    incompleteBanner,
    section1,
    section5,
    section6,
  } = report;

  const members = submittedAssessments.map((a: any) => a.member);
  const m1 = members[0];
  const m2 = members[1];
  const m3 = members[2];

  const isExperimentApplicable = !['IDEATION', 'EMERGENCY'].includes(application.grantType);

  const anchors = [
    { id: 'header', label: 'Header & Profile' },
    { id: 'section1', label: '1. Status (TRL/MRL/IRL)' },
    { id: 'section2', label: '2. Milestones' },
    { id: 'section3', label: '3. Experiment (TRL 2/3)' },
    { id: 'section4', label: '4. Member Notes' },
    { id: 'section5', label: '5. Grant Evaluation' },
    { id: 'section6', label: '6. Suggested Budget' },
    { id: 'section7', label: '7. Signatures' },
  ];

  return (
    <div className="space-y-6">
      {/* INCOMPLETE Banner */}
      {!isComplete && (
        <Alert variant="warning" className="border-amber-400 bg-amber-50 text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">{incompleteBanner}</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Only submitted assessments appear in this report. PDF outputs will include an INCOMPLETE watermark until all 3 committee members submit.
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* Section Anchors Sticky Bar */}
      {showSectionAnchors && (
        <div className="sticky top-2 z-10 bg-white/95 backdrop-blur border rounded-lg p-2 shadow-sm flex items-center gap-1 overflow-x-auto text-xs">
          {anchors.map((anc) => (
            <a
              key={anc.id}
              href={`#${anc.id}`}
              onClick={() => setActiveSection(anc.id)}
              className={`px-2.5 py-1 rounded whitespace-nowrap transition-colors ${
                activeSection === anc.id
                  ? 'bg-brand-primary text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {anc.label}
            </a>
          ))}
        </div>
      )}

      {/* Header Block */}
      <Card id="header" className="border-gray-200">
        <CardHeader className="pb-3 border-b bg-gray-50/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base text-gray-900">
                IDEAPAD Startup Evaluation Committee (SEC) Consolidated Report
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Form A Consolidated Assessment Matrix</p>
            </div>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getTierBadgeClasses(
                application.grantType
              )}`}
            >
              {application.grantType}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-500">Startup / Team:</span>
                <span className="font-semibold text-gray-900">{application.startup?.teamName || '-'}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-500">Lead Applicant:</span>
                <span className="font-medium text-gray-900">
                  {application.formData?.applicantName || application.startup?.user?.name || '-'}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-500">Requested Total:</span>
                <span className="font-bold text-brand-primary">
                  ₹ {Number(application.requestedTotal || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-500">Presentation Date:</span>
                <span className="text-gray-900">
                  {submittedAssessments[0]?.assessmentDate
                    ? new Date(submittedAssessments[0].assessmentDate).toLocaleDateString('en-IN')
                    : 'Pending evaluation'}
                </span>
              </div>
              <div className="border-b pb-1">
                <span className="text-gray-500 block mb-0.5">Assessing SEC Members:</span>
                <div className="space-y-0.5 pl-2">
                  {submittedAssessments.length > 0 ? (
                    submittedAssessments.map((a: any, idx: number) => (
                      <div key={a.id} className="text-gray-700">
                        • <span className="font-medium">{a.member?.name}</span> ({a.member?.designation || 'Member'}) -{' '}
                        {a.assessmentDate ? new Date(a.assessmentDate).toLocaleDateString('en-IN') : 'Submitted'}
                      </div>
                    ))
                  ) : (
                    <span className="text-gray-400 italic">No submitted assessments yet</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 1: Current Status Assessment (TRL / MRL / IRL) */}
      <Card id="section1" className="border-gray-200">
        <CardHeader className="pb-3 border-b bg-gray-50/50">
          <CardTitle className="text-sm font-bold text-gray-900">
            Section 1: Current Status Assessment (TRL / MRL / IRL)
          </CardTitle>
          <p className="text-xs text-gray-500">
            Exact 3-block matrix comparing individual member assessments against the 9 readiness scale levels.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-[11px] divide-y divide-gray-200">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th colSpan={4} className="px-2 py-1.5 font-bold text-left border-r border-gray-300 bg-blue-50/50">
                    TRL (Technology Readiness)
                  </th>
                  <th colSpan={4} className="px-2 py-1.5 font-bold text-left border-r border-gray-300 bg-amber-50/50">
                    MRL (Manufacturing Readiness)
                  </th>
                  <th colSpan={4} className="px-2 py-1.5 font-bold text-left bg-emerald-50/50">
                    IRL (Integration Readiness)
                  </th>
                </tr>
                <tr className="border-t text-[10px] text-gray-600 bg-gray-50">
                  {/* TRL Block */}
                  <th className="px-2 py-1 text-left w-24">Level</th>
                  <th className="px-1 py-1 text-center w-14 border-l">SEC: {m1?.name || 'M1'}</th>
                  <th className="px-1 py-1 text-center w-14 border-l">SEC: {m2?.name || 'M2'}</th>
                  <th className="px-1 py-1 text-center w-14 border-l border-r border-gray-300">SEC: {m3?.name || 'M3'}</th>

                  {/* MRL Block */}
                  <th className="px-2 py-1 text-left w-24">Level</th>
                  <th className="px-1 py-1 text-center w-14 border-l">SEC: {m1?.name || 'M1'}</th>
                  <th className="px-1 py-1 text-center w-14 border-l">SEC: {m2?.name || 'M2'}</th>
                  <th className="px-1 py-1 text-center w-14 border-l border-r border-gray-300">SEC: {m3?.name || 'M3'}</th>

                  {/* IRL Block */}
                  <th className="px-2 py-1 text-left w-28">Level</th>
                  <th className="px-1 py-1 text-center w-14 border-l">SEC: {m1?.name || 'M1'}</th>
                  <th className="px-1 py-1 text-center w-14 border-l">SEC: {m2?.name || 'M2'}</th>
                  <th className="px-1 py-1 text-center w-14 border-l">SEC: {m3?.name || 'M3'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Array.from({ length: 9 }).map((_, i) => {
                  const trlAchieved = section1?.trl?.[i] || [];
                  const mrlAchieved = section1?.mrl?.[i] || [];
                  const irlAchieved = section1?.irl?.[i] || [];

                  return (
                    <tr key={i} className="hover:bg-gray-50/80">
                      {/* TRL Block */}
                      <td className="px-2 py-1 font-mono text-gray-700 whitespace-nowrap">{TRL_LABELS_FORM_A[i]}</td>
                      <td className="px-1 py-1 text-center border-l">
                        {trlAchieved[0] ? (
                          <span className="inline-block px-1 bg-green-100 text-green-800 rounded font-bold text-[9px]">
                            achieved
                          </span>
                        ) : null}
                      </td>
                      <td className="px-1 py-1 text-center border-l">
                        {trlAchieved[1] ? (
                          <span className="inline-block px-1 bg-green-100 text-green-800 rounded font-bold text-[9px]">
                            achieved
                          </span>
                        ) : null}
                      </td>
                      <td className="px-1 py-1 text-center border-l border-r border-gray-300">
                        {trlAchieved[2] ? (
                          <span className="inline-block px-1 bg-green-100 text-green-800 rounded font-bold text-[9px]">
                            achieved
                          </span>
                        ) : null}
                      </td>

                      {/* MRL Block */}
                      <td className="px-2 py-1 font-mono text-gray-700 whitespace-nowrap">{MRL_LABELS_FORM_A[i]}</td>
                      <td className="px-1 py-1 text-center border-l">
                        {mrlAchieved[0] ? (
                          <span className="inline-block px-1 bg-green-100 text-green-800 rounded font-bold text-[9px]">
                            achieved
                          </span>
                        ) : null}
                      </td>
                      <td className="px-1 py-1 text-center border-l">
                        {mrlAchieved[1] ? (
                          <span className="inline-block px-1 bg-green-100 text-green-800 rounded font-bold text-[9px]">
                            achieved
                          </span>
                        ) : null}
                      </td>
                      <td className="px-1 py-1 text-center border-l border-r border-gray-300">
                        {mrlAchieved[2] ? (
                          <span className="inline-block px-1 bg-green-100 text-green-800 rounded font-bold text-[9px]">
                            achieved
                          </span>
                        ) : null}
                      </td>

                      {/* IRL Block */}
                      <td className="px-2 py-1 font-mono text-gray-700 whitespace-nowrap">{IRL_LABELS_FORM_A[i]}</td>
                      <td className="px-1 py-1 text-center border-l">
                        {irlAchieved[0] ? (
                          <span className="inline-block px-1 bg-green-100 text-green-800 rounded font-bold text-[9px]">
                            achieved
                          </span>
                        ) : null}
                      </td>
                      <td className="px-1 py-1 text-center border-l">
                        {irlAchieved[1] ? (
                          <span className="inline-block px-1 bg-green-100 text-green-800 rounded font-bold text-[9px]">
                            achieved
                          </span>
                        ) : null}
                      </td>
                      <td className="px-1 py-1 text-center border-l">
                        {irlAchieved[2] ? (
                          <span className="inline-block px-1 bg-green-100 text-green-800 rounded font-bold text-[9px]">
                            achieved
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 bg-gray-50 rounded-lg p-3 space-y-1.5 text-xs border">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 font-medium">Startup Self-Assessment:</span>
              <span className="font-semibold text-gray-900">
                TRL {section1?.selfTrl} · MRL {section1?.selfMrl} · IRL {section1?.selfIrl}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-1.5">
              <span className="text-gray-600 font-medium">Committee View (Majority):</span>
              <div className="flex items-center gap-3 text-brand-primary font-bold">
                <span>TRL: {section1?.committeeViewTrl?.label}</span>
                <span>•</span>
                <span>MRL: {section1?.committeeViewMrl?.label}</span>
                <span>•</span>
                <span>IRL: {section1?.committeeViewIrl?.label}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Milestone Assessment */}
      <Card id="section2" className="border-gray-200">
        <CardHeader className="pb-3 border-b bg-gray-50/50">
          <CardTitle className="text-sm font-bold text-gray-900">
            Section 2: Milestone Assessment
          </CardTitle>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-0.5">
            <span>Track: <strong className="text-gray-800">{milestone?.track || 'Not assigned'}</strong></span>
            <span>Milestone Owner: <strong className="text-gray-800">{milestone?.owner?.name || 'Unassigned'}</strong></span>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-xs divide-y divide-gray-200">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Milestone</th>
                  <th className="px-3 py-2 text-left font-semibold">Status (by Owner)</th>
                  <th className="px-3 py-2 text-left font-semibold">Remarks: {m1?.name || 'M1'}</th>
                  <th className="px-3 py-2 text-left font-semibold">Remarks: {m2?.name || 'M2'}</th>
                  <th className="px-3 py-2 text-left font-semibold">Remarks: {m3?.name || 'M3'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {milestone?.items?.map((item: any) => {
                  const r1 = item.remarks?.find((r: any) => r.memberId === m1?.id)?.remark || '-';
                  const r2 = item.remarks?.find((r: any) => r.memberId === m2?.id)?.remark || '-';
                  const r3 = item.remarks?.find((r: any) => r.memberId === m3?.id)?.remark || '-';

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80">
                      <td className="px-3 py-2 font-medium text-gray-900">{item.name}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            item.state === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : item.state === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {item.state}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{r1}</td>
                      <td className="px-3 py-2 text-gray-600">{r2}</td>
                      <td className="px-3 py-2 text-gray-600">{r3}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {milestone?.editLog && milestone.editLog.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border text-xs">
              <p className="font-semibold text-gray-700 mb-1">
                Edit Log Corrections (corrections require signature):
              </p>
              <ul className="space-y-1 list-disc pl-4 text-gray-600">
                {milestone.editLog.map((log: any) => (
                  <li key={log.id}>
                    Field <code>{log.field}</code> modified from "{log.oldValue}" to "{log.newValue}" on{' '}
                    {new Date(log.at).toLocaleDateString('en-IN')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Experiment Assessment */}
      <Card id="section3" className="border-gray-200">
        <CardHeader className="pb-3 border-b bg-gray-50/50">
          <CardTitle className="text-sm font-bold text-gray-900">
            Section 3: TRL 2/3 Experiment Assessment
          </CardTitle>
          <p className="text-xs text-gray-500">
            12 standard validation questions evaluated across Technical Soundness, Market Worthiness, and Execution Readiness.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          {!isExperimentApplicable ? (
            <div className="p-4 bg-gray-50 rounded text-center text-xs text-gray-500">
              TRL 2/3 Experiment Assessment is N/A for Ideation and Emergency tiers.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-xs divide-y divide-gray-200">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-2 py-2 text-center w-8">#</th>
                      <th className="px-3 py-2 text-left">Question</th>
                      <th className="px-3 py-2 text-center w-20">{m1?.name || 'M1'}</th>
                      <th className="px-3 py-2 text-center w-20">{m2?.name || 'M2'}</th>
                      <th className="px-3 py-2 text-center w-20">{m3?.name || 'M3'}</th>
                      <th className="px-3 py-2 text-center w-20 font-bold">Yes Tally</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {FLAT_SEC_QUESTIONS.map((q) => {
                      const qNum = q.number;
                      const a1 = submittedAssessments[0]?.experimentForm?.answers?.[qNum];
                      const a2 = submittedAssessments[1]?.experimentForm?.answers?.[qNum];
                      const a3 = submittedAssessments[2]?.experimentForm?.answers?.[qNum];
                      const yesCount = [a1, a2, a3].filter((a) => a === true).length;

                      return (
                        <tr key={qNum} className="hover:bg-gray-50/80">
                          <td className="px-2 py-1.5 text-center font-mono text-gray-500">{qNum}</td>
                          <td className="px-3 py-1.5">
                            <span className="font-semibold text-gray-700 mr-1.5">{q.group}:</span>
                            <span className="text-gray-900">{q.text}</span>
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            {a1 === true ? (
                              <span className="text-green-600 font-bold">Yes</span>
                            ) : a1 === false ? (
                              <span className="text-red-600 font-bold">No</span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            {a2 === true ? (
                              <span className="text-green-600 font-bold">Yes</span>
                            ) : a2 === false ? (
                              <span className="text-red-600 font-bold">No</span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            {a3 === true ? (
                              <span className="text-green-600 font-bold">Yes</span>
                            ) : a3 === false ? (
                              <span className="text-red-600 font-bold">No</span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-center font-bold text-gray-800">
                            {yesCount} / {submittedAssessments.length}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {submittedAssessments.some((a: any) => Object.keys(a.experimentForm?.notes || {}).length > 0) && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border text-xs space-y-1.5">
                  <p className="font-bold text-gray-700">Member Experiment Question Notes:</p>
                  {submittedAssessments.map((a: any) => (
                    <div key={a.id} className="text-gray-800">
                      <strong>{a.member?.name}:</strong>{' '}
                      {Object.entries(a.experimentForm?.notes || {})
                        .map(([k, note]) => `Q${k}: ${note}`)
                        .join('; ') || 'No notes'}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Recommendation Notes */}
      <Card id="section4" className="border-gray-200">
        <CardHeader className="pb-3 border-b bg-gray-50/50">
          <CardTitle className="text-sm font-bold text-gray-900">
            Section 4: Recommendation Notes
          </CardTitle>
          <p className="text-xs text-gray-500">Narrative comments and justification from each evaluating member.</p>
        </CardHeader>
        <CardContent className="pt-4 space-y-3 text-xs">
          {submittedAssessments.map((a: any) => (
            <div key={a.id} className="p-3 bg-gray-50 rounded-lg border">
              <span className="font-bold text-gray-900 block mb-1">
                {a.member?.name} ({a.member?.designation || 'SEC Member'}):
              </span>
              <p className="text-gray-700 whitespace-pre-wrap">{a.recommendation || 'No notes recorded.'}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Section 5: Grant Evaluation */}
      <Card id="section5" className="border-gray-200">
        <CardHeader className="pb-3 border-b bg-gray-50/50">
          <CardTitle className="text-sm font-bold text-gray-900">
            Section 5: Grant Evaluation by Each SEC Member
          </CardTitle>
          <p className="text-xs text-gray-500">Recommended funding stage or verdict per committee member.</p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-xs divide-y divide-gray-200">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Grant Option</th>
                  <th className="px-3 py-2 text-center font-semibold">{m1?.name || 'M1'}</th>
                  <th className="px-3 py-2 text-center font-semibold">{m2?.name || 'M2'}</th>
                  <th className="px-3 py-2 text-center font-semibold">{m3?.name || 'M3'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {GRANT_EVALUATION_OPTIONS.map((opt) => {
                  const c1 = submittedAssessments[0]?.suggestedGrant === opt.key;
                  const c2 = submittedAssessments[1]?.suggestedGrant === opt.key;
                  const c3 = submittedAssessments[2]?.suggestedGrant === opt.key;

                  return (
                    <tr key={opt.key} className="hover:bg-gray-50/80">
                      <td className="px-3 py-2 font-medium text-gray-900">{opt.label}</td>
                      <td className="px-3 py-2 text-center">
                        {c1 && <span className="text-brand-primary font-bold text-base">✔</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {c2 && <span className="text-brand-primary font-bold text-base">✔</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {c3 && <span className="text-brand-primary font-bold text-base">✔</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between text-xs">
            <span className="font-semibold text-blue-900">SEC Committee Majority Decision:</span>
            <span className="font-bold text-brand-primary text-sm">{section5?.majorityLabel}</span>
          </div>
        </CardContent>
      </Card>

      {/* Section 6: Grant Suggested Under Headers */}
      <Card id="section6" className="border-gray-200">
        <CardHeader className="pb-3 border-b bg-gray-50/50">
          <CardTitle className="text-sm font-bold text-gray-900">
            Section 6: Grant Suggested Under Budget Headers
          </CardTitle>
          <p className="text-xs text-gray-500">
            Head-wise comparison of requested amounts and member recommendations, with rounded averages.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-xs divide-y divide-gray-200">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Budget Header</th>
                  <th className="px-3 py-2 text-right font-semibold">Requested (₹)</th>
                  <th className="px-3 py-2 text-right font-semibold">{m1?.name || 'M1'} (₹)</th>
                  <th className="px-3 py-2 text-right font-semibold">{m2?.name || 'M2'} (₹)</th>
                  <th className="px-3 py-2 text-right font-semibold">{m3?.name || 'M3'} (₹)</th>
                  <th className="px-3 py-2 text-right font-bold text-gray-900">Average (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {BUDGET_HEADERS.map((h) => {
                  const req = section6?.requested?.[h.key] || 0;
                  const a1 = section6?.memberAmounts?.[0]?.[h.key] || 0;
                  const a2 = section6?.memberAmounts?.[1]?.[h.key] || 0;
                  const a3 = section6?.memberAmounts?.[2]?.[h.key] || 0;
                  const avg = section6?.averages?.[h.key] || 0;

                  return (
                    <tr key={h.key} className="hover:bg-gray-50/80">
                      <td className="px-3 py-1.5 font-medium text-gray-900">{h.name}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-gray-600">
                        ₹ {Number(req).toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-gray-600">
                        ₹ {Number(a1).toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-gray-600">
                        ₹ {Number(a2).toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-gray-600">
                        ₹ {Number(a3).toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold text-brand-primary">
                        ₹ {Number(avg).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-300">
                <tr>
                  <td className="px-3 py-2 text-gray-900">Total Sanctioned / Recommended</td>
                  <td className="px-3 py-2 text-right font-mono text-gray-900">
                    ₹ {Number(section6?.requestedTotal || 0).toLocaleString('en-IN')}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono ${
                      section6?.memberOutOfRange?.[0] ? 'bg-red-50 text-red-700' : 'text-gray-900'
                    }`}
                  >
                    ₹ {Number(section6?.memberTotals?.[0] || 0).toLocaleString('en-IN')}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono ${
                      section6?.memberOutOfRange?.[1] ? 'bg-red-50 text-red-700' : 'text-gray-900'
                    }`}
                  >
                    ₹ {Number(section6?.memberTotals?.[1] || 0).toLocaleString('en-IN')}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono ${
                      section6?.memberOutOfRange?.[2] ? 'bg-red-50 text-red-700' : 'text-gray-900'
                    }`}
                  >
                    ₹ {Number(section6?.memberTotals?.[2] || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-brand-primary text-sm">
                    ₹ {Number(section6?.totalAverage || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {section6?.hasOutOfRange && (
            <p className="mt-2 text-xs text-red-600">
              * Highlighted totals indicate member suggested amount exceeds/falls outside the bounds of their recommended grant tier.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 7: Assessed By */}
      <Card id="section7" className="border-gray-200">
        <CardHeader className="pb-3 border-b bg-gray-50/50">
          <CardTitle className="text-sm font-bold text-gray-900">
            Section 7: Assessed By (Signatures)
          </CardTitle>
          <p className="text-xs text-gray-500">Sign-off endorsements from evaluating committee members.</p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {submittedAssessments.map((a: any, idx: number) => (
              <div key={a.id} className="p-3 bg-gray-50 rounded-lg border space-y-1">
                <span className="font-bold text-gray-900 block">SEC Member {idx + 1}</span>
                <p className="text-gray-700"><strong>Name:</strong> {a.member?.name}</p>
                <p className="text-gray-700"><strong>Designation:</strong> {a.member?.designation || 'SEC Member'}</p>
                <p className="text-gray-700">
                  <strong>Date:</strong>{' '}
                  {a.assessmentDate ? new Date(a.assessmentDate).toLocaleDateString('en-IN') : '-'}
                </p>
                <div className="pt-4 border-t border-dashed mt-2 text-center text-gray-400 font-mono text-[10px]">
                  [ Verified Digitally ]
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
