'use client';

import { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Alert } from '@/components/ui/alert';
import { TIERS, getTierBadgeClasses } from '@/lib/tiers';
import { BUDGET_HEADERS, BudgetHeaderKey } from '@/lib/seedfund-constants';
import { GRANT_EVALUATION_OPTIONS } from '@/lib/consolidated-constants';
import ConsolidatedReportView from '@/components/consolidated/ConsolidatedReportView';
import {
  saveFormBDraftAction,
  submitFormBAction,
  reopenAssessmentAction,
  reopenApplicationAction,
  reassignMilestoneOwnerAction,
  changeTierAction,
  waiveGrantLimitAction,
  reopenFormBAction,
} from '../../actions';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Printer,
  ChevronRight,
  ExternalLink,
  Shield,
  Save,
  Send,
  Lock,
  Sparkles,
  Layers,
  HelpCircle,
  User,
  Info,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  Download,
  FolderArchive,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface AdminApplicationDetailClientProps {
  application: any;
  report: any;
  formBPrefillData: any;
  milestone: any;
  readiness: any;
  activeSecMembers: any[];
}

export default function AdminApplicationDetailClient({
  application,
  report,
  formBPrefillData,
  milestone,
  readiness,
  activeSecMembers,
}: AdminApplicationDetailClientProps) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'report' | 'formb'>('report');

  const { prefill, evaluation, secMajorityKey, secMajorityLabel } = formBPrefillData;

  // Initialize Form B state from existing saved evaluation or prefill
  const initialData = evaluation || prefill;

  const [decision, setDecision] = useState<string>(initialData.decision || prefill.decision || '');
  const [amounts, setAmounts] = useState<Record<string, number>>(() => {
    const raw = initialData.amounts || prefill.approvedAmounts || {};
    const res: Record<string, number> = {};
    for (const h of BUDGET_HEADERS) {
      res[h.key] = Number(raw[h.key]) || 0;
    }
    return res;
  });
  const [timeline, setTimeline] = useState<Record<string, string>>(() => {
    const raw = initialData.timeline || {};
    return {
      grantApprovalDate: raw.grantApprovalDate || '',
      fundReleaseDate: raw.fundReleaseDate || '',
      midReviewDate: raw.midReviewDate || '',
      grantUtilizationDeadline: raw.grantUtilizationDeadline || '',
      experimentCompletionDate: raw.experimentCompletionDate || '',
      finalSubmissionDate: raw.finalSubmissionDate || '',
      closureDate: raw.closureDate || '',
    };
  });
  const [recommendationNote, setRecommendationNote] = useState<string>(
    initialData.note || prefill.note || ''
  );
  const [secDecisionNote, setSecDecisionNote] = useState<string>(
    initialData.secDecisionNote || ''
  );
  const [termsAcknowledged, setTermsAcknowledged] = useState<boolean>(
    initialData.termsAcknowledged ?? true
  );
  const [adminReason, setAdminReason] = useState<string>('Director Form B evaluation');
  const [forced, setForced] = useState<boolean>(initialData.forced || false);
  const [forceReason, setForceReason] = useState<string>(initialData.forceReason || '');

  // UI state
  const [zipModalOpen, setZipModalOpen] = useState(false);
  const [includeDocumentsInZip, setIncludeDocumentsInZip] = useState(false);
  const [powersOpen, setPowersOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Compute approved total live from amounts
  const approvedTotal = useMemo(() => {
    return Object.values(amounts).reduce((sum, val) => sum + (Number(val) || 0), 0);
  }, [amounts]);

  // Check mismatch between SEC majority and Director's decision
  const hasSecMismatch = useMemo(() => {
    if (!secMajorityKey) return false;
    return decision && decision !== secMajorityKey;
  }, [secMajorityKey, decision]);

  // Check tier range
  const tierInfo = useMemo(() => {
    return TIERS.find((t) => t.key === decision);
  }, [decision]);

  const isOutOfRange = useMemo(() => {
    if (!tierInfo || !tierInfo.range || decision === 'EMERGENCY' || decision === 'REJECTED') {
      return false;
    }
    const [min, max] = tierInfo.range;
    return approvedTotal < min || approvedTotal > max;
  }, [tierInfo, decision, approvedTotal]);

  // Reset to prefill handler
  const handleResetToPrefill = () => {
    if (!confirm('Reset all Form B fields to committee prefilled values?')) return;
    setDecision(prefill.decision || '');
    const res: Record<string, number> = {};
    for (const h of BUDGET_HEADERS) {
      res[h.key] = Number(prefill.approvedAmounts?.[h.key]) || 0;
    }
    setAmounts(res);
    setRecommendationNote(prefill.note || '');
    setSecDecisionNote('');
    setTermsAcknowledged(true);
    setFormSuccess('Reset Form B to prefilled committee recommendations.');
  };

  // Save Draft handler
  const handleSaveDraft = () => {
    setFormError(null);
    setFormSuccess(null);

    startTransition(async () => {
      try {
        const payload = {
          decision,
          approvedTotal,
          approvedAmounts: amounts,
          amounts,
          timeline,
          note: recommendationNote,
          secDecisionNote,
          termsAcknowledged,
          forced,
          forceReason,
        };

        const res = await saveFormBDraftAction(application.id, payload, adminReason || 'Save Form B draft');
        if (res.success) {
          setFormSuccess('Form B draft saved successfully!');
        }
      } catch (err: any) {
        setFormError(err.message || 'Failed to save Form B draft');
      }
    });
  };

  // Submit Form B handler
  const handleSubmitFormB = () => {
    setFormError(null);
    setFormSuccess(null);

    if (!decision) {
      setFormError('Please select a final grant decision.');
      return;
    }

    if (hasSecMismatch && !secDecisionNote.trim()) {
      setFormError('SEC Decision Note is required because your decision differs from the SEC majority.');
      return;
    }

    if (!termsAcknowledged) {
      setFormError('You must acknowledge the terms and conditions before submitting.');
      return;
    }

    if (!adminReason.trim()) {
      setFormError('Admin reason is required for auditing.');
      return;
    }

    if (!readiness.ready && !forced) {
      setFormError('SEC member reviews are incomplete. You must check "Force decision" and supply a reason.');
      return;
    }

    if (!readiness.ready && forced && !forceReason.trim()) {
      setFormError('Force reason is required when overriding incomplete reviews.');
      return;
    }

    if (isOutOfRange) {
      const [min, max] = tierInfo?.range || [0, 0];
      setFormError(`Sanctioned total (₹ ${approvedTotal.toLocaleString('en-IN')}) is out of range for ${tierInfo?.label} (₹ ${min.toLocaleString('en-IN')} - ₹ ${max.toLocaleString('en-IN')}).`);
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          decision,
          approvedTotal,
          approvedAmounts: amounts,
          amounts,
          timeline,
          note: recommendationNote,
          secDecisionNote,
          termsAcknowledged,
          forced,
          forceReason,
        };

        const res = await submitFormBAction(application.id, payload, adminReason);
        if (res.success) {
          setFormSuccess('Form B submitted successfully! Grant decision finalized.');
        }
      } catch (err: any) {
        setFormError(err.message || 'Failed to submit Form B');
      }
    });
  };

  const handleDownloadZip = () => {
    setZipModalOpen(false);
    window.location.href = `/api/applications/${application.id}/zip?includeDocuments=${includeDocumentsInZip}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bg-white border rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">
                {application.startup?.teamName || 'Startup Application'}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getTierBadgeClasses(
                  application.grantType
                )}`}
              >
                {application.grantType}
              </span>
              <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full font-mono">
                Status: {application.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-600">
              <div>
                Requested Total:{' '}
                <strong className="text-brand-primary text-sm font-semibold">
                  ₹ {Number(application.requestedTotal || 0).toLocaleString('en-IN')}
                </strong>
              </div>
              <span className="text-gray-300">•</span>
              <div>
                SEC Assessments:{' '}
                <strong className={report.isComplete ? 'text-green-700' : 'text-amber-700'}>
                  {report.submittedAssessments?.length || 0} of 3 submitted
                </strong>
              </div>
              <span className="text-gray-300">•</span>
              <div>
                Milestones:{' '}
                <strong className="text-gray-900">{milestone?.status || 'PENDING'}</strong>
              </div>
            </div>
          </div>

          {/* Download Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/applications/${application.id}/pdf/application`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
              title="Download Startup Application Form as PDF"
            >
              <FileText className="h-4 w-4 text-brand-primary" />
              <span>Application form (PDF)</span>
            </a>

            <a
              href={`/api/applications/${application.id}/pdf/summary`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
              title="Download Consolidated SEC Summary Report (Form A) as PDF"
            >
              <Printer className="h-4 w-4 text-emerald-600" />
              <span>Summary report (PDF)</span>
            </a>

            <a
              href={`/api/applications/${application.id}/pdf/form-b`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
              title="Download Form B Final Grant Evaluation as PDF"
            >
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <span>Final form, Form B (PDF)</span>
            </a>

            <button
              type="button"
              onClick={() => setZipModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 rounded-lg transition shadow-sm"
              title="Download bundle including all 3 PDFs and optional KYC documents"
            >
              <FolderArchive className="h-4 w-4" />
              <span>Download all (ZIP)</span>
            </button>
          </div>
        </div>

        {/* Mobile View Toggle */}
        <div className="flex lg:hidden mt-4 border-t pt-3">
          <div className="grid grid-cols-2 w-full gap-2 text-xs">
            <button
              onClick={() => setActiveTab('report')}
              className={`py-2 font-medium rounded-lg ${
                activeTab === 'report' ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Consolidated Report
            </button>
            <button
              onClick={() => setActiveTab('formb')}
              className={`py-2 font-medium rounded-lg ${
                activeTab === 'formb' ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Form B Workspace
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Pane: Consolidated Report */}
        <div className={`${activeTab === 'formb' ? 'hidden lg:block' : 'block'} space-y-6`}>
          <div className="flex items-center justify-between pb-1 border-b">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="h-5 w-5 text-brand-primary" />
              <span>Consolidated SEC Report (Form A)</span>
            </h2>
            <span className="text-xs text-gray-500">Read-Only Mirror</span>
          </div>

          <ConsolidatedReportView report={report} showSectionAnchors={true} />
        </div>

        {/* Right Pane: Form B Workspace */}
        <div id="form-b" className={`${activeTab === 'report' ? 'hidden lg:block' : 'block'} space-y-6`}>
          <div className="flex items-center justify-between pb-1 border-b">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-primary" />
              <span>Form B Workspace (Grant Evaluation)</span>
            </h2>
            <button
              type="button"
              onClick={handleResetToPrefill}
              className="inline-flex items-center gap-1 text-xs text-brand-primary hover:text-brand-primary/80 font-medium"
              title="Reset all Form B fields back to SEC majority and average recommendations"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to prefill</span>
            </button>
          </div>

          {/* Alerts */}
          {formSuccess && (
            <Alert variant="success" className="text-xs">
              {formSuccess}
            </Alert>
          )}

          {formError && (
            <Alert variant="error" className="text-xs">
              {formError}
            </Alert>
          )}

          {/* Report vs Form B Mismatch Banner */}
          {hasSecMismatch && (
            <Alert variant="warning" className="border-amber-400 bg-amber-50 text-amber-900 text-xs">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Report vs Form B Decision Mismatch</p>
                  <p className="mt-0.5">
                    The SEC majority recommended <strong>{secMajorityLabel}</strong>, but your selected Form B
                    decision is <strong>{decision}</strong>. A written justification note is required below.
                  </p>
                </div>
              </div>
            </Alert>
          )}

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3 border-b bg-gray-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-gray-900">
                    Grant Decision & Budget Sanction
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pre-filled with committee recommendations. Modify as necessary before final approval.
                  </CardDescription>
                </div>
                {evaluation?.status === 'SUBMITTED' ? (
                  <Badge variant="success">Finalized</Badge>
                ) : (
                  <Badge variant="warning">Draft</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              {/* Grant Decision Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Final Grant Decision <span className="text-red-500">*</span>
                </label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                >
                  <option value="">-- Select Decision --</option>
                  {GRANT_EVALUATION_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {secMajorityLabel && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    SEC Majority recommendation was: <strong>{secMajorityLabel}</strong>
                  </p>
                )}
              </div>

              {/* SEC Decision Note (shown & required if mismatch) */}
              {hasSecMismatch && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1">
                  <label className="block text-xs font-bold text-amber-900">
                    SEC Majority Override Note <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={secDecisionNote}
                    onChange={(e) => setSecDecisionNote(e.target.value)}
                    placeholder="Provide specific justification explaining why the final decision departs from the committee majority recommendation..."
                    rows={3}
                    className="text-xs bg-white"
                  />
                </div>
              )}

              {/* Sanctioned Budget Allocation per Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-700">
                    Sanctioned Budget Heads (₹)
                  </label>
                  <span className="text-[11px] text-gray-500">
                    Rounded to nearest ₹10 from funding members
                  </span>
                </div>
                <div className="space-y-2 border rounded-lg p-3 bg-gray-50/50">
                  {BUDGET_HEADERS.map((h) => (
                    <div key={h.key} className="flex items-center justify-between gap-3">
                      <span className="text-gray-700 text-xs truncate max-w-[220px]" title={h.name}>
                        {h.name}
                      </span>
                      <div className="flex items-center gap-1 w-36">
                        <span className="text-gray-400 font-mono text-xs">₹</span>
                        <input
                          type="number"
                          value={amounts[h.key] || 0}
                          onChange={(e) =>
                            setAmounts({
                              ...amounts,
                              [h.key]: Math.max(0, parseInt(e.target.value) || 0),
                            })
                          }
                          className="w-full text-right font-mono text-xs border rounded px-2 py-1 focus:ring-1 focus:ring-brand-primary"
                        />
                      </div>
                    </div>
                  ))}

                  <div className="border-t pt-2 flex items-center justify-between font-bold text-xs">
                    <span className="text-gray-900">Total Sanctioned Grant:</span>
                    <span className="font-mono text-sm text-brand-primary">
                      ₹ {approvedTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Range alert */}
                {isOutOfRange && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    ⚠️ Approved total ₹ {approvedTotal.toLocaleString('en-IN')} is out of range for {tierInfo?.label} (₹ {tierInfo?.range?.[0].toLocaleString('en-IN')} - ₹ {tierInfo?.range?.[1].toLocaleString('en-IN')}).
                  </p>
                )}
              </div>

              {/* Recommendation Note */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Final Recommendation / Sanction Note
                </label>
                <Textarea
                  value={recommendationNote}
                  onChange={(e) => setRecommendationNote(e.target.value)}
                  placeholder="Concatenated member observations or Director instructions..."
                  rows={4}
                  className="text-xs"
                />
              </div>

              {/* Implementation Timeline */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Project Implementation Timeline
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border">
                  <div>
                    <label className="text-[11px] text-gray-600 block mb-0.5">1. Grant Approval Date</label>
                    <input
                      type="date"
                      value={timeline.grantApprovalDate}
                      onChange={(e) => setTimeline({ ...timeline, grantApprovalDate: e.target.value })}
                      className="w-full text-xs border rounded px-2 py-1 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 block mb-0.5">2. Fund Release Date</label>
                    <input
                      type="date"
                      value={timeline.fundReleaseDate}
                      onChange={(e) => setTimeline({ ...timeline, fundReleaseDate: e.target.value })}
                      className="w-full text-xs border rounded px-2 py-1 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 block mb-0.5">3. Mid-Review Date</label>
                    <input
                      type="date"
                      value={timeline.midReviewDate}
                      onChange={(e) => setTimeline({ ...timeline, midReviewDate: e.target.value })}
                      className="w-full text-xs border rounded px-2 py-1 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 block mb-0.5">4. Grant Utilization Deadline</label>
                    <input
                      type="date"
                      value={timeline.grantUtilizationDeadline}
                      onChange={(e) => setTimeline({ ...timeline, grantUtilizationDeadline: e.target.value })}
                      className="w-full text-xs border rounded px-2 py-1 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 block mb-0.5">5. Experiment Completion Date</label>
                    <input
                      type="date"
                      value={timeline.experimentCompletionDate}
                      onChange={(e) => setTimeline({ ...timeline, experimentCompletionDate: e.target.value })}
                      className="w-full text-xs border rounded px-2 py-1 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 block mb-0.5">6. Final Submission Date</label>
                    <input
                      type="date"
                      value={timeline.finalSubmissionDate}
                      onChange={(e) => setTimeline({ ...timeline, finalSubmissionDate: e.target.value })}
                      className="w-full text-xs border rounded px-2 py-1 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-gray-600 block mb-0.5">7. Project Closure Date</label>
                    <input
                      type="date"
                      value={timeline.closureDate}
                      onChange={(e) => setTimeline({ ...timeline, closureDate: e.target.value })}
                      className="w-full text-xs border rounded px-2 py-1 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Terms and Conditions Checkbox */}
              <div className="flex items-start gap-2 pt-2 border-t">
                <input
                  id="tc-check"
                  type="checkbox"
                  checked={termsAcknowledged}
                  onChange={(e) => setTermsAcknowledged(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                />
                <label htmlFor="tc-check" className="text-xs text-gray-700">
                  I acknowledge and confirm the IDEAPAD Seed Grant terms, fund utilization guidelines, and university governance policies for this grant sanction.
                </label>
              </div>

              {/* Admin Typed Reason (Required for all actions) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Admin Action Reason (Audited) <span className="text-red-500">*</span>
                </label>
                <Input
                  value={adminReason}
                  onChange={(e) => setAdminReason(e.target.value)}
                  placeholder="Reason recorded in audit ledger..."
                  className="text-xs"
                />
              </div>

              {/* Force Decision (if not ready) */}
              {!readiness.ready && (
                <div className="p-3 bg-red-50/70 border border-red-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      id="force-check"
                      type="checkbox"
                      checked={forced}
                      onChange={(e) => setForced(e.target.checked)}
                      className="h-4 w-4 rounded text-red-600 focus:ring-red-500"
                    />
                    <label htmlFor="force-check" className="font-bold text-red-900 text-xs">
                      Force Decision (Incomplete Committee Reviews)
                    </label>
                  </div>
                  {forced && (
                    <div>
                      <label className="block text-[11px] font-semibold text-red-800 mb-0.5">
                        Force Override Justification Reason <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={forceReason}
                        onChange={(e) => setForceReason(e.target.value)}
                        placeholder="Explain why decision is made before all 3 committee members submitted..."
                        className="text-xs bg-white"
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex items-center justify-between gap-3 border-t bg-gray-50/50 py-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSaveDraft}
                disabled={isPending}
                loading={isPending}
                className="text-xs"
              >
                <Save className="h-4 w-4 mr-1.5" />
                Save Draft
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSubmitFormB}
                disabled={isPending}
                loading={isPending}
                className="text-xs"
              >
                <Send className="h-4 w-4 mr-1.5" />
                Submit Form B Decision
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* ZIP Download Modal with Sensitive Docs Checkbox */}
      <Modal
        isOpen={zipModalOpen}
        onClose={() => setZipModalOpen(false)}
        title="Download Complete Application Bundle"
        className="max-w-lg"
      >
        <div className="space-y-4 text-xs">
          <p className="text-gray-700">
            The standard download bundle compiles three official PDF documents into an archived ZIP file:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>
              <strong>Application Form PDF:</strong> Profile, agreement, problem, solution, traction, and 10-field experiment definition.
            </li>
            <li>
              <strong>Consolidated SEC Summary PDF:</strong> Full 7-section Form A comparison matrix with landscape status tables.
            </li>
            <li>
              <strong>Form B PDF:</strong> Official sanctioned grant evaluation with timeline and 5 signature blocks.
            </li>
          </ul>

          <div className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-lg space-y-2">
            <div className="flex items-start gap-2.5">
              <input
                id="include-docs-check"
                type="checkbox"
                checked={includeDocumentsInZip}
                onChange={(e) => setIncludeDocumentsInZip(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-400 text-brand-primary focus:ring-brand-primary"
              />
              <label htmlFor="include-docs-check" className="font-semibold text-amber-900 cursor-pointer">
                Also include uploaded documents (PAN, Aadhaar, photos, quotations, deck)
              </label>
            </div>
            <p className="text-[11px] text-amber-800 pl-6 leading-relaxed">
              ⚠️ <strong>Warning:</strong> Uploaded attachments contain sensitive personally identifiable information (KYC credentials, identity cards, PAN/Aadhaar). This option is disabled by default. If included, attachments will be saved securely inside a <code>documents/</code> subfolder.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setZipModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleDownloadZip}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Download ZIP Bundle
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
