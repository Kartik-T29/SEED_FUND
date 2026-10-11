'use client';

import { useState, useEffect, useRef, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import {
  AGREEMENT_VERSION,
  AGREEMENT_TITLE,
  AGREEMENT_INTRO,
  AGREEMENT_TERMS,
} from '@/lib/agreement';
import {
  BUDGET_HEADERS,
  GRANT_RANGES,
  LEVELS,
  MILESTONES,
  TRACK_LABELS,
  BudgetHeaderKey,
} from '@/lib/seedfund-constants';
import {
  acceptAgreementAction,
  saveDraftAction,
  saveBudgetAction,
  uploadDocumentAction,
  removeDocumentAction,
  submitApplicationAction,
} from './actions';
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Info,
  Check,
  Eye,
  ExternalLink,
  Edit,
  FileUp,
} from 'lucide-react';

interface ApplicationWizardProps {
  application: any;
}

export default function ApplicationWizard({ application }: ApplicationWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const registeredUser = application.startup?.user || {};
  const registeredName = (registeredUser.name || '').trim();
  const isReadOnly = application.status !== 'DRAFT';

  const [step, setStep] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const initialFormData = useMemo(() => {
    const data = application.formData || {};
    if (!data.teamMembers || data.teamMembers.length === 0) {
      return {
        ...data,
        teamMembers: [{ name: registeredName || 'Founder 1' }],
      };
    }
    return data;
  }, [application.formData, registeredName]);
  const [formData, setFormData] = useState<any>(initialFormData);
  const [grantType, setGrantType] = useState<string>(application.grantType || 'IDEATION');
  const [budgetItems, setBudgetItems] = useState<any[]>(application.budgetItems || []);
  const [documents, setDocuments] = useState<any[]>(application.documents || []);

  // Step 1: Agreement state
  const agreementContainerRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [typedAgreementName, setTypedAgreementName] = useState(
    initialFormData.agreement?.acceptedByName || ''
  );
  const isAgreementAccepted = Boolean(
    initialFormData.agreement?.version === AGREEMENT_VERSION &&
    initialFormData.agreement?.acceptedByName
  );
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  // Step 4: Budget collapsible groups state
  const [openHeaders, setOpenHeaders] = useState<Record<string, boolean>>({
    equipment: true,
    consumables: true,
  });

  // Step 6: Milestones track
  const currentTrack: 'PROTOTYPING' | 'PROFESSIONAL' =
    formData.selfAssessment?.track || 'PROTOTYPING';

  // Step 7: Team members state
  const teamMembers: Array<{ name: string }> = formData.teamMembers || [
    { name: registeredName || 'Founder 1' },
  ];

  // Step 8: Declaration state
  const [declarationChecked, setDeclarationChecked] = useState(
    Boolean(formData.declaration?.accepted)
  );
  const [typedDeclarationName, setTypedDeclarationName] = useState(
    formData.declaration?.declaredByName || ''
  );

  // File upload loading per field
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

  // Check agreement scroll container on mount
  useEffect(() => {
    const el = agreementContainerRef.current;
    if (el) {
      if (el.scrollHeight <= el.clientHeight + 15) {
        setHasScrolledToBottom(true);
      }
    }
  }, [step]);

  const handleAgreementScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 25) {
      setHasScrolledToBottom(true);
    }
  };

  // Recompute Budget Totals
  const { nonContingencyTotal, contingencyTotal, requestedTotal } = useMemo(() => {
    let nonCont = 0;
    let cont = 0;
    budgetItems.forEach((b) => {
      const isCont = b.header === 'contingency';
      const uCost = parseFloat(b.unitCost) || 0;
      const q = isCont ? 1 : parseInt(b.qty) || 1;
      const t = isCont ? uCost : Math.round(uCost * q * 100) / 100;
      if (isCont) cont += t;
      else nonCont += t;
    });
    return {
      nonContingencyTotal: nonCont,
      contingencyTotal: cont,
      requestedTotal: nonCont + cont,
    };
  }, [budgetItems]);

  // Contingency Check
  const contingencyPercentage =
    nonContingencyTotal > 0 ? (contingencyTotal / nonContingencyTotal) * 100 : contingencyTotal > 0 ? 100 : 0;
  const isContingencyBlocked = contingencyPercentage > 20;
  const isContingencyWarned = contingencyPercentage > 10 && contingencyPercentage <= 20;

  // Range Check
  const currentRange = grantType && grantType !== 'EMERGENCY' ? (GRANT_RANGES as any)[grantType] : null;
  const isTotalOutOfRange = Boolean(
    currentRange && (requestedTotal < currentRange[0] || requestedTotal > currentRange[1])
  );

  // Debounced Autosave on Draft
  useEffect(() => {
    if (isReadOnly) return;
    const timer = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        await saveDraftAction(application.id, {
          formData,
          grantType: (grantType as any) || '',
          requestedTotal,
        });
        setSaveStatus('saved');
      } catch (err: any) {
        setSaveStatus('error');
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, [formData, grantType, requestedTotal, isReadOnly, application.id]);

  // Save budget changes debounced
  useEffect(() => {
    if (isReadOnly) return;
    const timer = setTimeout(async () => {
      try {
        await saveBudgetAction(application.id, budgetItems, true);
      } catch (err) {}
    }, 2000);
    return () => clearTimeout(timer);
  }, [budgetItems, isReadOnly, application.id]);

  // Step change handler
  const goToStep = async (newStep: number) => {
    if (!isReadOnly) {
      setSaving(true);
      setSaveStatus('saving');
      try {
        await saveDraftAction(application.id, {
          formData,
          grantType: (grantType as any) || '',
          requestedTotal,
        });
        await saveBudgetAction(application.id, budgetItems, true);
        setSaveStatus('saved');
      } catch (e) {
        setSaveStatus('error');
      } finally {
        setSaving(false);
      }
    }
    setStep(newStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 1: Accept Agreement Action
  const handleAcceptAgreement = async () => {
    if (isReadOnly) return;
    if (typedAgreementName.trim().toLowerCase() !== registeredName.toLowerCase()) {
      setErrorMessage(`Typed name must match registered applicant name: "${registeredName}"`);
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      const res = await acceptAgreementAction(application.id, typedAgreementName);
      if (res.success && res.agreement) {
        setFormData((prev: any) => ({ ...prev, agreement: res.agreement }));
        goToStep(2);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to accept agreement');
    } finally {
      setSaving(false);
    }
  };

  // Budget helper functions
  const toggleHeader = (key: string) => {
    setOpenHeaders((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const addBudgetItem = (headerKey: string) => {
    const isCont = headerKey === 'contingency';
    const newItem = {
      header: headerKey,
      name: isCont ? 'Contingency / Miscellaneous' : '',
      vendor: '',
      unitCost: 0,
      qty: 1,
      total: 0,
      justification: '',
    };
    setBudgetItems([...budgetItems, newItem]);
    setOpenHeaders((prev) => ({ ...prev, [headerKey]: true }));
  };

  const updateBudgetItem = (index: number, field: string, value: any) => {
    const updated = [...budgetItems];
    updated[index] = { ...updated[index], [field]: value };
    const isCont = updated[index].header === 'contingency';
    if (isCont) {
      const amt = parseFloat(updated[index].unitCost) || 0;
      updated[index].qty = 1;
      updated[index].total = amt;
    } else if (field === 'unitCost' || field === 'qty') {
      const uCost = parseFloat(updated[index].unitCost) || 0;
      const q = parseInt(updated[index].qty) || 1;
      updated[index].total = Math.round(uCost * q * 100) / 100;
    }
    setBudgetItems(updated);
  };

  const removeBudgetItem = (index: number) => {
    setBudgetItems(budgetItems.filter((_, i) => i !== index));
  };

  // File upload handler
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: string,
    memberLabel?: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be under 5 MB');
      return;
    }

    const key = memberLabel ? `${docType}-${memberLabel}` : docType;
    setUploadingDocType(key);

    try {
      const data = new FormData();
      data.append('file', file);
      data.append('applicationId', application.id);
      data.append('docType', docType);
      if (memberLabel) data.append('memberLabel', memberLabel);

      const res = await uploadDocumentAction(data);
      if (res.success && res.document) {
        setDocuments((prev) => [
          ...prev.filter((d) => !(d.type === docType && d.memberLabel === (memberLabel || null))),
          res.document,
        ]);
      }
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      setUploadingDocType(null);
      e.target.value = '';
    }
  };

  const handleRemoveDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await removeDocumentAction(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: any) {
      alert(err.message || 'Failed to remove document');
    }
  };

  // Team member helpers
  const addTeamMember = () => {
    const current = formData.teamMembers || [];
    setFormData({
      ...formData,
      teamMembers: [...current, { name: '' }],
    });
  };

  const updateTeamMember = (index: number, name: string) => {
    const current = [...(formData.teamMembers || [])];
    current[index] = { name };
    setFormData({ ...formData, teamMembers: current });
  };

  const removeTeamMember = (index: number) => {
    const current = [...(formData.teamMembers || [])];
    current.splice(index, 1);
    setFormData({ ...formData, teamMembers: current });
  };

  // Milestone helper
  const handleMilestoneChange = (name: string, status: 'COMPLETED' | 'PENDING', remarks?: string) => {
    const currentList: any[] = formData.selfAssessment?.milestones || [];
    const existingIdx = currentList.findIndex((m) => m.name === name);
    let updated = [...currentList];
    if (existingIdx >= 0) {
      updated[existingIdx] = {
        ...updated[existingIdx],
        status,
        remarks: remarks !== undefined ? remarks : updated[existingIdx].remarks || '',
      };
    } else {
      updated.push({ name, status, remarks: remarks || '' });
    }
    setFormData({
      ...formData,
      selfAssessment: {
        ...(formData.selfAssessment || {}),
        track: currentTrack,
        milestones: updated,
      },
    });
  };

  // Checklist for Step 8 (Review & Submit)
  const checklist = useMemo(() => {
    const items: Array<{ label: string; passed: boolean; step: number }> = [];

    // 1. Agreement
    const hasValidAgreement =
      formData.agreement?.version === AGREEMENT_VERSION &&
      formData.agreement?.acceptedByName?.trim().toLowerCase() === registeredName.toLowerCase();
    items.push({
      label: `Step 1: Agreement accepted (version ${AGREEMENT_VERSION})`,
      passed: hasValidAgreement,
      step: 1,
    });

    // 2. Basic Info
    const hasBasic =
      Boolean(grantType) &&
      (formData.problemStatement || '').trim().length >= 10 &&
      (formData.proposedSolution || '').trim().length >= 10 &&
      (formData.effortAndTraction || '').trim().length >= 10;
    items.push({
      label: 'Step 2: Basic info & Problem/Solution/Traction provided',
      passed: hasBasic,
      step: 2,
    });

    // 3. Experiment definition
    const exp = formData.experiment || {};
    const expFields = [
      'objective', 'problemStatement', 'expectedOutcome', 'methodology',
      'experimentalSetup', 'dataToBeCollected', 'validationCriteria',
      'risksAndAssumptions', 'timeline', 'deliverables',
    ];
    const hasExp = expFields.every((f) => (exp[f] || '').trim().length >= 5);
    items.push({
      label: 'Step 3: All 10 experiment definition sections completed',
      passed: hasExp,
      step: 3,
    });

    // 4. Budget
    const hasBudgetRows = budgetItems.length > 0;
    const hasQuotationsForEquipment = budgetItems
      .filter((b) => b.header === 'equipment')
      .every(() => documents.some((d) => d.type === 'QUOTATION'));
    const isContingencyOk = !isContingencyBlocked;
    const isRangeOk = !isTotalOutOfRange;
    items.push({
      label: 'Step 4: Itemized budget within selected grant range',
      passed: hasBudgetRows && isRangeOk && isContingencyOk && hasQuotationsForEquipment,
      step: 4,
    });

    // 5. Justifications
    const allJustified =
      budgetItems.length > 0 &&
      budgetItems.every((b) => (b.justification || '').trim().length > 0);
    items.push({
      label: 'Step 5: Justifications provided for every budget item',
      passed: allJustified,
      step: 5,
    });

    // 6. Self Assessment
    const sa = formData.selfAssessment || {};
    const hasLevels = Boolean(sa.trl && sa.mrl && sa.irl);
    const hasMilestones = Boolean(sa.milestones && sa.milestones.length > 0);
    items.push({
      label: 'Step 6: TRL/MRL/IRL levels and milestones evaluated',
      passed: hasLevels && hasMilestones,
      step: 6,
    });

    // 7. Documents
    const hasDeck = documents.some((d) => d.type === 'DECK');
    const hasTeamDocs = teamMembers.length > 0 && teamMembers.every((m) => {
      const name = m.name.trim();
      return (
        documents.some((d) => d.type === 'PAN' && d.memberLabel === name) &&
        documents.some((d) => d.type === 'AADHAAR' && d.memberLabel === name) &&
        documents.some((d) => d.type === 'PHOTO' && d.memberLabel === name)
      );
    });
    const hasUtilReport = !formData.hasReceivedGrantBefore || documents.some((d) => d.type === 'UTILIZATION_REPORT');
    items.push({
      label: 'Step 7: Pitch deck and member KYC documents uploaded',
      passed: hasDeck && hasTeamDocs && hasUtilReport,
      step: 7,
    });

    return items;
  }, [
    formData,
    registeredName,
    grantType,
    budgetItems,
    documents,
    isContingencyBlocked,
    isTotalOutOfRange,
    teamMembers,
  ]);

  const canSubmit = checklist.every((c) => c.passed) && declarationChecked && typedDeclarationName.trim().toLowerCase() === registeredName.toLowerCase();

  // Final Submit Action
  const handleFinalSubmit = async () => {
    if (isReadOnly) return;
    if (!canSubmit) {
      alert('Please complete all requirements in the checklist before submitting.');
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      // Save declaration and ensure teamMembers are preserved
      const updatedFormData = {
        ...formData,
        teamMembers:
          formData.teamMembers && formData.teamMembers.length > 0
            ? formData.teamMembers
            : [{ name: registeredName || 'Founder 1' }],
        declaration: {
          accepted: true,
          declaredByName: registeredName,
          declaredAt: new Date().toISOString(),
        },
      };
      await saveDraftAction(application.id, {
        formData: updatedFormData,
        grantType: (grantType as any) || '',
        requestedTotal,
      });
      await saveBudgetAction(application.id, budgetItems, false);
      await submitApplicationAction(application.id);
    } catch (err: any) {
      let msg = err.message || 'Submission failed. Please check required fields.';
      if (msg === 'TEAM_MEMBERS_REQUIRED') {
        msg = 'Team members are required. Please add at least one team member in Step 7.';
      } else if (msg.startsWith('DOCUMENTS_MISSING_FOR_MEMBER_')) {
        const member = msg.replace('DOCUMENTS_MISSING_FOR_MEMBER_', '');
        msg = `Missing KYC documents (PAN, Aadhaar, Photo) for team member: ${member}. Please upload them in Step 7.`;
      } else if (msg === 'PITCH_DECK_REQUIRED') {
        msg = 'Pitch Deck is required. Please upload your pitch deck PDF in Step 7.';
      } else if (msg === 'EQUIPMENT_QUOTATION_REQUIRED') {
        msg = 'Equipment purchases require an uploaded quotation. Please upload quotations in Step 4 or Step 7.';
      } else if (msg === 'UTILIZATION_REPORT_REQUIRED') {
        msg = 'Previous grant utilization report is required. Please upload it in Step 7.';
      } else if (msg === 'GRANT_TOTAL_OUT_OF_RANGE') {
        msg = 'Requested total is outside the allowed range for the selected grant tier.';
      } else if (msg === 'CONTINGENCY_EXCEEDS_20_PERCENT') {
        msg = 'Contingency exceeds the 20% limit of other budget headers.';
      }
      setErrorMessage(msg);
      setSaving(false);
    }
  };

  // Step labels for progress bar
  const stepLabels = [
    { label: 'Agreement', description: 'Terms & Conditions' },
    { label: 'Basic Info', description: 'Grant type & Problem' },
    { label: 'Experiment', description: '10 definition fields' },
    { label: 'Budget', description: 'Itemized breakdown' },
    { label: 'Justification', description: 'Per-item rationale' },
    { label: 'Self-Assess', description: 'TRL/MRL/IRL & Milestones' },
    { label: 'Documents', description: 'KYC & Pitch deck' },
    { label: 'Review', description: 'Summary & Submit' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Read-Only Banner */}
      {isReadOnly && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-blue-900">
                Application Submitted ({application.status})
              </p>
              <p className="text-sm text-blue-700">
                Your application has been locked and released to the SEC members and Admin for review.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push(`/status?id=${application.id}`)}>
            Check Review Status
          </Button>
        </div>
      )}

      {/* Top Header & Autosave Indicator */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IDEAPAD Seed Grant Application</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Step {step} of 8: {stepLabels[step - 1].label} — {stepLabels[step - 1].description}
          </p>
        </div>
        {!isReadOnly && (
          <div className="flex items-center gap-2 text-sm text-gray-500 self-start sm:self-auto">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-brand-primary">
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-green-600">
                <Check className="w-4 h-4" /> All changes saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-danger">
                <AlertCircle className="w-4 h-4" /> Autosave failed
              </span>
            )}
          </div>
        )}
      </div>

      {/* Step Progress Bar */}
      <div className="mb-8 overflow-x-auto pb-2">
        <div className="flex items-center min-w-[700px]">
          {stepLabels.map((s, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < step;
            const isCurrent = stepNum === step;
            return (
              <div key={idx} className="flex-1 flex items-center last:flex-none">
                <button
                  type="button"
                  onClick={() => goToStep(stepNum)}
                  className={`flex flex-col items-center group focus:outline-none ${
                    isCurrent ? 'font-semibold text-brand-primary' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors border-2 ${
                      isCompleted
                        ? 'bg-brand-primary border-brand-primary text-white'
                        : isCurrent
                        ? 'bg-white border-brand-primary text-brand-primary ring-2 ring-brand-primary/20'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                  </div>
                  <span className="text-[11px] mt-1 text-center whitespace-nowrap">
                    {s.label}
                  </span>
                </button>
                {idx < stepLabels.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      stepNum < step ? 'bg-brand-primary' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {errorMessage && (
        <Alert variant="error" className="mb-6">
          {errorMessage}
        </Alert>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 1: AGREEMENT
      ───────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{AGREEMENT_TITLE}</CardTitle>
            <CardDescription>{AGREEMENT_INTRO}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Scrollable Terms Box */}
            <div
              ref={agreementContainerRef}
              onScroll={handleAgreementScroll}
              className="max-h-72 overflow-y-auto border border-gray-300 rounded-lg p-5 bg-gray-50 text-sm space-y-4"
            >
              <p className="font-semibold text-gray-900">
                Grant Policy Terms (Version {AGREEMENT_VERSION}):
              </p>
              <ol className="list-decimal pl-5 space-y-3 text-gray-700">
                {AGREEMENT_TERMS.map((term, i) => (
                  <li key={i} className="leading-relaxed">
                    {term}
                  </li>
                ))}
              </ol>
              <div className="pt-4 border-t text-xs text-gray-400 text-center">
                — End of Agreement Terms —
              </div>
            </div>

            {!hasScrolledToBottom && !isAgreementAccepted && (
              <p className="text-xs text-brand-primary font-medium flex items-center gap-1.5">
                <Info className="w-4 h-4" /> Please scroll to the bottom of the terms box above to enable agreement acceptance.
              </p>
            )}

            {isAgreementAccepted ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-green-800 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Agreement Accepted by {formData.agreement.acceptedByName} (Version {formData.agreement.version})
                </div>
                <p className="text-xs text-green-700">
                  Accepted on {new Date(formData.agreement.acceptedAt).toLocaleDateString()} at{' '}
                  {new Date(formData.agreement.acceptedAt).toLocaleTimeString()}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAgreementModal(true)}
                  className="mt-2 text-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> Re-read Terms & Conditions
                </Button>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="agreement-chk"
                    disabled={!hasScrolledToBottom || isReadOnly}
                    checked={agreementChecked}
                    onChange={(e) => setAgreementChecked(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary disabled:opacity-40"
                  />
                  <label htmlFor="agreement-chk" className={`text-sm ${!hasScrolledToBottom ? 'text-gray-400' : 'text-gray-700'}`}>
                    I have read the IDEAPAD Seed Grant terms and agree on behalf of my team.
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Type your registered full name to sign"
                    value={typedAgreementName}
                    disabled={!agreementChecked || isReadOnly}
                    onChange={(e) => setTypedAgreementName(e.target.value)}
                    placeholder={registeredName}
                    helpText={`Must match registered name: "${registeredName}" (case-insensitive)`}
                    required
                  />
                  <Input
                    label="Date"
                    value={new Date().toLocaleDateString()}
                    readOnly
                    disabled
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-between border-t border-gray-100 pt-6">
            <div />
            {isAgreementAccepted ? (
              <Button type="button" onClick={() => goToStep(2)}>
                Continue to Step 2
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleAcceptAgreement}
                disabled={!agreementChecked || !typedAgreementName.trim() || saving || isReadOnly}
                loading={saving}
              >
                Accept & Proceed
              </Button>
            )}
          </CardFooter>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 2: BASIC INFORMATION
      ───────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information & Concept</CardTitle>
            <CardDescription>
              Select your funding tier and define the problem statement and proposed solution.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Select
              label="Grant Type / Tier"
              value={grantType}
              disabled={isReadOnly}
              onChange={(e) => setGrantType(e.target.value)}
              options={[
                { value: 'IDEATION', label: 'Ideation (₹1,000–5,000)' },
                { value: 'VALIDATION', label: 'Validation (₹5,000–20,000)' },
                { value: 'PROOF', label: 'Proof of Concept (₹25,000–50,000)' },
                { value: 'SCALING', label: 'Scaling (₹50,000–5,00,000)' },
                { value: 'EMERGENCY', label: 'Emergency (Variable, case by case)' },
              ]}
              required
            />

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Problem Statement <span className="text-danger">*</span>
                </label>
                <span className="text-xs text-gray-400">
                  {(formData.problemStatement || '').length}/600
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-1.5">
                What is the problem you are solving? Explain your startup in short.
              </p>
              <Textarea
                value={formData.problemStatement || ''}
                disabled={isReadOnly}
                maxLength={600}
                rows={4}
                onChange={(e) =>
                  setFormData({ ...formData, problemStatement: e.target.value })
                }
                placeholder="Explain the specific problem faced by your target users..."
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Proposed Solution <span className="text-danger">*</span>
                </label>
                <span className="text-xs text-gray-400">
                  {(formData.proposedSolution || '').length}/600
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-1.5">
                Summarize your proposed solution. As short as possible.
              </p>
              <Textarea
                value={formData.proposedSolution || ''}
                disabled={isReadOnly}
                maxLength={600}
                rows={4}
                onChange={(e) =>
                  setFormData({ ...formData, proposedSolution: e.target.value })
                }
                placeholder="Describe your prototype, hardware, or software solution..."
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Effort and Traction <span className="text-danger">*</span>
                </label>
                <span className="text-xs text-gray-400">
                  {(formData.effortAndTraction || '').length}/800
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-1.5">
                Summarize your effort and traction so far. As short as possible.
              </p>
              <Textarea
                value={formData.effortAndTraction || ''}
                disabled={isReadOnly}
                maxLength={800}
                rows={4}
                onChange={(e) =>
                  setFormData({ ...formData, effortAndTraction: e.target.value })
                }
                placeholder="Mention customer interviews, surveys, initial prototypes, awards, or lab tests conducted..."
                required
              />
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isReadOnly}
                  checked={Boolean(formData.hasReceivedGrantBefore)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hasReceivedGrantBefore: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                />
                <span className="text-sm font-medium text-gray-800">
                  My team received a grant before
                </span>
              </label>
              {formData.hasReceivedGrantBefore && (
                <p className="text-xs text-brand-primary mt-1.5 pl-7">
                  Note: A previous utilization report must be uploaded in Step 7.
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="justify-between border-t border-gray-100 pt-6">
            <Button type="button" variant="outline" onClick={() => goToStep(1)}>
              Back
            </Button>
            <Button
              type="button"
              onClick={() => goToStep(3)}
              disabled={
                !formData.problemStatement ||
                !formData.proposedSolution ||
                !formData.effortAndTraction
              }
            >
              Next: Experiment Definition
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 3: EXPERIMENT DEFINITION (10 fields)
      ───────────────────────────────────────────────────────────── */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Experiment Definition</CardTitle>
            <CardDescription>
              Detail the 10 experimental sections that will validate your concept and progress to TRL-3.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              {
                id: 'objective',
                title: '1. Objective',
                helper: 'What hypothesis or concept is being tested?',
              },
              {
                id: 'problemStatement',
                title: '2. Problem Statement',
                helper: 'What gap the experiment addresses?',
              },
              {
                id: 'expectedOutcome',
                title: '3. Expected Outcome',
                helper: 'What success will look like (TRL-3 proof)?',
              },
              {
                id: 'methodology',
                title: '4. Methodology',
                helper: 'How the experiment will be conducted?',
              },
              {
                id: 'experimentalSetup',
                title: '5. Experimental Setup',
                helper: 'Tools, materials, environment required (short list, details in next section)?',
              },
              {
                id: 'dataToBeCollected',
                title: '6. Data to be Collected',
                helper: 'What measurements/evidence will be recorded?',
              },
              {
                id: 'validationCriteria',
                title: '7. Validation Criteria',
                helper: 'How results will be evaluated as successful?',
              },
              {
                id: 'risksAndAssumptions',
                title: '8. Risks & Assumptions',
                helper: 'Technical uncertainties or dependencies?',
              },
              {
                id: 'timeline',
                title: '9. Timeline',
                helper: 'Key stages and duration?',
              },
              {
                id: 'deliverables',
                title: '10. Deliverables',
                helper: 'Prototype, dataset, report, demo, etc.',
              },
            ].map((expItem) => {
              const val = (formData.experiment || {})[expItem.id] || '';
              return (
                <div key={expItem.id} className="border-b border-gray-100 pb-5 last:border-none">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-semibold text-gray-900">
                      {expItem.title} <span className="text-danger">*</span>
                    </label>
                    <span className="text-xs text-gray-400">{val.length}/800</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{expItem.helper}</p>
                  <Textarea
                    value={val}
                    disabled={isReadOnly}
                    maxLength={800}
                    rows={3}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        experiment: {
                          ...(formData.experiment || {}),
                          [expItem.id]: e.target.value,
                        },
                      })
                    }
                    placeholder={`Enter ${expItem.title.toLowerCase()}...`}
                    required
                  />
                </div>
              );
            })}
          </CardContent>
          <CardFooter className="justify-between border-t border-gray-100 pt-6">
            <Button type="button" variant="outline" onClick={() => goToStep(2)}>
              Back
            </Button>
            <Button type="button" onClick={() => goToStep(4)}>
              Next: Budget Details
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 4: BUDGET DETAILS (9 collapsible groups)
      ───────────────────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Itemized Budget Breakdown</CardTitle>
              <CardDescription>
                Allocate expenses across the 9 budget categories. Note: Attach product details from the vendor website, brochure, or ecommerce platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {BUDGET_HEADERS.map((header) => {
                const isCont = header.key === 'contingency';
                const itemsInHeader = budgetItems.filter((b) => b.header === header.key);
                const subtotal = itemsInHeader.reduce(
                  (acc, curr) => acc + (parseFloat(curr.total) || 0),
                  0
                );
                const isOpen = openHeaders[header.key] ?? false;

                return (
                  <div
                    key={header.key}
                    className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => toggleHeader(header.key)}
                      className="w-full px-5 py-3.5 bg-gray-50/70 hover:bg-gray-100/70 flex items-center justify-between text-left transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-gray-900 text-sm">{header.name}</span>
                        {itemsInHeader.length > 0 && (
                          <span className="ml-2.5 text-xs text-gray-500">
                            ({itemsInHeader.length} {itemsInHeader.length === 1 ? 'item' : 'items'})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-brand-primary">
                          ₹{subtotal.toFixed(2)}
                        </span>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="p-5 space-y-4 border-t border-gray-100">
                        {/* Info panel */}
                        <div className="p-3 bg-blue-50/60 rounded-lg text-xs text-blue-900 space-y-1">
                          <p><strong>Description:</strong> {header.desc}</p>
                          <p className="text-blue-700"><strong>Typical items:</strong> {header.typical.join(' · ')}</p>
                        </div>

                        {/* Equipment Quotation Notice */}
                        {header.key === 'equipment' && itemsInHeader.length > 0 && (
                          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                            <div className="flex items-center gap-2 text-amber-900 font-medium text-xs">
                              <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                              Equipment and Capital purchases require an uploaded quotation (PDF or image).
                            </div>
                            <div className="flex flex-wrap gap-2 items-center">
                              {documents
                                .filter((d) => d.type === 'QUOTATION')
                                .map((q) => (
                                  <div
                                    key={q.id}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-300 rounded text-xs text-gray-700"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Quotation ({new Date(q.createdAt).toLocaleDateString()})</span>
                                    <a
                                      href={`/api/documents/${q.id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-brand-primary hover:underline"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                    {!isReadOnly && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveDocument(q.id)}
                                        className="text-danger hover:text-red-700"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}

                              {!isReadOnly && (
                                <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer shadow-sm">
                                  <Upload className="w-3.5 h-3.5 text-brand-primary" />
                                  Upload Quotation
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="hidden"
                                    onChange={(e) => handleFileUpload(e, 'QUOTATION')}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Items in Header */}
                        {itemsInHeader.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No items added to this category yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {itemsInHeader.map((item, idx) => {
                              const globalIndex = budgetItems.indexOf(item);
                              return (
                                <div
                                  key={idx}
                                  className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-3.5 bg-gray-50/80 rounded-lg border border-gray-200"
                                >
                                  <div className="md:col-span-4">
                                    <Input
                                      label="Item Name & Description"
                                      value={item.name}
                                      disabled={isReadOnly}
                                      placeholder="e.g. Raspberry Pi 4 Model B (4GB)"
                                      onChange={(e) =>
                                        updateBudgetItem(globalIndex, 'name', e.target.value)
                                      }
                                      required
                                    />
                                  </div>
                                  <div className="md:col-span-3">
                                    <Input
                                      label="Vendor / Source"
                                      value={item.vendor || ''}
                                      disabled={isReadOnly}
                                      placeholder="e.g. Robu.in / Amazon"
                                      onChange={(e) =>
                                        updateBudgetItem(globalIndex, 'vendor', e.target.value)
                                      }
                                      required
                                    />
                                  </div>

                                  {isCont ? (
                                    <div className="md:col-span-3">
                                      <Input
                                        label="Contingency Amount (₹)"
                                        type="number"
                                        value={item.unitCost || ''}
                                        disabled={isReadOnly}
                                        onChange={(e) =>
                                          updateBudgetItem(globalIndex, 'unitCost', e.target.value)
                                        }
                                        required
                                      />
                                    </div>
                                  ) : (
                                    <>
                                      <div className="md:col-span-2">
                                        <Input
                                          label="Unit Cost (₹)"
                                          type="number"
                                          value={item.unitCost || ''}
                                          disabled={isReadOnly}
                                          onChange={(e) =>
                                            updateBudgetItem(globalIndex, 'unitCost', e.target.value)
                                          }
                                          required
                                        />
                                      </div>
                                      <div className="md:col-span-1">
                                        <Input
                                          label="Qty"
                                          type="number"
                                          value={item.qty || 1}
                                          disabled={isReadOnly}
                                          onChange={(e) =>
                                            updateBudgetItem(globalIndex, 'qty', e.target.value)
                                          }
                                          required
                                        />
                                      </div>
                                    </>
                                  )}

                                  <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0">
                                    <span className="text-sm font-semibold text-gray-900">
                                      ₹{item.total || 0}
                                    </span>
                                    {!isReadOnly && (
                                      <button
                                        type="button"
                                        onClick={() => removeBudgetItem(globalIndex)}
                                        className="text-danger hover:text-red-700 p-1 rounded"
                                        title="Remove item"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {!isReadOnly && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addBudgetItem(header.key)}
                            className="text-xs"
                          >
                            + Add {header.name} Item
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Sticky Summary Bar */}
          <div className="sticky bottom-4 z-20 bg-white border border-gray-300 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                  Budget Summary ({grantType})
                </span>
                <div className="text-xs text-gray-600 mt-0.5">
                  Allowed Range:{' '}
                  <strong>
                    {currentRange ? `₹${currentRange[0].toLocaleString()} – ₹${currentRange[1].toLocaleString()}` : 'Variable (case by case)'}
                  </strong>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500 block">Requested Total</span>
                <span
                  className={`text-2xl font-bold ${
                    isTotalOutOfRange ? 'text-danger' : 'text-brand-primary'
                  }`}
                >
                  ₹{requestedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Warnings / Errors */}
            {isTotalOutOfRange && (
              <p className="text-xs text-danger font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Requested Total is outside the allowed range for {grantType} (₹{currentRange[0]}–₹{currentRange[1]}). Please adjust budget items.
              </p>
            )}

            {isContingencyBlocked && (
              <p className="text-xs text-danger font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Contingency ({contingencyPercentage.toFixed(1)}%) exceeds maximum allowed 20% of other budget headers. Please reduce contingency.
              </p>
            )}

            {isContingencyWarned && (
              <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
                <Info className="w-4 h-4 flex-shrink-0" />
                Contingency is {contingencyPercentage.toFixed(1)}% of total grant. Recommended to keep under 10%.
              </p>
            )}

            <div className="flex justify-between items-center pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => goToStep(3)}>
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => goToStep(5)}
                disabled={isTotalOutOfRange || isContingencyBlocked || budgetItems.length === 0}
              >
                Next: Justification
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 5: JUSTIFICATION
      ───────────────────────────────────────────────────────────── */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Budget Justifications</CardTitle>
            <CardDescription>
              Explain why each item is essential for your prototype, pilot, or scale stage (max 300 characters each).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {budgetItems.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">
                No budget items found. Please go back to Step 4 and add your expenses.
              </p>
            ) : (
              budgetItems.map((item, idx) => {
                const headerInfo = BUDGET_HEADERS.find((h) => h.key === item.header);
                const justification = item.justification || '';
                return (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-gray-900 text-sm">{item.name || 'Unnamed Item'}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {headerInfo?.name || item.header}
                        </Badge>
                      </div>
                      <span className="text-xs font-medium text-gray-600 sm:text-right">
                        ₹{item.total || 0} {item.vendor ? `(${item.vendor})` : ''}
                      </span>
                    </div>

                    <div className="pt-1">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-gray-600">
                          Justification <span className="text-danger">*</span>
                        </label>
                        <span className="text-[11px] text-gray-400">{justification.length}/300</span>
                      </div>
                      <Textarea
                        value={justification}
                        disabled={isReadOnly}
                        maxLength={300}
                        rows={2}
                        placeholder="Why is this item essential for your experiment or prototype stage?"
                        onChange={(e) => updateBudgetItem(idx, 'justification', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
          <CardFooter className="justify-between border-t border-gray-100 pt-6">
            <Button type="button" variant="outline" onClick={() => goToStep(4)}>
              Back
            </Button>
            <Button
              type="button"
              onClick={() => goToStep(6)}
              disabled={
                budgetItems.length === 0 ||
                budgetItems.some((b) => !(b.justification || '').trim())
              }
            >
              Next: Self-Assessment
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 6: SELF-ASSESSMENT (TRL, MRL, IRL & Milestones)
      ───────────────────────────────────────────────────────────── */}
      {step === 6 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Technology & Market Readiness Levels</CardTitle>
              <CardDescription>
                Self-evaluate your current Technology (TRL), Manufacturing (MRL), and Integration (IRL) levels (1–9).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: 'trl', title: 'Technology Readiness Level (TRL)', list: LEVELS.TRL },
                { key: 'mrl', title: 'Manufacturing Readiness Level (MRL)', list: LEVELS.MRL },
                { key: 'irl', title: 'Integration Readiness Level (IRL)', list: LEVELS.IRL },
              ].map((scale) => {
                const currentVal = formData.selfAssessment?.[scale.key] || 1;
                return (
                  <div key={scale.key} className="space-y-2 border-b border-gray-100 pb-5 last:border-none">
                    <label className="text-sm font-semibold text-gray-900 block">
                      {scale.title} <span className="text-danger">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {scale.list.map((label, idx) => {
                        const levelNum = idx + 1;
                        const isSelected = currentVal === levelNum;
                        return (
                          <label
                            key={levelNum}
                            className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-50/80 border-brand-primary text-brand-primary font-medium'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={scale.key}
                              value={levelNum}
                              disabled={isReadOnly}
                              checked={isSelected}
                              onChange={() =>
                                setFormData({
                                  ...formData,
                                  selfAssessment: {
                                    ...(formData.selfAssessment || {}),
                                    [scale.key]: levelNum,
                                  },
                                })
                              }
                              className="mt-0.5 text-brand-primary focus:ring-brand-primary"
                            />
                            <span>
                              <strong>{scale.key.toUpperCase()} {levelNum}:</strong> {label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Milestone Self-Assessment */}
          <Card>
            <CardHeader>
              <CardTitle>Milestone Self-Assessment</CardTitle>
              <CardDescription>
                Choose your track and evaluate progress against standard milestones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Track Selector */}
              <div>
                <label className="text-sm font-semibold text-gray-900 block mb-2">
                  Select Milestone Track <span className="text-danger">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['PROTOTYPING', 'PROFESSIONAL'] as const).map((trackKey) => (
                    <label
                      key={trackKey}
                      className={`flex items-start gap-3 p-3.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                        currentTrack === trackKey
                          ? 'bg-blue-50 border-brand-primary text-brand-primary font-semibold'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="milestoneTrack"
                        value={trackKey}
                        disabled={isReadOnly}
                        checked={currentTrack === trackKey}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            selfAssessment: {
                              ...(formData.selfAssessment || {}),
                              track: trackKey,
                            },
                          })
                        }
                        className="mt-0.5 text-brand-primary focus:ring-brand-primary"
                      />
                      <span>{TRACK_LABELS[trackKey]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Milestones list for track */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-900 block">
                  Track Milestones:
                </label>
                {MILESTONES[currentTrack].map((mName, i) => {
                  const mState =
                    (formData.selfAssessment?.milestones || []).find((m: any) => m.name === mName) || {
                      name: mName,
                      status: 'PENDING',
                      remarks: '',
                    };

                  return (
                    <div
                      key={i}
                      className="p-3.5 bg-gray-50 rounded-lg border border-gray-200 space-y-2 text-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="font-medium text-gray-900">
                          {i + 1}. {mName}
                        </span>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-green-700">
                            <input
                              type="radio"
                              name={`m-status-${i}`}
                              disabled={isReadOnly}
                              checked={mState.status === 'COMPLETED'}
                              onChange={() => handleMilestoneChange(mName, 'COMPLETED')}
                              className="text-green-600 focus:ring-green-500"
                            />
                            Completed
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-600">
                            <input
                              type="radio"
                              name={`m-status-${i}`}
                              disabled={isReadOnly}
                              checked={mState.status === 'PENDING'}
                              onChange={() => handleMilestoneChange(mName, 'PENDING')}
                              className="text-gray-600 focus:ring-gray-500"
                            />
                            Pending
                          </label>
                        </div>
                      </div>

                      <Input
                        placeholder="Optional remarks (e.g. 5 customer interviews conducted so far)"
                        value={mState.remarks || ''}
                        disabled={isReadOnly}
                        onChange={(e) => handleMilestoneChange(mName, mState.status, e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Annexure Upload for screenshots */}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                <label className="text-sm font-semibold text-gray-900 block">
                  Optional Annexure Upload (Screenshots & Supporting Evidence)
                </label>
                <p className="text-xs text-gray-500">
                  Upload screenshots of your prototype, CAD designs, software UI, or data charts (PDF/JPG/PNG, max 5 MB).
                </p>

                <div className="flex flex-wrap gap-2 items-center pt-1">
                  {documents
                    .filter((d) => d.type === 'ANNEXURE')
                    .map((annex) => (
                      <div
                        key={annex.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-xs text-gray-800"
                      >
                        <FileText className="w-3.5 h-3.5 text-brand-primary" />
                        <span>Annexure</span>
                        <a
                          href={`/api/documents/${annex.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-primary hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(annex.id)}
                            className="text-danger hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}

                  {!isReadOnly && (
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer shadow-sm">
                      <Upload className="w-3.5 h-3.5 text-brand-primary" />
                      Add Annexure File
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'ANNEXURE')}
                      />
                    </label>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between border-t border-gray-100 pt-6">
              <Button type="button" variant="outline" onClick={() => goToStep(5)}>
                Back
              </Button>
              <Button type="button" onClick={() => goToStep(7)}>
                Next: Documents & Team
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 7: DOCUMENTS
      ───────────────────────────────────────────────────────────── */}
      {step === 7 && (
        <Card>
          <CardHeader>
            <CardTitle>Documents & Team KYC</CardTitle>
            <CardDescription>
              Upload team identity verification documents, pitch deck, and prior grant utilization report (if applicable).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Pitch Deck */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    Pitch Deck (PDF) <span className="text-danger">*</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Share the deck with IDEAPAD 2 days before your SEC presentation.
                  </p>
                </div>
                {documents.some((d) => d.type === 'DECK') && (
                  <Badge variant="success">Uploaded</Badge>
                )}
              </div>

              <div className="flex items-center gap-3">
                {documents
                  .filter((d) => d.type === 'DECK')
                  .map((deck) => (
                    <div
                      key={deck.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs text-gray-800"
                    >
                      <FileText className="w-4 h-4 text-brand-primary" />
                      <span>Pitch Deck PDF</span>
                      <a
                        href={`/api/documents/${deck.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-primary hover:underline ml-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(deck.id)}
                          className="text-danger hover:text-red-700 ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                {!isReadOnly && (
                  <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer shadow-sm">
                    <FileUp className="w-4 h-4 text-brand-primary" />
                    {documents.some((d) => d.type === 'DECK') ? 'Replace Pitch Deck' : 'Upload Pitch Deck'}
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'DECK')}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Utilization Report (if received grant before) */}
            {formData.hasReceivedGrantBefore && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-amber-950 text-sm">
                      Previous Grant Utilization Report <span className="text-danger">*</span>
                    </h3>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Required because you indicated your team previously received a seed grant.
                    </p>
                  </div>
                  {documents.some((d) => d.type === 'UTILIZATION_REPORT') && (
                    <Badge variant="success">Uploaded</Badge>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {documents
                    .filter((d) => d.type === 'UTILIZATION_REPORT')
                    .map((doc) => (
                      <div
                        key={doc.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-amber-300 rounded-md text-xs text-gray-800"
                      >
                        <FileText className="w-4 h-4 text-amber-600" />
                        <span>Utilization Report</span>
                        <a
                          href={`/api/documents/${doc.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-primary hover:underline ml-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(doc.id)}
                            className="text-danger hover:text-red-700 ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}

                  {!isReadOnly && (
                    <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer shadow-sm">
                      <FileUp className="w-4 h-4 text-amber-600" />
                      Upload Utilization Report
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'UTILIZATION_REPORT')}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Team Members List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    Team Members & KYC <span className="text-danger">*</span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Upload PAN, Aadhaar, and Passport Photo for each team member.
                  </p>
                </div>
                {!isReadOnly && (
                  <Button type="button" variant="outline" size="sm" onClick={addTeamMember}>
                    + Add Team Member
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {teamMembers.map((member, mIdx) => {
                  const mName = member.name.trim();
                  const panDoc = documents.find((d) => d.type === 'PAN' && d.memberLabel === mName);
                  const aadhaarDoc = documents.find((d) => d.type === 'AADHAAR' && d.memberLabel === mName);
                  const photoDoc = documents.find((d) => d.type === 'PHOTO' && d.memberLabel === mName);

                  return (
                    <div
                      key={mIdx}
                      className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 max-w-sm">
                          <Input
                            label={`Team Member ${mIdx + 1} Full Name`}
                            value={member.name}
                            disabled={isReadOnly}
                            placeholder="Full name as on Aadhaar/PAN"
                            onChange={(e) => updateTeamMember(mIdx, e.target.value)}
                            required
                          />
                        </div>
                        {teamMembers.length > 1 && !isReadOnly && (
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => removeTeamMember(mIdx)}
                          >
                            Remove Member
                          </Button>
                        )}
                      </div>

                      {/* 3 KYC Uploads for Member */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                        {[
                          { type: 'PAN', label: 'PAN Card', doc: panDoc },
                          { type: 'AADHAAR', label: 'Aadhaar Card', doc: aadhaarDoc },
                          { type: 'PHOTO', label: 'Passport Photo', doc: photoDoc },
                        ].map((kyc) => (
                          <div
                            key={kyc.type}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2 text-xs"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-800">{kyc.label}</span>
                              {kyc.doc ? (
                                <Badge variant="success" className="text-[10px]">Done</Badge>
                              ) : (
                                <Badge variant="warning" className="text-[10px]">Required</Badge>
                              )}
                            </div>

                            {kyc.doc ? (
                              <div className="flex items-center justify-between pt-1">
                                <a
                                  href={`/api/documents/${kyc.doc.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-brand-primary hover:underline flex items-center gap-1 truncate max-w-[150px]"
                                >
                                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span>View file</span>
                                </a>
                                {!isReadOnly && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDocument(kyc.doc.id)}
                                    className="text-danger hover:text-red-700"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              !isReadOnly && (
                                <label
                                  className={`inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-2 bg-white border border-gray-300 rounded text-[11px] font-medium text-gray-700 hover:bg-gray-100 cursor-pointer shadow-sm ${
                                    !mName ? 'opacity-40 pointer-events-none' : ''
                                  }`}
                                >
                                  <Upload className="w-3 h-3 text-brand-primary" />
                                  Upload {kyc.label}
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="hidden"
                                    disabled={!mName}
                                    onChange={(e) => handleFileUpload(e, kyc.type, mName)}
                                  />
                                </label>
                              )
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-between border-t border-gray-100 pt-6">
            <Button type="button" variant="outline" onClick={() => goToStep(6)}>
              Back
            </Button>
            <Button type="button" onClick={() => goToStep(8)}>
              Next: Review & Submit
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 8: REVIEW AND SUBMIT
      ───────────────────────────────────────────────────────────── */}
      {step === 8 && (
        <div className="space-y-6">
          {/* Read-Only Profile Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-900">Applicant Profile Details</CardTitle>
              <CardDescription>Auto-captured from registration (read-only)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs bg-gray-50 p-4 rounded-lg">
                <div>
                  <span className="text-gray-400 block">Applicant Name</span>
                  <span className="font-semibold text-gray-900">{registeredUser.name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Enrollment No.</span>
                  <span className="font-semibold text-gray-900">
                    {application.startup?.enrollmentNo || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Academic Program</span>
                  <span className="font-semibold text-gray-900">
                    {application.startup?.program || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Startup / Team Name</span>
                  <span className="font-semibold text-gray-900">
                    {application.startup?.teamName || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Phone</span>
                  <span className="font-semibold text-gray-900">
                    {application.startup?.phone || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Email Address</span>
                  <span className="font-semibold text-gray-900">{registeredUser.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section Summaries with Edit Links */}
          <Card>
            <CardHeader>
              <CardTitle>Application Summary</CardTitle>
              <CardDescription>
                Review every section before final submission. Click "Edit" to modify any section.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Step 1 Summary */}
              <div className="p-3.5 bg-gray-50 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-gray-900 block">1. Agreement</span>
                  {formData.agreement ? (
                    <span className="text-gray-600">
                      Accepted by <strong>{formData.agreement.acceptedByName}</strong> on{' '}
                      {new Date(formData.agreement.acceptedAt).toLocaleDateString()} (Version{' '}
                      {formData.agreement.version})
                    </span>
                  ) : (
                    <span className="text-danger">Agreement not accepted</span>
                  )}
                </div>
                {!isReadOnly && (
                  <Button variant="ghost" size="sm" onClick={() => goToStep(1)} className="text-xs">
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                )}
              </div>

              {/* Step 2 Summary */}
              <div className="p-3.5 bg-gray-50 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-gray-900 block">2. Basic Information</span>
                  <span className="text-gray-600">
                    Grant Tier: <strong>{grantType}</strong> · Problem Statement: {(formData.problemStatement || '').slice(0, 50)}...
                  </span>
                </div>
                {!isReadOnly && (
                  <Button variant="ghost" size="sm" onClick={() => goToStep(2)} className="text-xs">
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                )}
              </div>

              {/* Step 3 Summary */}
              <div className="p-3.5 bg-gray-50 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-gray-900 block">3. Experiment Definition</span>
                  <span className="text-gray-600">
                    10 experimental validation fields completed
                  </span>
                </div>
                {!isReadOnly && (
                  <Button variant="ghost" size="sm" onClick={() => goToStep(3)} className="text-xs">
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                )}
              </div>

              {/* Step 4 & 5 Summary */}
              <div className="p-3.5 bg-gray-50 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-gray-900 block">4 & 5. Budget & Justification</span>
                  <span className="text-gray-600">
                    Requested Total: <strong>₹{requestedTotal.toFixed(2)}</strong> across {budgetItems.length} items
                  </span>
                </div>
                {!isReadOnly && (
                  <Button variant="ghost" size="sm" onClick={() => goToStep(4)} className="text-xs">
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                )}
              </div>

              {/* Step 6 Summary */}
              <div className="p-3.5 bg-gray-50 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-gray-900 block">6. Readiness & Milestones</span>
                  <span className="text-gray-600">
                    TRL: {formData.selfAssessment?.trl || 1} · MRL: {formData.selfAssessment?.mrl || 1} · IRL: {formData.selfAssessment?.irl || 1} · Track: {TRACK_LABELS[currentTrack]}
                  </span>
                </div>
                {!isReadOnly && (
                  <Button variant="ghost" size="sm" onClick={() => goToStep(6)} className="text-xs">
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                )}
              </div>

              {/* Step 7 Summary */}
              <div className="p-3.5 bg-gray-50 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-gray-900 block">7. Documents & KYC</span>
                  <span className="text-gray-600">
                    {documents.length} documents uploaded · {teamMembers.length} team members
                  </span>
                </div>
                {!isReadOnly && (
                  <Button variant="ghost" size="sm" onClick={() => goToStep(7)} className="text-xs">
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Validation Checklist */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-900">Submission Checklist</CardTitle>
              <CardDescription>
                All items below must be satisfied before submission can proceed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {checklist.map((chk, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-lg border text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {chk.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />
                      )}
                      <span className={chk.passed ? 'text-gray-800' : 'text-danger font-medium'}>
                        {chk.label}
                      </span>
                    </div>
                    {!chk.passed && !isReadOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => goToStep(chk.step)}
                        className="text-xs text-brand-primary h-7 px-2"
                      >
                        Fix
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Declaration and Submit */}
          <Card>
            <CardHeader>
              <CardTitle>Final Declaration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="final-declaration-chk"
                  disabled={isReadOnly}
                  checked={declarationChecked}
                  onChange={(e) => setDeclarationChecked(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                />
                <label htmlFor="final-declaration-chk" className="text-sm text-gray-700 leading-relaxed">
                  I hereby declare that all information provided is true and the requested grant amount will be used strictly for the stated purpose.
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <Input
                  label="Type your registered full name to sign"
                  value={typedDeclarationName}
                  disabled={!declarationChecked || isReadOnly}
                  onChange={(e) => setTypedDeclarationName(e.target.value)}
                  placeholder={registeredName}
                  helpText={`Must match registered applicant name: "${registeredName}"`}
                  required
                />
                <Input
                  label="Date"
                  value={new Date().toLocaleDateString()}
                  readOnly
                  disabled
                />
              </div>
            </CardContent>
            <CardFooter className="justify-between border-t border-gray-100 pt-6">
              <Button type="button" variant="outline" onClick={() => goToStep(7)}>
                Back
              </Button>
              {!isReadOnly && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleFinalSubmit}
                  disabled={!canSubmit || saving}
                  loading={saving}
                >
                  Submit Application
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Agreement Terms Modal */}
      <Modal
        isOpen={showAgreementModal}
        onClose={() => setShowAgreementModal(false)}
        title={AGREEMENT_TITLE}
      >
        <div className="space-y-4 text-xs text-gray-700 max-h-[60vh] overflow-y-auto pr-1">
          <p className="font-medium text-gray-900">{AGREEMENT_INTRO}</p>
          <ol className="list-decimal pl-4 space-y-2.5">
            {AGREEMENT_TERMS.map((term, i) => (
              <li key={i}>{term}</li>
            ))}
          </ol>
        </div>
      </Modal>
    </div>
  );
}
