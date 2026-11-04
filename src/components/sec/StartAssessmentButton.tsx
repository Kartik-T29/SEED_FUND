'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startAssessmentAction } from '@/app/(sec)/sec/[id]/actions';
import { Button } from '@/components/ui/button';

interface StartAssessmentButtonProps {
  applicationId: string;
}

export default function StartAssessmentButton({ applicationId }: StartAssessmentButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);

    const res = await startAssessmentAction(applicationId);
    if (res.success) {
      router.push(`/sec/${applicationId}`);
      router.refresh();
    } else {
      setError(res.error || 'Failed to start assessment');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="primary"
        onClick={handleStart}
        disabled={loading}
        className="bg-brand-primary hover:bg-brand-primary-dark text-white text-xs font-semibold px-4 py-2"
      >
        {loading ? 'Assigning Panel Slot...' : 'Start assessment'}
      </Button>
      {error && (
        <span className="text-[11px] text-red-600 font-medium">
          {error}
        </span>
      )}
    </div>
  );
}
