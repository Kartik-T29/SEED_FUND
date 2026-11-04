'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import ApplicationViewSection from '@/components/application/ApplicationViewSection';
import {
  BUDGET_HEADERS,
  FORM_B_TIMELINE_FIELDS,
  POLICY_TERMS_AND_CONDITIONS,
} from '@/lib/seedfund-constants';
import { formatDateOnly, formatISTDate } from '@/lib/dates';
import { submitAdminFormBAction } from '@/app/(admin)/admin/application/[id]/actions';
import {
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  Info,
  ShieldCheck,
  Send,
  Calendar,
  Lock,
} from 'lucide-react';

interface AdminFormBProps {
  application: any;
  assessments: any[];
  readiness: {
    ready: boolean;
    submitted: number;
    members: number;
    milestoneSubmitted: boolean;
  };
  signatories: Array<{
    key?: string;
    title?: string;
    name: string;
    designation: string;
    department?: string;
  }>;
}

export default function AdminFormB({
  application,
  assessments,
  readiness,
  signatories,
}: AdminFormBProps) {
  const isDecided =
    application.status === 'APPROVED' ||
    application.status === 'REJECTED' ||
    application.status === 'REPRESENT';

  const [activeSection, setActiveSection] = useState<number>(1);
  const [mobileTab, setMobileTab] = useState<'app' | 'form'>('form');
  const rightPaneRef = useRef<HTMLDivElement>(null);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Existing evaluation data if already decided
  const existingEval = application.evaluation || {};
  const existingAmounts = (existingEval.amounts as any) || {};
  const existingTimeline = (existingEval.timeline as any) || {};

  // Form B State: SECTION 1: Decision & Summary
  const [decision, setDecision] = useState<string>(
    existingEval.decision || (application.grantType ? `${application.grantType} Grant` : 'Validation Grant')
  );
  const [secRecommendationNote, setSecRecommendationNote] = useState<string>(() => {
    if (existingEval.note) return existingEval.note;
    // Compile summary from SEC members
    const notes = assessments
      .map((a) => (a.experimentForm as any)?.recommendationNote)
      .filter(Boolean);
    return notes.join('\n\n') || '';
  });

  // SECTION 2: Approved Budget (9 Headers)
  const [approvedAmounts, setApprovedAmounts] = useState<Record<string, number>>(() => {
    if (Object.keys(existingAmounts).length > 0) return existingAmounts;
    // Default to average of SEC members' suggestions or requested amounts
    const defaults: Record<string, number> = {};
    for (const h of BUDGET_HEADERS) {
      const memberVals = assessments
        .map((a) => Number((a.experimentForm as any)?.suggestedAmounts?.[h.key]))
        .filter((v) => !isNaN(v));
      if (memberVals.length > 0) {
        const avg = memberVals.reduce((a, b) => a + b, 0) / memberVals.length;
        defaults[h.key] = Math.round(avg);
      } else {
        const reqItems = (application.budgetItems || []).filter((b: any) => b.header === h.key);
        defaults[h.key] = reqItems.reduce((acc: number, it: any) => acc + Number(it.total), 0);
      }
    }
    return defaults;
  });

  const approvedTotal = Object.values(approvedAmounts).reduce((a, b) => a + (Number(b) || 0), 0);

  // SECTION 3: Approved Timeline (8 Dates)
  const todayIso = new Date().toISOString().split('T')[0];
  const [timeline, setTimeline] = useState<Record<string, string>>(() => {
    if (Object.keys(existingTimeline).length > 0) return existingTimeline;
    return {
      grantApprovalDate: todayIso,
      fundReleaseDate: '',
      experimentDuration: '4 to 6 months from fund release',
      midReviewDate: '',
      grantUtilizationDeadline: '',
      experimentCompletionDate: '',
      finalSubmissionDate: '',
      closureDate: '',
    };
  });
  const [rePresentationDate, setRePresentationDate] = useState<string>('');

  // SECTION 4: Terms & Signatories
  const [termsAcknowledged, setTermsAcknowledged] = useState<boolean>(true);

  // Section completion indicators
  const isSection1Complete = !!decision;
  const isSection2Complete = decision === 'REJECTED' || approvedTotal > 0;
  const isSection3Complete =
    decision === 'REJECTED' ||
    (decision === 'REPRESENT'
      ? !!rePresentationDate
      : !!timeline.grantApprovalDate && !!timeline.fundReleaseDate);
  const isSection4Complete = termsAcknowledged;

  const sectionTabs = [
    { num: 1, title: 'Decision & Note', complete: isSection1Complete, badge: decision || 'Pending' },
    {
      num: 2,
      title: 'Approved Budget',
      complete: isSection2Complete,
      badge: approvedTotal > 0 ? `₹${approvedTotal.toLocaleString('en-IN')}` : 'Pending',
    },
    { num: 3, title: '8 Timeline Dates', complete: isSection3Complete, badge: isSection3Complete ? 'Configured' : 'Pending' },
    { num: 4, title: 'Terms & Sign-Off', complete: isSection4Complete, badge: termsAcknowledged ? 'Ready' : 'Pending' },
  ];

  const handleFinalSubmit = async () => {
    if (isDecided) return;
    if (!readiness.ready) {
      setErrorMessage('Cannot submit Form B: Gate locked until all SEC members and milestones are submitted.');
      return;
    }

    if (!confirm('Are you sure you want to finalize and issue this Form B Grant Sanction Order? This action locks the application.')) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await submitAdminFormBAction(application.id, {
        decision,
        approvedTotal: decision === 'REJECTED' ? 0 : approvedTotal,
        amounts: approvedAmounts,
        timeline: {
          ...timeline,
          ...(decision === 'REPRESENT' ? { rePresentationDate } : {}),
        },
        note: secRecommendationNote,
        termsAcknowledged,
      });

      setSuccessMessage('Form B Sanction Order submitted successfully.');
      window.location.reload();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit Form B.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm no-print">
        <div className="flex items-center gap-3">
          <Badge
            variant={
              application.status === 'APPROVED'
                ? 'success'
                : application.status === 'REJECTED'
                ? 'danger'
                : 'info'
            }
            className="text-xs"
          >
            {application.status}
          </Badge>
          <span className="text-sm text-gray-700">
            Startup: <strong className="text-gray-900">{application.startup.teamName}</strong> ({application.startup.enrollmentNo})
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/application/${application.id}/print`} target="_blank">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
              <Printer className="w-3.5 h-3.5" /> Printable Form B
            </Button>
          </Link>
          <Link href={`/admin/application/${application.id}/pdf`} target="_blank">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> Form B PDF
            </Button>
          </Link>
          <Link href={`/sec/${application.id}/pdf`} target="_blank">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> Form A PDF
            </Button>
          </Link>
          <Link href={`/dashboard/application/download?applicationId=${application.id}`} target="_blank">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> Startup App PDF
            </Button>
          </Link>
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="text-xs">
              Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* SEC Gate Status Alert Banner */}
      {!readiness.ready && !isDecided && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900 no-print">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-sm font-bold block text-amber-950">
              Form B Gate Locked (Committee Evaluations In Progress)
            </strong>
            <p>
              In accordance with incubator governance, Form B cannot be sanctioned until all committee evaluations are finalized:
            </p>
            <ul className="list-disc pl-5 mt-1">
              <li>
                Individual SEC submissions: <strong>{readiness.submitted} of {readiness.members}</strong> completed.
              </li>
              <li>
                Shared Milestone Form: <strong>{readiness.milestoneSubmitted ? 'Finalized & Locked' : 'Pending Submission'}</strong>.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Mobile Toggle Tabs */}
      <div className="lg:hidden flex border-b border-gray-200 bg-white rounded-lg p-1 shadow-sm no-print">
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            mobileTab === 'form' ? 'bg-brand-primary text-white shadow' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Form B Sanction ({activeSection}/4)
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('app')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            mobileTab === 'app' ? 'bg-brand-primary text-white shadow' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Startup Dossier & SEC Comparison
        </button>
      </div>

      {/* Main Split View Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANE: Application Dossier & SEC Committee Comparison */}
        <div
          className={`lg:col-span-6 lg:h-[calc(100vh-140px)] lg:overflow-y-auto pr-0 lg:pr-2 scrollbar-thin space-y-6 ${
            mobileTab === 'app' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur py-2 px-1 border-b flex items-center justify-between text-xs text-gray-500 font-semibold uppercase tracking-wider">
            <span>Dossier & SEC Assessments</span>
            <span className="text-[11px] font-normal lowercase">Independent scroll</span>
          </div>

          {/* SEC Panel Comparison Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-900">SEC Member Assessments Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              {assessments.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No SEC member assessments submitted yet.</p>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-100 text-gray-700 font-semibold border-b">
                        <tr>
                          <th className="p-2">SEC Member</th>
                          <th className="p-2 text-center">Status Levels</th>
                          <th className="p-2 text-center">Questions</th>
                          <th className="p-2 text-center">Recommended Category</th>
                          <th className="p-2 text-right">Suggested Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {assessments.map((a) => {
                          const sf = a.statusForm || {};
                          const ef = a.experimentForm || {};
                          const qAnswers = Object.values(ef.questions || {});
                          const yes = qAnswers.filter((v) => v === true).length;
                          const no = qAnswers.filter((v) => v === false).length;
                          return (
                            <tr key={a.id} className="hover:bg-gray-50">
                              <td className="p-2">
                                <strong className="text-gray-900 block">{a.member.name}</strong>
                                <span className="text-[10px] text-gray-500 block">
                                  {a.member.designation || 'Panelist'}
                                </span>
                              </td>
                              <td className="p-2 text-center text-[11px]">
                                TRL {sf.trl || '—'} · MRL {sf.mrl || '—'} · IRL {sf.irl || '—'}
                              </td>
                              <td className="p-2 text-center text-[11px]">
                                <span className="text-green-700 font-bold">{yes}Y</span> /{' '}
                                <span className="text-red-700 font-bold">{no}N</span>
                              </td>
                              <td className="p-2 text-center font-semibold text-brand-primary">
                                {ef.grantEvaluation || '—'}
                              </td>
                              <td className="p-2 text-right font-mono font-bold">
                                ₹{Number(ef.suggestedTotal || 0).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* SEC Member Individual Recommendation Notes */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-900">Member Recommendation Notes:</h4>
                    {assessments.map((a) => (
                      <div key={a.id} className="p-2.5 bg-gray-50 rounded border text-xs space-y-1">
                        <strong className="text-gray-900">{a.member.name}:</strong>
                        <p className="italic text-gray-700 whitespace-pre-wrap">
                          {(a.experimentForm as any)?.recommendationNote || 'No specific note entered.'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Startup Application Dossier */}
          <ApplicationViewSection application={application} />
        </div>

        {/* RIGHT PANE: Admin Form B Sanction Order */}
        <div
          ref={rightPaneRef}
          className={`lg:col-span-6 lg:h-[calc(100vh-140px)] lg:overflow-y-auto pl-0 lg:pl-1 scrollbar-thin space-y-4 ${
            mobileTab === 'form' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Section Navigation Pills */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm space-y-2 sticky top-0 z-20 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Form B Sanction Steps
              </span>
              <span className="text-xs text-brand-primary font-semibold">
                Step {activeSection} of 4: {sectionTabs[activeSection - 1].title}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {sectionTabs.map((tab) => (
                <button
                  key={tab.num}
                  type="button"
                  onClick={() => {
                    setActiveSection(tab.num);
                    if (rightPaneRef.current) rightPaneRef.current.scrollTop = 0;
                  }}
                  className={`p-2 rounded text-left transition-all border ${
                    activeSection === tab.num
                      ? 'border-brand-primary bg-brand-primary-light text-brand-primary font-bold shadow-sm'
                      : tab.complete
                      ? 'border-green-200 bg-green-50/60 text-green-900'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs">{tab.num}. {tab.title.split(' ')[0]}</span>
                    {tab.complete && <CheckCircle2 className="w-3 h-3 text-green-600 ml-1 flex-shrink-0" />}
                  </div>
                  <span className="text-[10px] block truncate opacity-80 mt-0.5">{tab.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Alerts */}
          {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
          {successMessage && <Alert variant="success">{successMessage}</Alert>}

          {/* ============================================================== */}
          {/* SECTION 1: DECISION & SUMMARY                                   */}
          {/* ============================================================== */}
          {activeSection === 1 && (
            <Card>
              <CardHeader>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">What the Admin must enter (Form B Header & Decision):</strong>
                    Select the committee's approved grant decision category and summarize the final SEC recommendation notes.
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">1. Approved Grant Decision</CardTitle>
                <CardDescription>Official sanction category determined by the SEC panel.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    Sanction Decision Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    disabled={isDecided}
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-xs font-semibold bg-white"
                  >
                    <option value="Validation Grant">Validation Grant (TRL 2 / MRL 2: ₹5,000–₹20,000)</option>
                    <option value="Proof Grant">Proof Grant (TRL 3 / MRL 3: ₹25,000–₹50,000)</option>
                    <option value="Scaling Grant">Scaling Grant (TRL 4–5 / MRL 4–5: ₹50,000–₹5,00,000)</option>
                    <option value="REPRESENT">Request Re-Presentation (Present Again on Agreed Date)</option>
                    <option value="REJECTED">Application Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    Final Recommendation Note from SEC <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    disabled={isDecided}
                    value={secRecommendationNote}
                    onChange={(e) => setSecRecommendationNote(e.target.value)}
                    placeholder="Enter consolidated SEC recommendation observations..."
                    rows={6}
                    className="text-xs"
                  />
                  <span className="text-[11px] text-gray-500">
                    This note is printed directly onto official Form B and conveyed to institutional leadership.
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t p-4 bg-gray-50/50">
                <div />
                <Button
                  type="button"
                  onClick={() => {
                    setActiveSection(2);
                    if (rightPaneRef.current) rightPaneRef.current.scrollTop = 0;
                  }}
                  className="flex items-center gap-2"
                >
                  Save & Next: Approved Budget <ChevronRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* ============================================================== */}
          {/* SECTION 2: APPROVED BUDGET (9 HEADERS)                         */}
          {/* ============================================================== */}
          {activeSection === 2 && (
            <Card>
              <CardHeader>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">What the Admin must enter (Form B Budget):</strong>
                    Sanction the approved grant allocation under the 9 official Annexure 1 headers. Funds are transferred to vendors or institute prepaid cards, not personal accounts.
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">2. Approved Budget Allocations</CardTitle>
                <CardDescription>
                  Financial allocations sanctioned under official major grant headers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between items-center p-3 bg-brand-primary-light border border-brand-primary/20 rounded-xl">
                  <div>
                    <span className="text-xs text-brand-primary-dark font-medium block">
                      Approved Total Sanction
                    </span>
                    <strong className="text-xl text-brand-primary">
                      ₹{approvedTotal.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <Badge variant="info">Category: {decision}</Badge>
                </div>

                <div className="space-y-2 border rounded-lg p-3 bg-gray-50/50">
                  {BUDGET_HEADERS.map((h, i) => {
                    const amount = approvedAmounts[h.key] ?? 0;
                    return (
                      <div
                        key={h.key}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white rounded border text-xs"
                      >
                        <div className="flex-1 pr-2">
                          <span className="font-semibold text-gray-900 block">
                            {i + 1}. {h.name}
                          </span>
                          <span className="text-[11px] text-gray-500 block leading-tight">
                            {h.desc} {(h as any).needsQuotation ? '· Requires quotation.' : ''}
                          </span>
                        </div>
                        <div className="w-full sm:w-40 flex items-center gap-1.5">
                          <span className="text-gray-500 font-mono">₹</span>
                          <Input
                            type="number"
                            min={0}
                            disabled={isDecided}
                            value={amount}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setApprovedAmounts((prev) => ({ ...prev, [h.key]: val }));
                            }}
                            className="text-right text-xs py-1 h-8 font-semibold"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t p-4 bg-gray-50/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveSection(1)}
                  className="flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setActiveSection(3);
                    if (rightPaneRef.current) rightPaneRef.current.scrollTop = 0;
                  }}
                  className="flex items-center gap-2"
                >
                  Save & Next: Approved Timeline <ChevronRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* ============================================================== */}
          {/* SECTION 3: APPROVED TIMELINE (8 DATES)                         */}
          {/* ============================================================== */}
          {activeSection === 3 && (
            <Card>
              <CardHeader>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">What the Admin must enter (Form B Timeline):</strong>
                    Establish the 8 binding calendar dates for fund release, experiment duration, mid-review, milestone demonstration, and closure.
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">3. Approved Milestones & Timeline</CardTitle>
                <CardDescription>
                  8 official governance milestones recorded for half-yearly audit tracking.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {decision === 'REPRESENT' ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <label className="block text-xs font-bold text-amber-950">
                      Scheduled Re-Presentation Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      disabled={isDecided}
                      value={rePresentationDate}
                      onChange={(e) => setRePresentationDate(e.target.value)}
                      className="text-xs"
                    />
                    <span className="text-xs text-amber-800 block">
                      Agreed date when the startup will present their revised experiment to the committee.
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {FORM_B_TIMELINE_FIELDS.map((f, i) => {
                      const val = timeline[f.id] || '';
                      return (
                        <div key={f.id} className="p-3 bg-gray-50 rounded-lg border space-y-1.5">
                          <label className="font-bold text-gray-900 block">
                            {i + 1}. {f.label}
                          </label>
                          <span className="text-[11px] text-gray-500 block leading-tight">{f.desc}</span>
                          {f.id === 'experimentDuration' ? (
                            <Input
                              type="text"
                              disabled={isDecided}
                              value={val}
                              placeholder="e.g. 4 to 6 months from fund release"
                              onChange={(e) => setTimeline((prev) => ({ ...prev, [f.id]: e.target.value }))}
                              className="text-xs h-8 bg-white"
                            />
                          ) : (
                            <Input
                              type="date"
                              disabled={isDecided}
                              value={val}
                              onChange={(e) => setTimeline((prev) => ({ ...prev, [f.id]: e.target.value }))}
                              className="text-xs h-8 bg-white"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t p-4 bg-gray-50/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveSection(2)}
                  className="flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setActiveSection(4);
                    if (rightPaneRef.current) rightPaneRef.current.scrollTop = 0;
                  }}
                  className="flex items-center gap-2"
                >
                  Save & Next: Terms & Signatories <ChevronRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* ============================================================== */}
          {/* SECTION 4: TERMS & SIGNATORIES                                 */}
          {/* ============================================================== */}
          {activeSection === 4 && (
            <Card>
              <CardHeader>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">What the Admin must verify (Form B Sign-Off):</strong>
                    Confirm statutory institutional terms and inspect the 5 approval signatories populated from system profiles.
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">4. Terms, Conditions & Institutional Approval</CardTitle>
                <CardDescription>
                  Binding institutional conditions and signatories for final sanction order.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-sm">
                {/* Terms and conditions block */}
                <div className="p-4 bg-gray-50 border rounded-xl space-y-3">
                  <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                    Statutory Terms and Conditions (Policy P10 & P11):
                  </h4>
                  <ul className="list-disc pl-5 text-xs text-gray-700 space-y-1.5">
                    {POLICY_TERMS_AND_CONDITIONS.map((term, i) => (
                      <li key={i}>{term}</li>
                    ))}
                  </ul>

                  <label className="flex items-start gap-2 pt-2 border-t text-xs font-semibold text-gray-900 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={isDecided}
                      checked={termsAcknowledged}
                      onChange={(e) => setTermsAcknowledged(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-primary"
                    />
                    <span>
                      I verify that the proposed grant adheres strictly to ITM University Innovation Fund policy and incubation terms.
                    </span>
                  </label>
                </div>

                {/* Approval Signatories from Settings */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                    Official Signatories (Populated from Settings):
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {signatories.map((sig, i) => (
                      <div key={i} className="p-3 bg-white border rounded-lg space-y-1">
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">
                          {sig.title || sig.key || `Signatory ${i + 1}`}
                        </span>
                        <strong className="text-gray-900 block">
                          {sig.name || <span className="text-amber-600 italic">[Pending Name Entry]</span>}
                        </strong>
                        <span className="text-gray-600 block">{sig.designation}</span>
                        {sig.department && (
                          <span className="text-gray-400 block text-[11px]">{sig.department}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row justify-between gap-3 border-t p-4 bg-gray-50/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveSection(3)}
                  className="flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <div className="flex items-center gap-2">
                  {!isDecided ? (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleFinalSubmit}
                      disabled={isSubmitting || !readiness.ready}
                      className="flex items-center gap-1.5"
                    >
                      <Send className="w-4 h-4" /> Issue Final Form B Sanction Order
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-green-700 font-bold text-xs bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                      <ShieldCheck className="w-4 h-4 text-green-600" />
                      Sanction Order Finalized ({application.status})
                    </div>
                  )}
                </div>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
