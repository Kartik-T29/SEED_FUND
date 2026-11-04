'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, UserCheck, UserX, Settings, ShieldAlert, CheckCircle } from 'lucide-react';
import { adminReleasePanelSlotAction, updateSignatoryAction } from '@/app/(admin)/admin/application/[id]/actions';

interface PanelMember {
  position: number;
  member: {
    id: string;
    name: string;
    designation?: string | null;
    department?: string | null;
  };
  assignedAt?: string | Date;
  startedAt?: string | Date;
}

interface Signatory {
  key: string;
  name: string;
  designation: string;
  sortOrder: number;
}

interface AdminPanelAndSignatoriesProps {
  applicationId: string;
  panelMembers: PanelMember[];
  assessments: any[];
  signatories: Signatory[];
}

export default function AdminPanelAndSignatories({
  applicationId,
  panelMembers,
  assessments,
  signatories: initialSignatories,
}: AdminPanelAndSignatoriesProps) {
  // Release slot state
  const [releasingMemberId, setReleasingMemberId] = useState<string | null>(null);
  const [releaseReason, setReleaseReason] = useState('');
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  // Signatories editing state
  const [signatories, setSignatories] = useState(initialSignatories);
  const [editingSignatoryKey, setEditingSignatoryKey] = useState<string | null>(null);
  const [sigName, setSigName] = useState('');
  const [sigDesignation, setSigDesignation] = useState('');
  const [sigLoading, setSigLoading] = useState(false);
  const [sigMessage, setSigMessage] = useState<string | null>(null);

  const handleStartRelease = (memberId: string) => {
    setReleasingMemberId(memberId);
    setReleaseReason('');
    setReleaseError(null);
  };

  const handleCancelRelease = () => {
    setReleasingMemberId(null);
    setReleaseReason('');
    setReleaseError(null);
  };

  const handleConfirmRelease = async (memberId: string) => {
    if (!releaseReason.trim()) {
      setReleaseError('A written reason is required to release an assigned SEC panel slot.');
      return;
    }
    setReleaseLoading(true);
    setReleaseError(null);

    const res = await adminReleasePanelSlotAction(applicationId, memberId, releaseReason.trim());
    if (res.success) {
      setReleasingMemberId(null);
      setReleaseReason('');
      window.location.reload();
    } else {
      setReleaseError(res.error || 'Failed to release slot');
      setReleaseLoading(false);
    }
  };

  const handleStartEditSignatory = (sig: Signatory) => {
    setEditingSignatoryKey(sig.key);
    setSigName(sig.name || '');
    setSigDesignation(sig.designation || '');
    setSigMessage(null);
  };

  const handleSaveSignatory = async (key: string) => {
    setSigLoading(true);
    setSigMessage(null);

    const res = await updateSignatoryAction(key, {
      name: sigName.trim(),
      designation: sigDesignation.trim(),
    });

    if (res.success) {
      setSignatories((prev) =>
        prev.map((s) => (s.key === key ? { ...s, name: sigName.trim(), designation: sigDesignation.trim() } : s))
      );
      setEditingSignatoryKey(null);
      setSigMessage('Signatory settings updated successfully.');
    } else {
      setSigMessage(res.error || 'Failed to update signatory');
    }
    setSigLoading(false);
  };

  return (
    <div className="space-y-6 no-print">
      {/* 1. SEC Panel Committee Slots */}
      <Card>
        <CardHeader className="pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-brand-primary" />
              <CardTitle className="text-base text-gray-900">
                Assigned SEC Panel Members (First 3 to Start)
              </CardTitle>
            </div>
            <Badge variant="info">
              {panelMembers.length} of 3 Slots Filled
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Panel positions 1, 2, and 3 are fixed by start order and map directly to Form A columns.
            A slot can only be released by the admin with an audited written reason.
          </p>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {panelMembers.length === 0 ? (
            <p className="text-xs text-gray-500 italic py-2">
              No SEC member has started evaluation for this application yet.
            </p>
          ) : (
            panelMembers.map((pm) => {
              const assessment = assessments.find((a) => a.memberId === pm.member.id);
              const isSubmitted = assessment?.status === 'SUBMITTED';
              const isReleasingThis = releasingMemberId === pm.member.id;

              return (
                <div
                  key={pm.member.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">
                        Position {pm.position}: SEC Member {pm.position}
                      </span>
                      {pm.position === 1 && (
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                          Milestone Form Lead
                        </span>
                      )}
                      {isSubmitted ? (
                        <span className="text-[10px] bg-green-100 text-green-800 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Assessment Submitted
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                          In Progress / Draft
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-gray-600">
                      <strong>{pm.member.name}</strong> · {pm.member.designation || 'Designation not set'} ({pm.member.department || 'Department not set'})
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isReleasingThis && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartRelease(pm.member.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs py-1"
                      >
                        <UserX className="w-3.5 h-3.5 mr-1" /> Release Slot
                      </Button>
                    )}
                  </div>

                  {isReleasingThis && (
                    <div className="w-full mt-3 p-3 bg-red-50 border border-red-200 rounded text-xs space-y-2">
                      <div className="flex items-center gap-1 text-red-800 font-bold">
                        <ShieldAlert className="w-4 h-4" />
                        Confirm Slot Release (Audited Administrative Action)
                      </div>
                      <p className="text-red-700 text-[11px]">
                        Releasing Position {pm.position} will remove {pm.member.name} from this application&apos;s panel.
                        Any saved draft assessment by this member will be detached. This action will be logged in the permanent audit trail.
                      </p>
                      <Input
                        placeholder="Required: State the reason for releasing this panel slot..."
                        value={releaseReason}
                        onChange={(e) => setReleaseReason(e.target.value)}
                        className="bg-white text-xs"
                      />
                      {releaseError && <p className="text-red-600 font-semibold">{releaseError}</p>}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={releaseLoading}
                          onClick={() => handleConfirmRelease(pm.member.id)}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white"
                        >
                          {releaseLoading ? 'Releasing...' : 'Confirm Release'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCancelRelease}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* 2. Official Signatories Settings (Admin-Editable) */}
      <Card>
        <CardHeader className="pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-brand-primary" />
              <CardTitle className="text-base text-gray-900">
                Official Report Signatories (Settings)
              </CardTitle>
            </div>
            {sigMessage && (
              <span className="text-xs font-semibold text-green-700">
                {sigMessage}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            These names and designations feed Form A (&quot;Reviewed by&quot;) and Form B (&quot;Approval &amp; Sanction Authority&quot;).
            Per policy, the Vice Chancellor name can be provided when available.
          </p>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {signatories.map((sig) => {
            const isEditing = editingSignatoryKey === sig.key;

            return (
              <div
                key={sig.key}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                {!isEditing ? (
                  <>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {sig.name ? sig.name : <span className="text-amber-600 italic">[Blank / Pending Designation Fill]</span>}
                      </div>
                      <div className="text-gray-500 text-[11px] mt-0.5">
                        {sig.designation} <span className="text-gray-400 font-mono">({sig.key})</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartEditSignatory(sig)}
                      className="text-xs py-1"
                    >
                      Edit Signatory
                    </Button>
                  </>
                ) : (
                  <div className="w-full space-y-2">
                    <div className="font-bold text-gray-800">Editing Signatory: {sig.key}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500 block">Official Name</label>
                        <Input
                          value={sigName}
                          onChange={(e) => setSigName(e.target.value)}
                          placeholder="e.g. Prof. Yogesh Upadhyay"
                          className="bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block">Official Designation</label>
                        <Input
                          value={sigDesignation}
                          onChange={(e) => setSigDesignation(e.target.value)}
                          placeholder="e.g. Vice Chancellor, ITM University, Gwalior"
                          className="bg-white text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={sigLoading}
                        onClick={() => handleSaveSignatory(sig.key)}
                        className="text-xs bg-brand-primary text-white"
                      >
                        {sigLoading ? 'Saving...' : 'Save Signatory'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingSignatoryKey(null)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
