'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/Logo';
import {
  BUDGET_HEADERS,
  GRANT_RANGES,
  LEVELS,
  TRACK_LABELS,
} from '@/lib/seedfund-constants';
import { formatISTDate, formatISTDateTime } from '@/lib/dates';
import {
  FileText,
  ExternalLink,
  Printer,
  CheckCircle2,
} from 'lucide-react';

interface ApplicationViewSectionProps {
  application: any;
}

export default function ApplicationViewSection({ application }: ApplicationViewSectionProps) {
  const startup = application.startup || {};
  const user = startup.user || {};
  const formData = application.formData || {};
  const agreement = formData.agreement;
  const exp = formData.experiment || {};
  const sa = formData.selfAssessment || {};
  const teamMembers = formData.teamMembers || [];
  const budgetItems = application.budgetItems || [];
  const documents = application.documents || [];

  const grantType = application.grantType || 'IDEATION';
  const range = (GRANT_RANGES as any)[grantType];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 printable-application">
      {/* Header card with Print Action and Official Brand */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
          <Logo size="md" className="h-10 w-auto" />
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{startup.teamName}</h2>
              <Badge
                variant={
                  application.status === 'APPROVED'
                    ? 'success'
                    : application.status === 'REJECTED'
                    ? 'danger'
                    : 'info'
                }
              >
                {application.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Application ID: <span className="font-mono text-gray-700">{application.id}</span> · Submitted:{' '}
              {application.submittedAt ? formatISTDate(application.submittedAt) : 'Draft'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="no-print">
            <Printer className="w-4 h-4 mr-1.5" /> Print Application PDF
          </Button>
        </div>
      </div>

      {/* 1. Applicant Profile */}
      <section id="app-view-profile">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900">1. Applicant & Startup Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs bg-gray-50 p-4 rounded-lg">
              <div>
                <span className="text-gray-400 block">Applicant Name</span>
                <span className="font-semibold text-gray-900">{user.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Enrollment No.</span>
                <span className="font-semibold text-gray-900">{startup.enrollmentNo || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Program & Department</span>
                <span className="font-semibold text-gray-900">
                  {startup.program || 'N/A'} {startup.department ? `· ${startup.department}` : ''}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">Team Name</span>
                <span className="font-semibold text-gray-900">{startup.teamName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Phone</span>
                <span className="font-semibold text-gray-900">{startup.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Email</span>
                <span className="font-semibold text-gray-900">{user.email || 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 2. Agreement & Terms */}
      <section id="app-view-agreement">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900">2. Grant Policy Agreement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {agreement ? (
              <div className="p-3.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-900 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Agreement accepted by {agreement.acceptedByName} on{' '}
                  {formatISTDateTime(agreement.acceptedAt)} (Version {agreement.version})
                </div>
                <p className="text-[11px] text-green-700 font-mono">
                  SHA-256 Hash: {agreement.textHash}
                </p>
              </div>
            ) : (
              <p className="text-xs text-danger">Agreement not accepted</p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 3. Basic Information & Concept */}
      <section id="app-view-problem">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900">3. Basic Information & Concept</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div>
              <span className="text-gray-400 block mb-1">Target Grant Category</span>
              <span className="inline-block px-2.5 py-1 bg-brand-primary-light text-brand-primary font-bold rounded">
                {grantType}
                {range ? ` (₹${range[0].toLocaleString('en-IN')} – ₹${range[1].toLocaleString('en-IN')})` : ''}
              </span>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Problem You Are Solving (Explain startup in short)</h4>
              <p className="p-3 bg-gray-50 rounded border text-gray-700 whitespace-pre-wrap">
                {formData.problemStatement || 'Not provided'}
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Proposed Solution (As short as possible)</h4>
              <p className="p-3 bg-gray-50 rounded border text-gray-700 whitespace-pre-wrap">
                {formData.proposedSolution || 'Not provided'}
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Effort and Traction So Far (As short as possible)</h4>
              <p className="p-3 bg-gray-50 rounded border text-gray-700 whitespace-pre-wrap">
                {formData.effortAndTraction || 'Not provided'}
              </p>
            </div>

            {formData.hasReceivedGrantBefore && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900">
                <span className="font-semibold">Note:</span> Applicant reports having received prior grant funding.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 4. Experiment Definition */}
      <section id="app-view-experiment">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900">4. Experiment Definition (10 Headings)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {[
                { k: 'objective', label: '1. Objective (Hypothesis tested)' },
                { k: 'problemStatement', label: '2. Problem Statement (Gap addressed)' },
                { k: 'expectedOutcome', label: '3. Expected Outcome (TRL-3 proof)' },
                { k: 'methodology', label: '4. Methodology (Experiment execution)' },
                { k: 'experimentalSetup', label: '5. Experimental Setup (Tools & materials)' },
                { k: 'dataToBeCollected', label: '6. Data to be Collected (Measurements)' },
                { k: 'validationCriteria', label: '7. Validation Criteria (Success evaluation)' },
                { k: 'risksAndAssumptions', label: '8. Risks & Assumptions (Dependencies)' },
                { k: 'timeline', label: '9. Timeline (Key stages & duration)' },
                { k: 'deliverables', label: '10. Deliverables (Prototype/report/demo)' },
              ].map(({ k, label }) => (
                <div key={k} className="p-3 bg-gray-50 rounded border">
                  <span className="font-semibold text-gray-900 block mb-1">{label}</span>
                  <p className="text-gray-700 whitespace-pre-wrap">{(exp as any)[k] || 'Not specified'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 5. Budget Details */}
      <section id="app-view-budget">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-gray-900">5. Budget Details & Requested Total</CardTitle>
            <span className="text-base font-bold text-brand-primary">
              Requested Total: ₹{Number(application.requestedTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 text-gray-700 font-semibold border-b">
                  <tr>
                    <th className="p-2.5">S.No</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Item Name</th>
                    <th className="p-2.5">Vendor / Source</th>
                    <th className="p-2.5 text-right">Unit Cost (₹)</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {budgetItems.map((b: any, i: number) => {
                    const headerInfo = BUDGET_HEADERS.find((h) => h.key === b.header);
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-2.5">{i + 1}</td>
                        <td className="p-2.5 font-medium">{headerInfo?.name || b.header}</td>
                        <td className="p-2.5">{b.name}</td>
                        <td className="p-2.5 text-gray-600">{b.vendor || '—'}</td>
                        <td className="p-2.5 text-right">₹{Number(b.unitCost).toFixed(2)}</td>
                        <td className="p-2.5 text-center">{b.qty}</td>
                        <td className="p-2.5 text-right font-semibold">₹{Number(b.total).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 6. Justifications */}
      <section id="app-view-justification">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900">6. Budget Justifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-xs">
              {budgetItems.map((b: any, i: number) => (
                <div key={i} className="p-3 bg-gray-50 rounded border space-y-1">
                  <div className="flex justify-between items-center font-semibold text-gray-900">
                    <span>
                      Item #{i + 1}: {b.name}
                    </span>
                    <span className="text-gray-500">₹{Number(b.total).toFixed(2)}</span>
                  </div>
                  <p className="text-gray-700 italic">
                    {b.justification || 'No specific justification recorded.'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 7. Self-Assessment */}
      <section id="app-view-self-assessment">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900">7. Self-Assessment: TRL, MRL, IRL & Milestones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg text-center">
              <div>
                <span className="text-gray-400 block">Technology Readiness</span>
                <span className="text-lg font-bold text-brand-primary">TRL {sa.trl || 1}</span>
                <span className="text-[11px] text-gray-600 block mt-0.5">
                  {LEVELS.TRL[(sa.trl || 1) - 1]}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">Manufacturing Readiness</span>
                <span className="text-lg font-bold text-brand-primary">MRL {sa.mrl || 1}</span>
                <span className="text-[11px] text-gray-600 block mt-0.5">
                  {LEVELS.MRL[(sa.mrl || 1) - 1]}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">Integration Readiness</span>
                <span className="text-lg font-bold text-brand-primary">IRL {sa.irl || 1}</span>
                <span className="text-[11px] text-gray-600 block mt-0.5">
                  {LEVELS.IRL[(sa.irl || 1) - 1]}
                </span>
              </div>
            </div>

            <div id="app-view-milestones">
              <h4 className="font-semibold text-gray-900 mb-2">
                Milestone Track:{' '}
                <span className="text-brand-primary font-bold">
                  {TRACK_LABELS[sa.track as 'PROTOTYPING' | 'PROFESSIONAL'] || sa.track || 'Prototyping'}
                </span>
              </h4>
              <div className="space-y-1.5">
                {(sa.milestones || []).map((m: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 bg-gray-50 rounded border text-xs"
                  >
                    <span className="font-medium text-gray-800">
                      {i + 1}. {m.name}
                    </span>
                    <div className="flex items-center gap-3">
                      {m.remarks && <span className="text-gray-500 italic">"{m.remarks}"</span>}
                      <Badge variant={m.status === 'COMPLETED' ? 'success' : 'default'}>
                        {m.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 8. Documents & Team Members */}
      <section id="app-view-documents">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-gray-900">8. Documents & Team KYC</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {/* Pitch Deck */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-1.5">Pitch Deck & Core Documents:</h4>
              <div className="flex flex-wrap gap-2">
                {documents
                  .filter((d: any) => ['DECK', 'UTILIZATION_REPORT', 'QUOTATION', 'ANNEXURE'].includes(d.type))
                  .map((doc: any) => (
                    <a
                      key={doc.id}
                      href={`/api/documents/${doc.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-900 rounded font-medium hover:bg-blue-100"
                    >
                      <FileText className="w-3.5 h-3.5 text-brand-primary" />
                      <span>{doc.type}</span>
                      <ExternalLink className="w-3 h-3 text-brand-primary" />
                    </a>
                  ))}
              </div>
            </div>

            {/* Team Members */}
            <div className="pt-2 border-t">
              <h4 className="font-semibold text-gray-900 mb-2">Team Members KYC:</h4>
              <div className="space-y-3">
                {teamMembers.map((member: any, i: number) => {
                  const memberDocs = documents.filter((d: any) => d.memberLabel === member.name);
                  return (
                    <div key={i} className="p-3 bg-gray-50 rounded border space-y-1.5">
                      <span className="font-semibold text-gray-900 block">
                        Member {i + 1}: {member.name}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {memberDocs.map((doc: any) => (
                          <a
                            key={doc.id}
                            href={`/api/documents/${doc.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                          >
                            <FileText className="w-3.5 h-3.5 text-gray-500" />
                            <span>{doc.type}</span>
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
