'use client';

import { useState, useMemo, useTransition, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { TIERS, getTierBadgeClasses } from '@/lib/tiers';
import { BUDGET_HEADERS, LEVELS, TRACK_LABELS } from '@/lib/seedfund-constants';
import { SEC_QUESTIONS, FLAT_SEC_QUESTIONS, NO_THRESHOLD_HINT } from '@/lib/sec-questions';
import {
  saveAssessmentAction,
  claimMilestoneAction,
  setMilestoneStateAction,
  addMilestoneRemarkAction,
  submitMilestoneAction,
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
  Layers,
  HelpCircle,
  Info,
  GripVertical,
  Eye,
  Check,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface SecAssessmentFormClientProps {
  application: any;
  myAssessment: any;
  milestone: any;
  currentMember: any;
}

export default function SecAssessmentFormClient({
  application,
  myAssessment,
  milestone: initialMilestone,
  currentMember,
}: SecAssessmentFormClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isSubmitted = myAssessment?.status === 'SUBMITTED';

  // Mobile Pane Toggle ('app' vs 'form')
  const [mobileView, setMobileView] = useState<'app' | 'form'>('form');

  // Draggable Split Divider width (% for left pane)
  const [splitWidth, setSplitWidth] = useState<number>(48);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sec_assessment_split_width');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 25 && parsed <= 75) {
          setSplitWidth(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const percentage = (relativeX / rect.width) * 100;
      const clamped = Math.min(Math.max(percentage, 25), 75);
      setSplitWidth(clamped);
      try {
        localStorage.setItem('sec_assessment_split_width', clamped.toString());
      } catch {}
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Active form section tab (Form A tabs: sop | levels | milestones | experiment | grant)
  const [activeTab, setActiveTab] = useState<'sop' | 'levels' | 'milestones' | 'experiment' | 'grant'>('sop');

  // Form A State
  const [assessmentDate, setAssessmentDate] = useState<string>(
    myAssessment?.assessmentDate
      ? new Date(myAssessment.assessmentDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );

  // 1. Pre-checks (SOP)
  const [preChecks, setPreChecks] = useState({
    agreementChecked: !!myAssessment?.preChecks?.agreementChecked,
    priorFundingChecked: !!myAssessment?.preChecks?.priorFundingChecked,
    goAheadGiven: !!myAssessment?.preChecks?.goAheadGiven,
    note: myAssessment?.preChecks?.note || '',
  });

  // 2. Status Assessment (TRL/MRL/IRL)
  const startupSelfLevels = application.formData?.selfAssessment || {};
  const [statusForm, setStatusForm] = useState({
    trl: myAssessment?.statusForm?.trl || startupSelfLevels.trl || 1,
    mrl: myAssessment?.statusForm?.mrl || startupSelfLevels.mrl || 1,
    irl: myAssessment?.statusForm?.irl || startupSelfLevels.irl || 1,
  });

  // 4. Experiment Assessment (12 Questions)
  const initialAnswers = myAssessment?.experimentForm?.answers || {};
  const initialNotes = myAssessment?.experimentForm?.notes || {};
  const [experimentAnswers, setExperimentAnswers] = useState<Record<number, boolean>>(initialAnswers);
  const [experimentNotes, setExperimentNotes] = useState<Record<number, string>>(initialNotes);

  // 5. Recommendation note
  const [recommendation, setRecommendation] = useState<string>(myAssessment?.recommendation || '');

  // 6. Grant Evaluation Choice
  const [suggestedGrant, setSuggestedGrant] = useState<string>(
    myAssessment?.suggestedGrant || application.grantType || 'IDEATION'
  );

  // 7. Suggested Budget under Headers
  const requestedBudgetMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of application.budgetItems || []) {
      map[b.header] = (map[b.header] || 0) + Number(b.total);
    }
    return map;
  }, [application.budgetItems]);

  const [suggestedAmounts, setSuggestedAmounts] = useState<Record<string, number>>(() => {
    if (myAssessment?.suggestedAmounts && Object.keys(myAssessment.suggestedAmounts).length > 0) {
      return myAssessment.suggestedAmounts;
    }
    return requestedBudgetMap;
  });

  // Milestone State
  const [milestone, setMilestone] = useState<any>(initialMilestone);
  const [selectedTrack, setSelectedTrack] = useState<string>('PROTOTYPING');
  const [myMilestoneRemarks, setMyMilestoneRemarks] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (initialMilestone?.items) {
      for (const item of initialMilestone.items) {
        const myRem = item.remarks?.find((r: any) => r.memberId === currentMember.id);
        if (myRem) map[item.id] = myRem.remark;
      }
    }
    return map;
  });

  const isMilestoneOwner = milestone?.ownerId === currentMember.id;
  const isMilestoneSubmitted = milestone?.status === 'SUBMITTED';

  // Error & Status message
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Computations
  const totalSuggestedAmount = useMemo(() => {
    return Object.values(suggestedAmounts).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
  }, [suggestedAmounts]);

  const chosenTier = useMemo(() => TIERS.find((t) => t.key === suggestedGrant), [suggestedGrant]);
  const isAmountOutOfRange = useMemo(() => {
    if (!chosenTier || !chosenTier.range || suggestedGrant === 'EMERGENCY' || suggestedGrant === 'REJECTED') {
      return false;
    }
    const [min, max] = chosenTier.range;
    return totalSuggestedAmount < min || totalSuggestedAmount > max;
  }, [chosenTier, suggestedGrant, totalSuggestedAmount]);

  // Yes / No Count
  const yesCount = useMemo(() => {
    return Object.values(experimentAnswers).filter((v) => v === true).length;
  }, [experimentAnswers]);
  const noCount = useMemo(() => {
    return Object.values(experimentAnswers).filter((v) => v === false).length;
  }, [experimentAnswers]);
  const unansweredCount = 12 - (yesCount + noCount);

  // Handlers
  const handleCopyRequested = () => {
    setSuggestedAmounts({ ...requestedBudgetMap });
  };

  const handleSaveDraft = async () => {
    setStatusMessage(null);
    startTransition(async () => {
      try {
        await saveAssessmentAction(
          application.id,
          {
            assessmentDate,
            preChecks,
            statusForm,
            experimentForm: { answers: experimentAnswers, notes: experimentNotes },
            recommendation,
            suggestedGrant,
            suggestedAmounts,
          },
          false
        );
        setStatusMessage({ type: 'success', text: 'Assessment draft saved successfully.' });
        router.refresh();
      } catch (e: any) {
        setStatusMessage({ type: 'error', text: e.message || 'Failed to save draft.' });
      }
    });
  };

  const handleSubmit = async () => {
    setStatusMessage(null);
    if (!preChecks.agreementChecked || !preChecks.priorFundingChecked || !preChecks.goAheadGiven) {
      setActiveTab('sop');
      setStatusMessage({ type: 'error', text: 'Please complete all SOP Pre-assessment checks before submitting.' });
      return;
    }
    if (unansweredCount > 0) {
      setActiveTab('experiment');
      setStatusMessage({ type: 'error', text: `Please answer all 12 experiment assessment questions (${unansweredCount} remaining).` });
      return;
    }
    if (!recommendation.trim()) {
      setActiveTab('grant');
      setStatusMessage({ type: 'error', text: 'Recommendation note is required.' });
      return;
    }
    if (isAmountOutOfRange) {
      setActiveTab('grant');
      setStatusMessage({
        type: 'error',
        text: `Suggested total (₹${totalSuggestedAmount.toLocaleString('en-IN')}) is out of range for ${chosenTier?.label} (₹${chosenTier?.range?.[0].toLocaleString('en-IN')} - ₹${chosenTier?.range?.[1].toLocaleString('en-IN')}).`,
      });
      return;
    }

    if (!confirm('Are you sure you want to submit your assessment? Once submitted, Form A is locked.')) {
      return;
    }

    startTransition(async () => {
      try {
        await saveAssessmentAction(
          application.id,
          {
            assessmentDate,
            preChecks,
            statusForm,
            experimentForm: { answers: experimentAnswers, notes: experimentNotes },
            recommendation,
            suggestedGrant,
            suggestedAmounts,
          },
          true
        );
        setStatusMessage({ type: 'success', text: 'Assessment submitted and locked successfully.' });
        router.refresh();
      } catch (e: any) {
        setStatusMessage({ type: 'error', text: e.message || 'Failed to submit assessment.' });
      }
    });
  };

  const handleClaimMilestone = async () => {
    startTransition(async () => {
      try {
        const res = await claimMilestoneAction(application.id, selectedTrack, []);
        setMilestone(res.milestone);
        router.refresh();
      } catch (e: any) {
        alert(e.message || 'Failed to claim milestone ownership.');
      }
    });
  };

  const handleUpdateMilestoneState = async (itemId: string, state: any, ownerRemark?: string) => {
    startTransition(async () => {
      try {
        await setMilestoneStateAction(itemId, state, ownerRemark, application.id);
        router.refresh();
      } catch (e: any) {
        alert(e.message || 'Failed to update milestone state.');
      }
    });
  };

  const handleSaveMilestoneRemark = async (itemId: string) => {
    const remark = myMilestoneRemarks[itemId];
    if (!remark || !remark.trim()) return;

    startTransition(async () => {
      try {
        await addMilestoneRemarkAction(itemId, remark, application.id);
        router.refresh();
      } catch (e: any) {
        alert(e.message || 'Failed to save remark.');
      }
    });
  };

  const handleSubmitMilestone = async () => {
    if (!confirm('Submit milestone evaluation? This finalizes the committee track assessment.')) return;
    startTransition(async () => {
      try {
        await submitMilestoneAction(application.id);
        router.refresh();
      } catch (e: any) {
        alert(e.message || 'Failed to submit milestone.');
      }
    });
  };

  // Extract application fields
  const fd = application.formData || {};
  const exp = fd.experiment || {};

  // --------------------------------------------------------------------------
  // Left Pane: Submitted Startup Application
  // --------------------------------------------------------------------------
  const renderLeftApplicationPane = () => (
    <div className="flex flex-col h-full bg-slate-50/60 overflow-hidden">
      {/* Sticky Header */}
      <div className="p-4 sm:px-6 bg-white border-b border-gray-200 shrink-0 sticky top-0 z-10 flex items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900 truncate">
              {application.startup?.teamName || 'Startup Application'}
            </h2>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getTierBadgeClasses(application.grantType)}`}>
              {application.grantType} Grant (v{application.version})
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Founder: {application.startup?.user?.name} ({application.startup?.enrollmentNo}) • {application.startup?.program}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-gray-400 block uppercase font-medium tracking-wider">Requested Total</span>
          <span className="text-base font-bold text-brand-primary font-mono">
            ₹{Number(application.requestedTotal).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Scrollable Application Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Agreement Line */}
        <div className="p-3 bg-white border border-gray-200 rounded-lg text-xs space-y-1 shadow-2xs">
          <span className="font-semibold text-gray-700">Agreement Acceptance:</span>
          {fd.agreement ? (
            <p className="text-gray-600 font-mono">
              Accepted by <strong>{fd.agreement.acceptedByName}</strong> on {new Date(fd.agreement.acceptedAt).toLocaleDateString()} (Hash: {fd.agreement.textHash?.slice(0, 16)}...)
            </p>
          ) : (
            <p className="text-amber-600">No agreement record found.</p>
          )}
        </div>

        {/* Problem Statement & Proposed Solution */}
        <div className="grid grid-cols-1 gap-4">
          <Card className="shadow-2xs">
            <CardHeader className="py-3 px-4 bg-gray-50/70 border-b">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">Problem Statement</h4>
            </CardHeader>
            <CardContent className="p-4 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
              {fd.problemStatement || 'N/A'}
            </CardContent>
          </Card>

          <Card className="shadow-2xs">
            <CardHeader className="py-3 px-4 bg-gray-50/70 border-b">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">Proposed Solution</h4>
            </CardHeader>
            <CardContent className="p-4 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
              {fd.proposedSolution || 'N/A'}
            </CardContent>
          </Card>

          <Card className="shadow-2xs">
            <CardHeader className="py-3 px-4 bg-gray-50/70 border-b">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">Effort & Traction So Far</h4>
            </CardHeader>
            <CardContent className="p-4 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">
              {fd.effortAndTraction || 'N/A'}
            </CardContent>
          </Card>
        </div>

        {/* 10 Experiment Fields */}
        <Card className="shadow-2xs">
          <CardHeader className="py-3 px-4 bg-gray-50/70 border-b">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Experiment Definition (TRL 2/3)</h3>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-3 text-xs">
              {[
                { key: 'objective', label: '1. Objective' },
                { key: 'problemStatement', label: '2. Problem Statement' },
                { key: 'expectedOutcome', label: '3. Expected Outcome' },
                { key: 'methodology', label: '4. Methodology' },
                { key: 'experimentalSetup', label: '5. Experimental Setup' },
                { key: 'dataToBeCollected', label: '6. Data Collection Plan' },
                { key: 'validationCriteria', label: '7. Validation Criteria' },
                { key: 'risksAndAssumptions', label: '8. Risks & Assumptions' },
                { key: 'timeline', label: '9. Timeline' },
                { key: 'deliverables', label: '10. Deliverables' },
              ].map((f) => (
                <div key={f.key} className="p-3 bg-white rounded border border-gray-200">
                  <span className="font-semibold text-xs text-gray-500 block mb-1">{f.label}</span>
                  <p className="text-gray-800 text-xs leading-relaxed">{exp[f.key] || '—'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Itemized Budget Table */}
        <Card className="shadow-2xs">
          <CardHeader className="py-3 px-4 bg-gray-50/70 border-b">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Itemized Budget Request</h3>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100/70 text-gray-600 font-semibold border-b">
                  <tr>
                    <th className="p-2.5">Header</th>
                    <th className="p-2.5">Item Name</th>
                    <th className="p-2.5">Vendor</th>
                    <th className="p-2.5 text-right">Unit (₹)</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Total (₹)</th>
                    <th className="p-2.5">Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {application.budgetItems?.map((b: any) => (
                    <tr key={b.id} className="hover:bg-gray-50/50">
                      <td className="p-2.5 font-medium uppercase text-gray-700 text-[11px]">{b.header}</td>
                      <td className="p-2.5 text-gray-900 font-medium">{b.name}</td>
                      <td className="p-2.5 text-gray-500">{b.vendor || '—'}</td>
                      <td className="p-2.5 text-right font-mono">{Number(b.unitCost).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-center">{b.qty}</td>
                      <td className="p-2.5 text-right font-bold text-gray-900 font-mono">₹{Number(b.total).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-gray-600 max-w-xs">{b.justification || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-bold border-t">
                  <tr>
                    <td colSpan={5} className="p-2.5 text-right text-gray-700">Requested Total:</td>
                    <td className="p-2.5 text-right text-brand-primary font-mono text-sm">
                      ₹{Number(application.requestedTotal).toLocaleString('en-IN')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Startup Self Assessment */}
        <Card className="shadow-2xs">
          <CardHeader className="py-3 px-4 bg-gray-50/70 border-b">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Startup Self-Assessment</h3>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-2.5 bg-blue-50/50 border border-blue-200 rounded text-center">
                <span className="text-gray-500 text-[11px] block">Self TRL</span>
                <strong className="text-sm text-blue-900">Level {startupSelfLevels.trl || '—'}</strong>
              </div>
              <div className="p-2.5 bg-amber-50/50 border border-amber-200 rounded text-center">
                <span className="text-gray-500 text-[11px] block">Self MRL</span>
                <strong className="text-sm text-amber-900">Level {startupSelfLevels.mrl || '—'}</strong>
              </div>
              <div className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded text-center">
                <span className="text-gray-500 text-[11px] block">Self IRL</span>
                <strong className="text-sm text-emerald-900">Level {startupSelfLevels.irl || '—'}</strong>
              </div>
            </div>
            {startupSelfLevels.track && (
              <p className="text-gray-600">
                Self-selected milestone track: <strong>{startupSelfLevels.track}</strong>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Uploaded Documents */}
        <Card className="shadow-2xs">
          <CardHeader className="py-3 px-4 bg-gray-50/70 border-b">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Uploaded Documents & Pitch Deck</h3>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {application.documents?.map((doc: any) => (
                <div key={doc.id} className="p-3 border rounded-lg flex items-center justify-between bg-white shadow-2xs">
                  <div className="space-y-0.5 truncate pr-2">
                    <p className="text-xs font-semibold text-gray-800">{doc.type}</p>
                    {doc.memberLabel && <p className="text-[10px] text-gray-500">For: {doc.memberLabel}</p>}
                  </div>
                  <a
                    href={`/api/documents/${doc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-brand-primary hover:bg-blue-50 rounded"
                    title="View Document"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // Right Pane: Member's Form A Assessment
  // --------------------------------------------------------------------------
  const renderRightFormAPane = () => (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Top Compact Summary Strip */}
      <div className="p-3 sm:px-5 bg-white border-b border-gray-200 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${getTierBadgeClasses(application.grantType)}`}>
            {application.grantType}
          </span>
          <span className="text-gray-500">Req: <strong className="text-gray-900 font-mono">₹{Number(application.requestedTotal).toLocaleString('en-IN')}</strong></span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">Sugg: <strong className={`font-mono ${isAmountOutOfRange ? 'text-rose-600' : 'text-brand-primary'}`}>₹{totalSuggestedAmount.toLocaleString('en-IN')}</strong></span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Section mini pills */}
          <span className={`px-2 py-0.5 rounded border text-[11px] font-medium ${
            preChecks.agreementChecked && preChecks.priorFundingChecked && preChecks.goAheadGiven
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            SOP: {preChecks.agreementChecked && preChecks.priorFundingChecked && preChecks.goAheadGiven ? 'Ready' : 'Pending'}
          </span>
          <span className="px-2 py-0.5 rounded border text-[11px] font-medium bg-blue-50 text-blue-700 border-blue-200">
            L{statusForm.trl}/L{statusForm.mrl}/L{statusForm.irl}
          </span>
          <span className={`px-2 py-0.5 rounded border text-[11px] font-medium ${
            unansweredCount === 0
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            12 Qs: {12 - unansweredCount}/12
          </span>
          <span className="text-gray-300">|</span>
          {isSubmitted ? (
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" /> Locked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              <Clock className="h-3.5 w-3.5" /> Draft
            </span>
          )}
        </div>
      </div>

      {/* Form Tabs Bar */}
      <div className="bg-gray-50/80 border-b border-gray-200 p-1.5 flex flex-wrap gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('sop')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'sop'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-gray-700 hover:bg-gray-200/60'
          }`}
        >
          <Shield className="h-3.5 w-3.5" /> 1. Pre-checks (SOP)
        </button>
        <button
          onClick={() => setActiveTab('levels')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'levels'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-gray-700 hover:bg-gray-200/60'
          }`}
        >
          <Layers className="h-3.5 w-3.5" /> 2. Status Levels
        </button>
        <button
          onClick={() => setActiveTab('milestones')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'milestones'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-gray-700 hover:bg-gray-200/60'
          }`}
        >
          <Clock className="h-3.5 w-3.5" /> 3. Shared Milestones
        </button>
        <button
          onClick={() => setActiveTab('experiment')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'experiment'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-gray-700 hover:bg-gray-200/60'
          }`}
        >
          <HelpCircle className="h-3.5 w-3.5" /> 4. 12 Questions
          {unansweredCount > 0 && !isSubmitted && (
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
              {unansweredCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('grant')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'grant'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'text-gray-700 hover:bg-gray-200/60'
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> 5. Evaluation & Budget
        </button>
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Status Messages */}
        {isSubmitted && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-900">Form A Submitted & Locked</p>
                <p className="text-emerald-700">
                  Submitted on {myAssessment?.submittedAt ? formatDate(myAssessment.submittedAt) : 'today'}. Read-only mode.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/sec/applications/${application.id}/report`}>
                <Button variant="outline" size="sm" className="h-8 text-xs bg-white text-brand-primary border-brand-primary hover:bg-blue-50">
                  <FileText className="h-3.5 w-3.5 mr-1" /> Consolidated Report
                </Button>
              </Link>
            </div>
          </div>
        )}

        {statusMessage && (
          <Alert variant={statusMessage.type === 'error' ? 'error' : 'success'}>
            {statusMessage.text}
          </Alert>
        )}

        {/* TAB 1: PRE-ASSESSMENT CHECKS (SOP) */}
        {activeTab === 'sop' && (
          <Card className="shadow-2xs">
            <CardHeader className="py-3 px-4 bg-gray-50/70 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-700">
                Section 1: Pre-assessment Checks (SOP)
              </CardTitle>
              <CardDescription className="text-xs">
                Verify eligibility, paperwork, and presentation readiness before scoring.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preChecks.agreementChecked}
                    disabled={isSubmitted}
                    onChange={(e) => setPreChecks({ ...preChecks, agreementChecked: e.target.checked })}
                    className="mt-1 rounded text-brand-primary focus:ring-brand-primary h-4 w-4"
                  />
                  <div className="text-sm">
                    <span className="font-semibold text-gray-900 text-xs sm:text-sm">Agreement and Paperwork Complete</span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {fd.agreement ? `Verified: Accepted by ${fd.agreement.acceptedByName}` : 'Warning: Agreement record missing in application.'}
                    </p>
                    <p className="text-[11px] text-gray-500">Documents submitted: {application.documents?.length || 0} files (KYC, Pitch Deck, Quotations).</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preChecks.priorFundingChecked}
                    disabled={isSubmitted}
                    onChange={(e) => setPreChecks({ ...preChecks, priorFundingChecked: e.target.checked })}
                    className="mt-1 rounded text-brand-primary focus:ring-brand-primary h-4 w-4"
                  />
                  <div className="text-sm">
                    <span className="font-semibold text-gray-900 text-xs sm:text-sm">Prior Funding Checked & Utilization Compliant</span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {fd.priorFunding ? 'Founder noted prior grant received.' : 'No previous grant reported by applicant.'}
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preChecks.goAheadGiven}
                    disabled={isSubmitted}
                    onChange={(e) => setPreChecks({ ...preChecks, goAheadGiven: e.target.checked })}
                    className="mt-1 rounded text-brand-primary focus:ring-brand-primary h-4 w-4"
                  />
                  <div className="text-sm">
                    <span className="font-semibold text-gray-900 text-xs sm:text-sm">Go-Ahead Given to Present</span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Confirm that all preliminary qualifications are met and the startup is permitted to present to the SEC.
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Pre-assessment Note / Observations (Optional):</label>
                <Textarea
                  disabled={isSubmitted}
                  value={preChecks.note}
                  onChange={(e) => setPreChecks({ ...preChecks, note: e.target.value })}
                  placeholder="Record any remarks regarding paperwork compliance or verification checks..."
                  className="text-xs min-h-[90px]"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 2: CURRENT STATUS LEVELS (TRL/MRL/IRL) */}
        {activeTab === 'levels' && (
          <Card className="shadow-2xs">
            <CardHeader className="py-3 px-4 bg-gray-50/70 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-700">
                Section 2: Current Status Assessment (TRL / MRL / IRL)
              </CardTitle>
              <CardDescription className="text-xs">
                Score achieved levels on 1–9 maturity scales. Compare against the startup’s self-assessment shown in the left pane.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* TRL */}
                <div className="border rounded-lg p-3 space-y-2 bg-white">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-gray-900 text-xs">Technology (TRL)</h4>
                    <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                      Self: Level {startupSelfLevels.trl || '—'}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                    {LEVELS.TRL.map((desc, idx) => {
                      const lvlNum = idx + 1;
                      return (
                        <label
                          key={lvlNum}
                          className={`flex items-start gap-2 p-2 rounded text-xs cursor-pointer border transition-colors ${
                            statusForm.trl === lvlNum
                              ? 'bg-blue-50 border-blue-400 font-semibold text-blue-900'
                              : 'border-transparent hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="trl_level"
                            disabled={isSubmitted}
                            checked={statusForm.trl === lvlNum}
                            onChange={() => setStatusForm({ ...statusForm, trl: lvlNum })}
                            className="mt-0.5 text-brand-primary"
                          />
                          <div>
                            <span className="font-bold">L{lvlNum}:</span> <span className="text-[11px]">{desc}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* MRL */}
                <div className="border rounded-lg p-3 space-y-2 bg-white">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-gray-900 text-xs">Manufacturing (MRL)</h4>
                    <span className="text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium">
                      Self: Level {startupSelfLevels.mrl || '—'}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                    {LEVELS.MRL.map((desc, idx) => {
                      const lvlNum = idx + 1;
                      return (
                        <label
                          key={lvlNum}
                          className={`flex items-start gap-2 p-2 rounded text-xs cursor-pointer border transition-colors ${
                            statusForm.mrl === lvlNum
                              ? 'bg-amber-50 border-amber-400 font-semibold text-amber-900'
                              : 'border-transparent hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="mrl_level"
                            disabled={isSubmitted}
                            checked={statusForm.mrl === lvlNum}
                            onChange={() => setStatusForm({ ...statusForm, mrl: lvlNum })}
                            className="mt-0.5 text-brand-primary"
                          />
                          <div>
                            <span className="font-bold">L{lvlNum}:</span> <span className="text-[11px]">{desc}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* IRL */}
                <div className="border rounded-lg p-3 space-y-2 bg-white">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-gray-900 text-xs">Investment (IRL)</h4>
                    <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">
                      Self: Level {startupSelfLevels.irl || '—'}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                    {LEVELS.IRL.map((desc, idx) => {
                      const lvlNum = idx + 1;
                      return (
                        <label
                          key={lvlNum}
                          className={`flex items-start gap-2 p-2 rounded text-xs cursor-pointer border transition-colors ${
                            statusForm.irl === lvlNum
                              ? 'bg-emerald-50 border-emerald-400 font-semibold text-emerald-900'
                              : 'border-transparent hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="irl_level"
                            disabled={isSubmitted}
                            checked={statusForm.irl === lvlNum}
                            onChange={() => setStatusForm({ ...statusForm, irl: lvlNum })}
                            className="mt-0.5 text-brand-primary"
                          />
                          <div>
                            <span className="font-bold">L{lvlNum}:</span> <span className="text-[11px]">{desc}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 3: SHARED MILESTONES */}
        {activeTab === 'milestones' && (
          <Card className="shadow-2xs">
            <CardHeader className="py-3 px-4 bg-gray-50/70 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-700">
                    Section 3: Shared Milestone Assessment (Committee-Wide)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    One milestone evaluation per application. First evaluator to claim becomes owner; others provide remarks.
                  </CardDescription>
                </div>
                {milestone && (
                  <Badge variant={isMilestoneSubmitted ? 'success' : 'warning'}>
                    {isMilestoneSubmitted ? 'Milestone Submitted' : 'In Draft'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              {!milestone ? (
                <div className="p-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900 text-xs sm:text-sm mb-1">No Milestone Assessment Claimed Yet</h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto mb-4">
                    Claim ownership of this milestone form to set the evaluation track and status.
                  </p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <select
                      value={selectedTrack}
                      onChange={(e) => setSelectedTrack(e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white"
                    >
                      {Object.entries(TRACK_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>{label}</option>
                      ))}
                    </select>
                    <Button onClick={handleClaimMilestone} disabled={isPending} size="sm">
                      Claim & Initialize
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-blue-50/50 p-2.5 rounded border border-blue-200 text-xs">
                    <div>
                      <span className="font-semibold text-blue-900">Track: </span>
                      <span className="text-blue-800 font-bold">{TRACK_LABELS[milestone.track as keyof typeof TRACK_LABELS] || milestone.track}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-blue-900">Owner: </span>
                      <span className="text-blue-800 font-medium">
                        {milestone.owner?.name} {isMilestoneOwner && '(You)'}
                      </span>
                    </div>
                  </div>

                  {/* Milestones List */}
                  <div className="space-y-3">
                    {milestone.items?.map((item: any) => {
                      const otherRemarks = item.remarks?.filter((r: any) => r.memberId !== currentMember.id) || [];
                      return (
                        <div key={item.id} className="p-3 border rounded-lg bg-white space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-xs text-gray-900">{item.name}</span>
                            {isMilestoneOwner && !isMilestoneSubmitted ? (
                              <select
                                value={item.state}
                                onChange={(e) => handleUpdateMilestoneState(item.id, e.target.value as any, item.ownerRemark)}
                                className="text-[11px] border rounded px-2 py-1 bg-white font-medium"
                              >
                                <option value="PENDING">PENDING</option>
                                <option value="IN_PROGRESS">IN_PROGRESS</option>
                                <option value="COMPLETED">COMPLETED</option>
                              </select>
                            ) : (
                              <Badge variant={item.state === 'COMPLETED' ? 'success' : item.state === 'IN_PROGRESS' ? 'info' : 'warning'}>
                                {item.state}
                              </Badge>
                            )}
                          </div>

                          {/* Owner Remark */}
                          {isMilestoneOwner && !isMilestoneSubmitted ? (
                            <div>
                              <input
                                type="text"
                                defaultValue={item.ownerRemark || ''}
                                onBlur={(e) => handleUpdateMilestoneState(item.id, item.state, e.target.value)}
                                placeholder="Enter owner verification remark..."
                                className="w-full text-xs px-2.5 py-1 border rounded"
                              />
                            </div>
                          ) : (
                            item.ownerRemark && (
                              <p className="text-[11px] text-gray-700 bg-gray-50 p-2 rounded border">
                                <span className="font-semibold text-gray-900">Owner remark:</span> {item.ownerRemark}
                              </p>
                            )
                          )}

                          {/* Committee Member Remarks */}
                          <div className="pt-2 border-t space-y-1.5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Committee Remarks</span>
                            {otherRemarks.map((r: any) => (
                              <p key={r.id} className="text-[11px] text-gray-600 pl-2 border-l-2 border-gray-300">
                                <strong>{r.member?.name}:</strong> {r.remark}
                              </p>
                            ))}

                            {!isMilestoneSubmitted && (
                              <div className="flex gap-2 items-center pt-1">
                                <input
                                  type="text"
                                  value={myMilestoneRemarks[item.id] || ''}
                                  onChange={(e) => setMyMilestoneRemarks({ ...myMilestoneRemarks, [item.id]: e.target.value })}
                                  placeholder="Add your remark on this milestone..."
                                  className="flex-1 text-xs px-2 py-1 border rounded"
                                />
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleSaveMilestoneRemark(item.id)} disabled={isPending}>
                                  Save Remark
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Owner Submit Milestone Button */}
                  {isMilestoneOwner && !isMilestoneSubmitted && (
                    <div className="pt-2 flex justify-end">
                      <Button onClick={handleSubmitMilestone} disabled={isPending} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        Submit Milestone Evaluation
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* TAB 4: 12 QUESTIONS */}
        {activeTab === 'experiment' && (
          <Card className="shadow-2xs">
            <CardHeader className="py-3 px-4 bg-gray-50/70 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-700">
                    Section 4: TRL 2/3 Experiment Assessment (12 Questions)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Score technical feasibility, market worthiness, and team readiness.
                  </CardDescription>
                </div>
                {/* Live Tally */}
                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded border text-xs">
                  <span className="font-semibold text-emerald-700">YES: {yesCount}</span>
                  <span>•</span>
                  <span className="font-semibold text-rose-700">NO: {noCount}</span>
                  {unansweredCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-amber-700">Pending: {unansweredCount}</span>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Decision Guide Hint */}
              <div className={`p-3 rounded-lg border text-xs flex items-center gap-3 ${
                noCount >= NO_THRESHOLD_HINT
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}>
                <Info className="h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Decision Guide Hint:</p>
                  <p>
                    {noCount >= NO_THRESHOLD_HINT
                      ? `Multiple NO (≥ ${NO_THRESHOLD_HINT}) → Revision required before approval.`
                      : 'Mostly YES → Recommend funding (TRL-3 likely).'}
                  </p>
                </div>
              </div>

              {/* 12 Questions List */}
              <div className="space-y-4">
                {SEC_QUESTIONS.map((group) => (
                  <div key={group.group} className="space-y-2.5">
                    <h4 className="font-bold text-[11px] uppercase tracking-wider text-gray-600 bg-gray-100 p-2 rounded">
                      {group.group}
                    </h4>
                    <div className="space-y-2.5">
                      {group.items.map((qText) => {
                        const qObj = FLAT_SEC_QUESTIONS.find((q) => q.text === qText)!;
                        const num = qObj.number;
                        const answer = experimentAnswers[num];
                        return (
                          <div key={num} className="p-3 border rounded-lg bg-white space-y-2 shadow-2xs">
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-xs font-medium text-gray-900 leading-snug">
                                <strong className="text-brand-primary">Q{num}.</strong> {qText}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={isSubmitted}
                                  onClick={() => setExperimentAnswers({ ...experimentAnswers, [num]: true })}
                                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                                    answer === true
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  YES
                                </button>
                                <button
                                  type="button"
                                  disabled={isSubmitted}
                                  onClick={() => setExperimentAnswers({ ...experimentAnswers, [num]: false })}
                                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                                    answer === false
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  NO
                                </button>
                              </div>
                            </div>

                            {/* Optional Note Field */}
                            <div>
                              <input
                                type="text"
                                disabled={isSubmitted}
                                value={experimentNotes[num] || ''}
                                onChange={(e) => setExperimentNotes({ ...experimentNotes, [num]: e.target.value })}
                                placeholder={`Optional note for Q${num}...`}
                                className="w-full text-xs px-2.5 py-1 border rounded bg-gray-50/50"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 5: EVALUATION & BUDGET */}
        {activeTab === 'grant' && (
          <Card className="shadow-2xs">
            <CardHeader className="py-3 px-4 bg-gray-50/70 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-700">
                Section 5: Grant Evaluation & Suggested Budget
              </CardTitle>
              <CardDescription className="text-xs">
                Provide your recommendation note, select funding track, and adjust itemized budget amounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              {/* Recommendation Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                  <span>Recommendation Note <span className="text-danger">*</span>:</span>
                  <span className="text-[11px] text-gray-400 font-normal">Required on submit</span>
                </label>
                <Textarea
                  disabled={isSubmitted}
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  placeholder="Summarize your evaluation observations and justify your funding recommendation..."
                  className="text-xs min-h-[100px]"
                />
              </div>

              {/* Grant Evaluation Choice */}
              <div className="space-y-2 border-t pt-4">
                <span className="text-xs font-semibold text-gray-700 block">Grant Recommended by Evaluator:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    { key: 'IDEATION', label: 'Ideation Grant' },
                    { key: 'VALIDATION', label: 'Validation Grant' },
                    { key: 'PROOF', label: 'Proof Grant' },
                    { key: 'SCALING', label: 'Scaling Grant' },
                    { key: 'EMERGENCY', label: 'Emergency Grant' },
                    { key: 'RE_PRESENTATION', label: 'Present Again' },
                    { key: 'REJECTED', label: 'None (Reject)' },
                  ].map((opt) => (
                    <label
                      key={opt.key}
                      className={`p-2.5 rounded border cursor-pointer flex items-center gap-2 transition-colors ${
                        suggestedGrant === opt.key
                          ? 'border-brand-primary bg-blue-50/50 font-bold text-brand-primary'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="suggested_grant"
                        disabled={isSubmitted}
                        checked={suggestedGrant === opt.key}
                        onChange={() => setSuggestedGrant(opt.key)}
                        className="text-brand-primary"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Budget Under Headers */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">Grant Suggested Under Budget Headers:</span>
                  {!isSubmitted && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleCopyRequested}>
                      Copy Requested
                    </Button>
                  )}
                </div>

                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 text-gray-600 font-semibold border-b">
                      <tr>
                        <th className="p-2.5">Header</th>
                        <th className="p-2.5 text-right">Requested (₹)</th>
                        <th className="p-2.5 text-right w-44">Suggested (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {BUDGET_HEADERS.map((h) => {
                        const reqVal = requestedBudgetMap[h.key] || 0;
                        const suggVal = suggestedAmounts[h.key] ?? reqVal;
                        return (
                          <tr key={h.key} className="hover:bg-gray-50/50">
                            <td className="p-2.5 font-medium text-gray-700">{h.name}</td>
                            <td className="p-2.5 text-right font-mono text-gray-500">
                              ₹{reqVal.toLocaleString('en-IN')}
                            </td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                min={0}
                                disabled={isSubmitted}
                                value={suggVal}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setSuggestedAmounts({ ...suggestedAmounts, [h.key]: val });
                                }}
                                className="w-32 px-2 py-1 text-right text-xs border rounded font-mono font-bold"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold border-t">
                      <tr>
                        <td className="p-2.5 text-gray-900">Total Suggested:</td>
                        <td className="p-2.5 text-right font-mono text-gray-600">
                          ₹{Number(application.requestedTotal).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-right font-mono text-sm text-brand-primary">
                          ₹{totalSuggestedAmount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {isAmountOutOfRange && (
                  <p className="text-xs text-rose-600 font-semibold mt-1">
                    ⚠️ Total (₹{totalSuggestedAmount.toLocaleString('en-IN')}) must fall within {chosenTier?.label} range (₹{chosenTier?.range?.[0].toLocaleString('en-IN')} – ₹{chosenTier?.range?.[1].toLocaleString('en-IN')}).
                  </p>
                )}
              </div>

              {/* Assessed By Block */}
              <div className="p-3 bg-gray-50 rounded border space-y-2 text-xs">
                <span className="font-bold text-gray-700 uppercase tracking-wider block">Assessed By</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-gray-400 block text-[11px]">Evaluator:</span>
                    <strong className="text-gray-800">{currentMember.name}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Designation:</span>
                    <strong className="text-gray-800">{currentMember.designation || 'SEC Member'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Date:</span>
                    <input
                      type="date"
                      disabled={isSubmitted}
                      value={assessmentDate}
                      onChange={(e) => setAssessmentDate(e.target.value)}
                      className="border rounded px-2 py-0.5 text-xs bg-white mt-0.5"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sticky Bottom Footer */}
      <div className="p-3 sm:px-5 bg-white border-t border-gray-200 shrink-0 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Link href={`/sec/applications/${application.id}/print`}>
            <Button variant="outline" size="sm" className="h-9 text-xs">
              <Printer className="h-3.5 w-3.5 mr-1" /> Printable Form A
            </Button>
          </Link>
          {isSubmitted && (
            <Link href={`/sec/applications/${application.id}/report`}>
              <Button variant="outline" size="sm" className="h-9 text-xs text-brand-primary border-brand-primary hover:bg-blue-50">
                <FileText className="h-3.5 w-3.5 mr-1" /> Consolidated Report
              </Button>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isSubmitted ? (
            <>
              <Button
                onClick={handleSaveDraft}
                disabled={isPending}
                variant="outline"
                size="sm"
                className="h-9 text-xs"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" /> Save Draft
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending || isAmountOutOfRange}
                size="sm"
                className="h-9 text-xs bg-brand-primary hover:bg-brand-primary-dark"
              >
                <Send className="h-3.5 w-3.5 mr-1.5" /> Submit Assessment
              </Button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200">
              <Lock className="h-3.5 w-3.5" /> Form A Locked
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="h-full w-full flex flex-col overflow-hidden select-text">
      {/* Below lg: Mobile Toggle Bar */}
      <div className="lg:hidden shrink-0 bg-white border-b border-gray-200 p-2 flex items-center justify-center gap-2 z-20">
        <button
          onClick={() => setMobileView('app')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
            mobileView === 'app'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FileText className="h-3.5 w-3.5" /> Startup Application
        </button>
        <button
          onClick={() => setMobileView('form')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
            mobileView === 'form'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Shield className="h-3.5 w-3.5" /> My Assessment (Form A)
        </button>
      </div>

      {/* Main Split Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane (Desktop split or Mobile 'app' view) */}
        <div
          style={{ width: `${splitWidth}%` }}
          className={`h-full shrink-0 lg:block ${
            mobileView === 'app' ? 'block w-full' : 'hidden'
          }`}
        >
          {renderLeftApplicationPane()}
        </div>

        {/* Draggable Divider (Desktop only) */}
        <div
          onMouseDown={() => setIsDragging(true)}
          className={`hidden lg:flex w-2 shrink-0 h-full bg-gray-100 hover:bg-blue-100 active:bg-blue-200 cursor-col-resize items-center justify-center border-x border-gray-300 transition-colors select-none ${
            isDragging ? 'bg-blue-200 ring-2 ring-brand-primary' : ''
          }`}
          title="Drag to resize panes"
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>

        {/* Right Pane (Desktop split or Mobile 'form' view) */}
        <div
          style={{ width: `calc(100% - ${splitWidth}% - 8px)` }}
          className={`h-full flex-1 overflow-hidden lg:block ${
            mobileView === 'form' ? 'block w-full' : 'hidden'
          }`}
        >
          {renderRightFormAPane()}
        </div>
      </div>
    </div>
  );
}
