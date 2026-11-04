'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import ApplicationViewSection from '@/components/application/ApplicationViewSection';
import {
  LEVELS,
  MILESTONES,
  TRACK_LABELS,
  EXPERIMENT_QUESTIONS,
  BUDGET_HEADERS,
} from '@/lib/seedfund-constants';
import {
  saveAssessmentDraftAction,
  submitAssessmentFinalAction,
  claimMilestoneAction,
  updateMilestoneStateAction,
  addMilestoneRemarkAction,
  submitMilestoneAction,
} from '@/app/(sec)/sec/[id]/actions';
import {
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  Printer,
  Sparkles,
  Info,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';

interface SecEvaluationFormProps {
  application: any;
  initialAssessment: any;
  currentUserId: string;
  currentUserName: string;
}

export default function SecEvaluationForm({
  application,
  initialAssessment,
  currentUserId,
  currentUserName,
}: SecEvaluationFormProps) {
  const isLocked = initialAssessment?.status === 'SUBMITTED';

  // Section navigation state: 1 to 5
  const [activeSection, setActiveSection] = useState<number>(1);
  const [mobileTab, setMobileTab] = useState<'app' | 'form'>('form');

  // References for scrolling
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);

  // Status & Notifications
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // SECTION 1: Pre-checks
  const [preChecks, setPreChecks] = useState({
    termsAgreed: initialAssessment?.statusForm?.preChecks?.termsAgreed || false,
    deckReviewed: initialAssessment?.statusForm?.preChecks?.deckReviewed || false,
    priorFundingChecked: initialAssessment?.statusForm?.preChecks?.priorFundingChecked || false,
    goAheadGiven: initialAssessment?.statusForm?.preChecks?.goAheadGiven || false,
  });

  // SECTION 2: Status Levels (TRL, MRL, IRL 1-9)
  const [levels, setLevels] = useState({
    trl: initialAssessment?.statusForm?.trl || 0,
    mrl: initialAssessment?.statusForm?.mrl || 0,
    irl: initialAssessment?.statusForm?.irl || 0,
  });

  // SECTION 3: Shared Milestones
  const [milestoneTrack, setMilestoneTrack] = useState<'PROTOTYPING' | 'PROFESSIONAL'>(
    (application.milestone?.track as any) ||
      (application.formData?.selfAssessment?.track as any) ||
      'PROTOTYPING'
  );
  const [milestoneItems, setMilestoneItems] = useState<any[]>(
    application.milestone?.items || []
  );
  const [myMilestoneRemarks, setMyMilestoneRemarks] = useState<Record<string, string>>({});
  const isMilestoneOwner = application.milestone?.ownerId === currentUserId;
  const isMilestoneSubmitted = application.milestone?.status === 'SUBMITTED';

  // SECTION 4: 12 Questions (Experiment Assessment)
  // Store as Record<string, boolean> where key is q1...q12
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, boolean>>(
    initialAssessment?.experimentForm?.questions || {}
  );
  const [questionNotes, setQuestionNotes] = useState<string>(
    initialAssessment?.experimentForm?.questionNotes || ''
  );

  // SECTION 5: Evaluation & Budget Moderation
  const [recommendationNote, setRecommendationNote] = useState<string>(
    initialAssessment?.experimentForm?.recommendationNote || ''
  );
  const [grantEvaluation, setGrantEvaluation] = useState<string>(
    initialAssessment?.experimentForm?.grantEvaluation || ''
  );
  const [suggestedAmounts, setSuggestedAmounts] = useState<Record<string, number>>(() => {
    const existing = initialAssessment?.experimentForm?.suggestedAmounts;
    if (existing) return existing;
    // Pre-populate with startup's requested amounts per header
    const initAmounts: Record<string, number> = {};
    for (const h of BUDGET_HEADERS) {
      const items = (application.budgetItems || []).filter((b: any) => b.header === h.key);
      const sum = items.reduce((acc: number, it: any) => acc + (Number(it.total) || 0), 0);
      initAmounts[h.key] = Math.round(sum);
    }
    return initAmounts;
  });

  // Total suggested amount
  const suggestedTotal = Object.values(suggestedAmounts).reduce((a, b) => a + (Number(b) || 0), 0);

  // Synchronize left pane scrolling when active section changes
  useEffect(() => {
    const sectionAnchorMap: Record<number, string> = {
      1: 'app-view-profile',
      2: 'app-view-self-assessment',
      3: 'app-view-milestones',
      4: 'app-view-experiment',
      5: 'app-view-budget',
    };

    const anchorId = sectionAnchorMap[activeSection];
    if (anchorId) {
      const targetElement = document.getElementById(anchorId);
      if (targetElement && leftPaneRef.current) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [activeSection]);

  // Warn before leaving if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isLocked) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isLocked]);

  // Section completion checks
  const isSection1Complete = preChecks.termsAgreed && preChecks.deckReviewed && preChecks.goAheadGiven;
  const isSection2Complete = levels.trl > 0 && levels.mrl > 0 && levels.irl > 0;
  const isSection3Complete = !!application.milestone;
  const answeredQuestionsCount = Object.keys(questionAnswers).length;
  const isSection4Complete = answeredQuestionsCount === 12;
  const isSection5Complete = !!grantEvaluation && recommendationNote.trim().length >= 10;

  // Decision guide computation
  const yesCount = Object.values(questionAnswers).filter((v) => v === true).length;
  const noCount = Object.values(questionAnswers).filter((v) => v === false).length;

  let decisionRecommendation = 'Pending Question Answers';
  let decisionBadgeVariant: 'default' | 'success' | 'warning' | 'danger' = 'default';
  if (answeredQuestionsCount >= 6) {
    if (yesCount >= 9) {
      decisionRecommendation = 'Recommend Funding (TRL-3 likely)';
      decisionBadgeVariant = 'success';
    } else if (noCount >= 4) {
      decisionRecommendation = 'Revision Required Before Approval';
      decisionBadgeVariant = 'danger';
    } else {
      decisionRecommendation = 'Borderline / Committee Discretion';
      decisionBadgeVariant = 'warning';
    }
  }

  // Save current assessment draft
  const handleSaveDraft = async (advanceToNext: boolean = false) => {
    if (isLocked) return;
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccessMsg(null);

    try {
      const statusFormData = {
        preChecks,
        trl: levels.trl,
        mrl: levels.mrl,
        irl: levels.irl,
      };

      const experimentFormData = {
        questions: questionAnswers,
        questionNotes,
        recommendationNote,
        grantEvaluation,
        suggestedAmounts,
        suggestedTotal,
      };

      await saveAssessmentDraftAction(application.id, {
        statusForm: statusFormData,
        experimentForm: experimentFormData,
      });

      setIsDirty(false);
      setSaveSuccessMsg('Section draft saved successfully.');
      setTimeout(() => setSaveSuccessMsg(null), 3500);

      if (advanceToNext && activeSection < 5) {
        setActiveSection((prev) => prev + 1);
        if (rightPaneRef.current) {
          rightPaneRef.current.scrollTop = 0;
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save assessment draft.');
    } finally {
      setIsSaving(false);
    }
  };

  // Final Submit validation and execution
  const handleFinalSubmit = async () => {
    if (isLocked) return;

    // Detailed section validation
    const missingSections: string[] = [];
    if (!isSection1Complete) missingSections.push('1. Pre-checks (Checklist items)');
    if (!isSection2Complete) missingSections.push('2. Status Levels (TRL, MRL, and IRL must be evaluated)');
    if (!isSection4Complete) missingSections.push(`4. 12 Questions (Currently ${answeredQuestionsCount}/12 answered)`);
    if (!isSection5Complete) missingSections.push('5. Evaluation & Budget (Grant category & recommendation note required)');

    if (missingSections.length > 0) {
      setErrorMessage(
        `Please complete the following required sections before final submit:\n• ${missingSections.join('\n• ')}`
      );
      return;
    }

    if (!confirm('Are you sure you want to finalize and lock your SEC evaluation? Once submitted, it cannot be edited.')) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const statusFormData = {
        preChecks,
        trl: levels.trl,
        mrl: levels.mrl,
        irl: levels.irl,
      };

      const experimentFormData = {
        questions: questionAnswers,
        questionNotes,
        recommendationNote,
        grantEvaluation,
        suggestedAmounts,
        suggestedTotal,
      };

      await submitAssessmentFinalAction(application.id, {
        statusForm: statusFormData,
        experimentForm: experimentFormData,
      });

      setIsDirty(false);
      window.location.reload();
    } catch (err: any) {
      setErrorMessage(err.message || 'Final submission failed.');
    } finally {
      setIsSaving(false);
    }
  };

  // Shared milestone actions
  const handleClaimMilestone = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const names = MILESTONES[milestoneTrack];
      await claimMilestoneAction(application.id, milestoneTrack, names);
      window.location.reload();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to claim milestone form.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateMilestoneItem = async (itemId: string, newState: 'COMPLETED' | 'PENDING' | 'IN_PROGRESS', remark?: string) => {
    try {
      await updateMilestoneStateAction(application.id, itemId, newState, remark);
      setMilestoneItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, state: newState, ownerRemark: remark } : it))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update milestone item.');
    }
  };

  const handleAddPeerRemark = async (itemId: string) => {
    const remark = myMilestoneRemarks[itemId];
    if (!remark || !remark.trim()) return;
    try {
      await addMilestoneRemarkAction(application.id, itemId, remark.trim());
      alert('Peer remark added.');
    } catch (err: any) {
      alert(err.message || 'Failed to add peer remark.');
    }
  };

  const handleSubmitMilestoneForm = async () => {
    if (!confirm('Submit and lock the shared milestone assessment?')) return;
    try {
      await submitMilestoneAction(application.id);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Failed to submit milestone form.');
    }
  };

  const sectionTitles = [
    { num: 1, title: 'Pre-checks', complete: isSection1Complete, badge: isSection1Complete ? 'Complete' : 'Pending' },
    {
      num: 2,
      title: 'Status Levels',
      complete: isSection2Complete,
      badge: isSection2Complete ? `TRL ${levels.trl} · MRL ${levels.mrl} · IRL ${levels.irl}` : 'Pending',
    },
    { num: 3, title: 'Shared Milestones', complete: isSection3Complete, badge: isSection3Complete ? 'Initialized' : 'Pending' },
    { num: 4, title: '12 Questions', complete: isSection4Complete, badge: `${answeredQuestionsCount}/12` },
    { num: 5, title: 'Evaluation & Budget', complete: isSection5Complete, badge: isSection5Complete ? 'Complete' : 'Pending' },
  ];

  return (
    <div className="space-y-4">
      {/* Top Bar with Status and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm no-print">
        <div className="flex items-center gap-3">
          <Badge variant={isLocked ? 'success' : 'warning'} className="text-xs">
            {isLocked ? 'Assessment Submitted & Locked' : 'Assessment in Draft'}
          </Badge>
          <span className="text-sm text-gray-600">
            Evaluator: <strong className="text-gray-900">{currentUserName}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/sec/${application.id}/print`} target="_blank">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <Printer className="w-4 h-4" /> Printable Form A
            </Button>
          </Link>
          <Link href="/sec">
            <Button variant="ghost" size="sm">
              Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile Toggle Tabs */}
      <div className="lg:hidden flex border-b border-gray-200 bg-white rounded-lg p-1 shadow-sm no-print">
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            mobileTab === 'form' ? 'bg-brand-primary text-white shadow' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Form A Evaluation ({activeSection}/5)
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('app')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            mobileTab === 'app' ? 'bg-brand-primary text-white shadow' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Startup Application View
        </button>
      </div>

      {/* Main Split View Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANE: Startup Application (Read-Only) */}
        <div
          ref={leftPaneRef}
          className={`lg:col-span-6 lg:h-[calc(100vh-140px)] lg:overflow-y-auto pr-0 lg:pr-2 scrollbar-thin ${
            mobileTab === 'app' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur py-2 px-1 mb-2 border-b flex items-center justify-between text-xs text-gray-500 font-semibold uppercase tracking-wider">
            <span>Startup Application Dossier</span>
            <span className="text-[11px] font-normal lowercase">Independent scroll</span>
          </div>
          <ApplicationViewSection application={application} />
        </div>

        {/* RIGHT PANE: SEC Evaluation Form (Form A) */}
        <div
          ref={rightPaneRef}
          className={`lg:col-span-6 lg:h-[calc(100vh-140px)] lg:overflow-y-auto pl-0 lg:pl-1 scrollbar-thin space-y-4 ${
            mobileTab === 'form' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Section Step Navigation Pills */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm space-y-2 sticky top-0 z-20 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Form A Sections
              </span>
              <span className="text-xs text-brand-primary font-semibold">
                Step {activeSection} of 5: {sectionTitles[activeSection - 1].title}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {sectionTitles.map((sec) => (
                <button
                  key={sec.num}
                  type="button"
                  onClick={() => {
                    setActiveSection(sec.num);
                    if (rightPaneRef.current) rightPaneRef.current.scrollTop = 0;
                  }}
                  className={`p-2 rounded text-left transition-all border ${
                    activeSection === sec.num
                      ? 'border-brand-primary bg-brand-primary-light text-brand-primary font-bold shadow-sm'
                      : sec.complete
                      ? 'border-green-200 bg-green-50/60 text-green-900'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs">{sec.num}. {sec.title.split(' ')[0]}</span>
                    {sec.complete && <CheckCircle2 className="w-3 h-3 text-green-600 ml-1 flex-shrink-0" />}
                  </div>
                  <span className="text-[10px] block truncate opacity-80 mt-0.5">{sec.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Feedback & Error Alerts */}
          {saveSuccessMsg && <Alert variant="success">{saveSuccessMsg}</Alert>}
          {errorMessage && (
            <Alert variant="error" className="whitespace-pre-line">
              {errorMessage}
            </Alert>
          )}

          {/* ============================================================== */}
          {/* SECTION 1: PRE-CHECKS                                          */}
          {/* ============================================================== */}
          {activeSection === 1 && (
            <Card>
              <CardHeader>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">What the SEC must check (SOP Steps 1–6):</strong>
                    Verify terms agreement, paperwork completeness, pitch deck received 2 days prior, and compliance with prior grant utilization before presentation go-ahead.
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">1. Committee Pre-Checks & Compliance</CardTitle>
                <CardDescription>
                  Confirm that procedural and paperwork requirements have been fulfilled.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <label className="flex items-start gap-3 p-3 bg-gray-50 border rounded-lg cursor-pointer hover:bg-gray-100/80">
                  <input
                    type="checkbox"
                    disabled={isLocked}
                    checked={preChecks.termsAgreed}
                    onChange={(e) => {
                      setPreChecks((prev) => ({ ...prev, termsAgreed: e.target.checked }));
                      setIsDirty(true);
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      1. Terms & Conditions Agreement
                    </span>
                    <span className="text-xs text-gray-600">
                      The startup agrees to IDEAPAD's terms and has completed all initial incubation paperwork.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-gray-50 border rounded-lg cursor-pointer hover:bg-gray-100/80">
                  <input
                    type="checkbox"
                    disabled={isLocked}
                    checked={preChecks.deckReviewed}
                    onChange={(e) => {
                      setPreChecks((prev) => ({ ...prev, deckReviewed: e.target.checked }));
                      setIsDirty(true);
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      2. Pitch Deck Examination (2 Days Prior)
                    </span>
                    <span className="text-xs text-gray-600">
                      Committee member received and reviewed the startup's pitch deck prior to the scheduled presentation.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-gray-50 border rounded-lg cursor-pointer hover:bg-gray-100/80">
                  <input
                    type="checkbox"
                    disabled={isLocked}
                    checked={preChecks.priorFundingChecked}
                    onChange={(e) => {
                      setPreChecks((prev) => ({ ...prev, priorFundingChecked: e.target.checked }));
                      setIsDirty(true);
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      3. Prior Funding Compliance & Utilization
                    </span>
                    <span className="text-xs text-gray-600">
                      Checked prior funding (if any) for compliance of norms and effective utilization of earlier grants.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-gray-50 border rounded-lg cursor-pointer hover:bg-gray-100/80">
                  <input
                    type="checkbox"
                    disabled={isLocked}
                    checked={preChecks.goAheadGiven}
                    onChange={(e) => {
                      setPreChecks((prev) => ({ ...prev, goAheadGiven: e.target.checked }));
                      setIsDirty(true);
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      4. Presentation Go-Ahead
                    </span>
                    <span className="text-xs text-gray-600">
                      Go-ahead granted to the startup to present their current state of project and fund justification.
                    </span>
                  </div>
                </label>
              </CardContent>
              <CardFooter className="flex justify-between border-t p-4 bg-gray-50/50">
                <div />
                <Button
                  type="button"
                  onClick={() => handleSaveDraft(true)}
                  disabled={isSaving || isLocked}
                  className="flex items-center gap-2"
                >
                  {isSaving ? 'Saving...' : 'Save & Next: Status Levels'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* ============================================================== */}
          {/* SECTION 2: STATUS LEVELS (TRL, MRL, IRL 1-9)                   */}
          {/* ============================================================== */}
          {activeSection === 2 && (
            <Card>
              <CardHeader>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">What the SEC must check (Form A Part 1):</strong>
                    Mark the achieved level on three 9-level scales based on the idea pitch presentation: Technology Readiness (TRL), Manufacturing Readiness (MRL), and Integration Readiness (IRL).
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">2. Current Status Assessment</CardTitle>
                <CardDescription>
                  Evaluate the current maturity level demonstrated during the startup presentation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-sm">
                {/* TRL Scale */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="font-bold text-gray-900">
                      Technology Readiness Level (TRL 1–9)
                    </label>
                    {levels.trl > 0 && (
                      <Badge variant="info">
                        Selected: TRL {levels.trl} ({LEVELS.TRL[levels.trl - 1]})
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {LEVELS.TRL.map((desc, idx) => {
                      const lvl = idx + 1;
                      const isSelected = levels.trl === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          disabled={isLocked}
                          onClick={() => {
                            setLevels((prev) => ({ ...prev, trl: lvl }));
                            setIsDirty(true);
                          }}
                          className={`p-2.5 text-left rounded border transition-all ${
                            isSelected
                              ? 'bg-brand-primary text-white border-brand-primary font-semibold shadow'
                              : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-200'
                          }`}
                        >
                          <span className="block text-xs font-bold">TRL {lvl}</span>
                          <span className="text-[11px] block opacity-90 leading-tight mt-0.5">{desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* MRL Scale */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="font-bold text-gray-900">
                      Manufacturing Readiness Level (MRL 1–9)
                    </label>
                    {levels.mrl > 0 && (
                      <Badge variant="info">
                        Selected: MRL {levels.mrl} ({LEVELS.MRL[levels.mrl - 1]})
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {LEVELS.MRL.map((desc, idx) => {
                      const lvl = idx + 1;
                      const isSelected = levels.mrl === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          disabled={isLocked}
                          onClick={() => {
                            setLevels((prev) => ({ ...prev, mrl: lvl }));
                            setIsDirty(true);
                          }}
                          className={`p-2.5 text-left rounded border transition-all ${
                            isSelected
                              ? 'bg-brand-primary text-white border-brand-primary font-semibold shadow'
                              : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-200'
                          }`}
                        >
                          <span className="block text-xs font-bold">MRL {lvl}</span>
                          <span className="text-[11px] block opacity-90 leading-tight mt-0.5">{desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* IRL Scale */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="font-bold text-gray-900">
                      Integration Readiness Level (IRL 1–9)
                    </label>
                    {levels.irl > 0 && (
                      <Badge variant="info">
                        Selected: IRL {levels.irl} ({LEVELS.IRL[levels.irl - 1]})
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {LEVELS.IRL.map((desc, idx) => {
                      const lvl = idx + 1;
                      const isSelected = levels.irl === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          disabled={isLocked}
                          onClick={() => {
                            setLevels((prev) => ({ ...prev, irl: lvl }));
                            setIsDirty(true);
                          }}
                          className={`p-2.5 text-left rounded border transition-all ${
                            isSelected
                              ? 'bg-brand-primary text-white border-brand-primary font-semibold shadow'
                              : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-200'
                          }`}
                        >
                          <span className="block text-xs font-bold">IRL {lvl}</span>
                          <span className="text-[11px] block opacity-90 leading-tight mt-0.5">{desc}</span>
                        </button>
                      );
                    })}
                  </div>
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
                  onClick={() => handleSaveDraft(true)}
                  disabled={isSaving || isLocked}
                  className="flex items-center gap-2"
                >
                  {isSaving ? 'Saving...' : 'Save & Next: Milestones'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* ============================================================== */}
          {/* SECTION 3: SHARED MILESTONES (Form A Part 2)                   */}
          {/* ============================================================== */}
          {activeSection === 3 && (
            <Card>
              <CardHeader>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">What the SEC must check (Form A Part 2):</strong>
                    ONE shared form across all 3 SEC members, filled by the starting member. Corrections require signed approval on the printed Form A. Peer remarks are visible to all members.
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">3. Milestone Assessment (Shared Committee Form)</CardTitle>
                <CardDescription>
                  Two milestone sets: Idea Prototyping (Set A) and Professional Practice (Set B).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-sm">
                {!application.milestone ? (
                  <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-4">
                    <div className="flex items-center gap-2 text-amber-900 font-bold">
                      <Clock className="w-5 h-5 text-amber-700" />
                      Milestone Assessment Not Yet Claimed
                    </div>
                    <p className="text-xs text-amber-800">
                      As the evaluating SEC member, you can initialize the shared milestone form for this application. Select the relevant milestone track:
                    </p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                        <input
                          type="radio"
                          name="track"
                          value="PROTOTYPING"
                          checked={milestoneTrack === 'PROTOTYPING'}
                          onChange={() => setMilestoneTrack('PROTOTYPING')}
                        />
                        Set A: Idea Prototyping and Proof of Concept (Problem-Solution fit)
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                        <input
                          type="radio"
                          name="track"
                          value="PROFESSIONAL"
                          checked={milestoneTrack === 'PROFESSIONAL'}
                          onChange={() => setMilestoneTrack('PROFESSIONAL')}
                        />
                        Set B: Professional Practice and Entrepreneurship Development (Entrepreneurial fit)
                      </label>
                    </div>
                    <Button type="button" onClick={handleClaimMilestone} disabled={isSaving || isLocked}>
                      Initialize & Claim Shared Milestones
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-50 border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-gray-500 block">Active Track</span>
                        <strong className="text-brand-primary text-sm">
                          {TRACK_LABELS[application.milestone.track as 'PROTOTYPING' | 'PROFESSIONAL'] || application.milestone.track}
                        </strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={isMilestoneSubmitted ? 'success' : 'warning'}>
                          {isMilestoneSubmitted ? 'Milestones Finalized' : 'In Progress (Draft)'}
                        </Badge>
                        <span className="text-gray-500">
                          Owner: <strong>{isMilestoneOwner ? 'You' : application.milestone.owner?.name || 'Peer Evaluator'}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Milestone Items List */}
                    <div className="space-y-3">
                      {milestoneItems.map((item, idx) => (
                        <div key={item.id} className="p-3.5 bg-gray-50 rounded-lg border space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="font-semibold text-gray-900 text-xs">
                              {idx + 1}. {item.name}
                            </span>
                            <div className="flex items-center gap-2">
                              {isMilestoneOwner && !isMilestoneSubmitted ? (
                                <select
                                  value={item.state}
                                  onChange={(e) =>
                                    handleUpdateMilestoneItem(item.id, e.target.value as any, item.ownerRemark)
                                  }
                                  className="text-xs border rounded p-1 font-semibold bg-white"
                                >
                                  <option value="PENDING">PENDING</option>
                                  <option value="IN_PROGRESS">IN PROGRESS</option>
                                  <option value="COMPLETED">COMPLETED</option>
                                </select>
                              ) : (
                                <Badge variant={item.state === 'COMPLETED' ? 'success' : 'default'}>
                                  {item.state}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Owner remark */}
                          {item.ownerRemark && (
                            <p className="text-xs text-gray-600 italic bg-white p-2 rounded border">
                              Owner note: "{item.ownerRemark}"
                            </p>
                          )}

                          {/* Peer Remarks */}
                          <div className="pt-2 border-t text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Add your evaluator remark on this milestone..."
                                value={myMilestoneRemarks[item.id] || ''}
                                onChange={(e) =>
                                  setMyMilestoneRemarks((prev) => ({ ...prev, [item.id]: e.target.value }))
                                }
                                className="flex-1 border rounded px-2.5 py-1 text-xs"
                                disabled={isLocked}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddPeerRemark(item.id)}
                                disabled={isLocked}
                              >
                                Add Note
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {isMilestoneOwner && !isMilestoneSubmitted && (
                      <div className="pt-4 border-t flex justify-end">
                        <Button
                          type="button"
                          variant="primary"
                          onClick={handleSubmitMilestoneForm}
                          className="flex items-center gap-2"
                        >
                          <ShieldCheck className="w-4 h-4" /> Finalize & Lock Shared Milestone Form
                        </Button>
                      </div>
                    )}
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
                  onClick={() => handleSaveDraft(true)}
                  disabled={isSaving || isLocked}
                  className="flex items-center gap-2"
                >
                  {isSaving ? 'Saving...' : 'Save & Next: 12 Questions'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* ============================================================== */}
          {/* SECTION 4: 12 QUESTIONS (Form A Part 3)                        */}
          {/* ============================================================== */}
          {activeSection === 4 && (
            <Card>
              <CardHeader>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">What the SEC must check (Form A Part 3):</strong>
                    Answer all 12 questions (Yes/No). Refer to question numbers in the notes box. Decision guide: Mostly YES means recommend funding (TRL-3 likely); multiple NO means revision required before approval.
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between p-3 bg-gray-50 border rounded-lg">
                  <div>
                    <span className="text-xs text-gray-500 block">Committee Decision Helper</span>
                    <span className="text-xs font-bold text-gray-900">
                      Answered: {answeredQuestionsCount}/12 · Yes: {yesCount} · No: {noCount}
                    </span>
                  </div>
                  <Badge variant={decisionBadgeVariant}>{decisionRecommendation}</Badge>
                </div>

                <CardTitle className="text-lg mt-3">4. TRL 2 / TRL 3 Experiment Assessment</CardTitle>
                <CardDescription>
                  12 evaluation rubrics across Technical Soundness, Market Worthiness, and Execution Readiness.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-sm">
                {/* Questions Grouped by Category */}
                {(['A. Technical Soundness', 'B. Market Worthiness', 'C. Execution Readiness'] as const).map(
                  (cat) => {
                    const groupQuestions = EXPERIMENT_QUESTIONS.filter((q) => q.category === cat);
                    return (
                      <div key={cat} className="space-y-3">
                        <h4 className="font-bold text-gray-900 text-xs border-b pb-1 uppercase tracking-wider text-brand-primary">
                          {cat}
                        </h4>
                        <div className="space-y-2.5">
                          {groupQuestions.map((q) => {
                            const val = questionAnswers[q.id];
                            return (
                              <div
                                key={q.id}
                                className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                  val === true
                                    ? 'bg-green-50/50 border-green-200'
                                    : val === false
                                    ? 'bg-red-50/50 border-red-200'
                                    : 'bg-white border-gray-200'
                                }`}
                              >
                                <span className="text-xs font-medium text-gray-900 flex-1">
                                  {q.num}. {q.text}
                                </span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    type="button"
                                    disabled={isLocked}
                                    onClick={() => {
                                      setQuestionAnswers((prev) => ({ ...prev, [q.id]: true }));
                                      setIsDirty(true);
                                    }}
                                    className={`px-3 py-1 text-xs font-bold rounded border transition-colors ${
                                      val === true
                                        ? 'bg-green-600 text-white border-green-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-green-50'
                                    }`}
                                  >
                                    YES
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isLocked}
                                    onClick={() => {
                                      setQuestionAnswers((prev) => ({ ...prev, [q.id]: false }));
                                      setIsDirty(true);
                                    }}
                                    className={`px-3 py-1 text-xs font-bold rounded border transition-colors ${
                                      val === false
                                        ? 'bg-red-600 text-white border-red-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-red-50'
                                    }`}
                                  >
                                    NO
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                )}

                {/* Question Notes Box */}
                <div className="space-y-1.5 pt-2 border-t">
                  <label className="block text-xs font-bold text-gray-900">
                    Evaluator Question Notes (Refer to question numbers)
                  </label>
                  <Textarea
                    disabled={isLocked}
                    value={questionNotes}
                    onChange={(e) => {
                      setQuestionNotes(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="e.g. Q3: core technology simulation demonstrated; Q9: customer interviews needed..."
                    rows={4}
                    className="text-xs"
                  />
                  <span className="text-[11px] text-gray-500">
                    Document specific rationale keyed to question numbers for committee audit records.
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t p-4 bg-gray-50/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveSection(3)}
                  className="flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSaveDraft(true)}
                  disabled={isSaving || isLocked}
                  className="flex items-center gap-2"
                >
                  {isSaving ? 'Saving...' : 'Save & Next: Evaluation & Budget'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* ============================================================== */}
          {/* SECTION 5: EVALUATION & BUDGET (Form A Parts 4, 5, 6)          */}
          {/* ============================================================== */}
          {activeSection === 5 && (
            <Card>
              <CardHeader>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">What the SEC must check (Form A Parts 4–6):</strong>
                    Share recommendation note, evaluate grant eligibility (Validation / Proof / Scaling / None-Rejected), and suggest moderated funding amounts under the 9 Annexure 1 headers.
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">5. Evaluation, Recommendation & Budget Moderation</CardTitle>
                <CardDescription>
                  Formulate individual committee recommendation and suggested allocations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-sm">
                {/* Recommendation Note */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-900">
                    Recommendation Note <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    disabled={isLocked}
                    value={recommendationNote}
                    onChange={(e) => {
                      setRecommendationNote(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Detail your recommendation, observations on team dilgence, trial requirements, and specific purchase moderation advice..."
                    rows={4}
                    className="text-xs"
                  />
                </div>

                {/* Grant Evaluation Category */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-900">
                    Recommended Grant Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    disabled={isLocked}
                    value={grantEvaluation}
                    onChange={(e) => {
                      setGrantEvaluation(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full border rounded-lg p-2 text-xs font-semibold bg-white"
                  >
                    <option value="">-- Select Recommended Grant Type --</option>
                    <option value="Validation Grant">Validation Grant (TRL 2 / MRL 2: ₹5,000–₹20,000)</option>
                    <option value="Proof Grant">Proof Grant (TRL 3 / MRL 3: ₹25,000–₹50,000)</option>
                    <option value="Scaling Grant">Scaling Grant (TRL 4–5 / MRL 4–5: ₹50,000–₹5,00,000)</option>
                    <option value="None-Application Rejected">None / Application Rejected</option>
                  </select>
                </div>

                {/* 9 Budget Moderation Headers */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs">
                        Suggested Grant Allocations (Annexure 1 Headers)
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Moderate the requested amounts under each official head.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500 block">Suggested Total</span>
                      <strong className="text-base text-brand-primary">
                        ₹{suggestedTotal.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-2 border rounded-lg p-3 bg-gray-50/50">
                    {BUDGET_HEADERS.map((h, i) => {
                      const amount = suggestedAmounts[h.key] ?? 0;
                      return (
                        <div
                          key={h.key}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-white rounded border text-xs"
                        >
                          <div className="flex-1 pr-2">
                            <span className="font-semibold text-gray-900 block">
                              {i + 1}. {h.name}
                            </span>
                            <span className="text-[11px] text-gray-500 block leading-tight">
                              {h.desc} {(h as any).needsQuotation ? '· Requires quotation.' : ''}
                            </span>
                          </div>
                          <div className="w-full sm:w-36 flex items-center gap-1.5">
                            <span className="text-gray-500 font-mono">₹</span>
                            <Input
                              type="number"
                              min={0}
                              disabled={isLocked}
                              value={amount}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setSuggestedAmounts((prev) => ({ ...prev, [h.key]: val }));
                                setIsDirty(true);
                              }}
                              className="text-right text-xs py-1 h-8 font-semibold"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row justify-between gap-3 border-t p-4 bg-gray-50/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveSection(4)}
                  className="flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to 12 Questions
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSaveDraft(false)}
                    disabled={isSaving || isLocked}
                    className="flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" /> Save Draft
                  </Button>
                  {!isLocked && (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleFinalSubmit}
                      disabled={isSaving}
                      className="flex items-center gap-1.5"
                    >
                      <Send className="w-4 h-4" /> Final Submit Assessment
                    </Button>
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
