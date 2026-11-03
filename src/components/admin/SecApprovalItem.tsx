'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { approveSecAction, rejectSecAction } from '@/lib/auth-actions';

interface Props {
  member: {
    id: string;
    name: string;
    email: string;
    designation: string | null;
    department: string | null;
    createdAt: Date;
  };
}

export function SecApprovalItem({ member }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onApprove() {
    if (!confirm(`Are you sure you want to approve SEC membership for ${member.name}?`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await approveSecAction(member.id);
      if (res?.error) setError(res.error);
      else router.refresh();
    } catch {
      setError('Failed to approve member.');
    } finally {
      setLoading(false);
    }
  }

  async function onReject() {
    if (!confirm(`Are you sure you want to reject the registration of ${member.name}?`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await rejectSecAction(member.id);
      if (res?.error) setError(res.error);
      else router.refresh();
    } catch {
      setError('Failed to reject member.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-amber-50/50 rounded-xl border border-amber-200 gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <strong className="text-gray-900 font-semibold">{member.name}</strong>
          <span className="text-xs bg-amber-100 text-amber-800 font-medium px-2 py-0.5 rounded-full border border-amber-300">
            Pending Verification
          </span>
        </div>
        <p className="text-xs text-gray-600 font-mono">{member.email}</p>
        <p className="text-xs text-gray-700">
          <span className="font-medium">{member.designation || 'Panelist'}</span> • {member.department || 'Incubation Committee'}
        </p>
        <p className="text-[11px] text-gray-400">
          Registered: {new Date(member.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
        {error && <p className="text-xs text-rose-600 font-medium mt-1">{error}</p>}
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        <Button
          onClick={onReject}
          disabled={loading}
          variant="outline"
          className="text-xs px-3 py-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
        >
          Reject
        </Button>
        <Button
          onClick={onApprove}
          disabled={loading}
          className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {loading ? 'Processing...' : 'Approve Evaluator'}
        </Button>
      </div>
    </div>
  );
}
