'use client';

import { useState } from 'react';
import { updateSecProfileAction } from '@/app/(sec)/sec/[id]/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SecProfilePromptProps {
  initialName: string;
  initialDesignation: string;
  initialDepartment: string;
  isComplete: boolean;
}

export default function SecProfilePrompt({
  initialName,
  initialDesignation,
  initialDepartment,
  isComplete,
}: SecProfilePromptProps) {
  const [isOpen, setIsOpen] = useState(!isComplete);
  const [name, setName] = useState(initialName || '');
  const [designation, setDesignation] = useState(initialDesignation || '');
  const [department, setDepartment] = useState(initialDepartment || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await updateSecProfileAction({
      name,
      designation,
      department,
    });

    if (res.success) {
      setSaved(true);
      setTimeout(() => {
        setIsOpen(false);
      }, 1200);
    } else {
      setError(res.error || 'Failed to update profile');
    }
    setLoading(false);
  };

  if (!isOpen) {
    return (
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setIsOpen(true)}
          className="text-xs text-brand-primary hover:underline font-medium"
        >
          ✎ Edit Evaluator Profile ({name || 'Set Profile'}, {designation || 'Set Designation'})
        </button>
      </div>
    );
  }

  return (
    <div className="mb-8 p-4 bg-amber-50 border border-amber-300 rounded-lg">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="font-bold text-sm text-amber-900">
            SEC Evaluator Official Profile Required
          </h3>
          <p className="text-xs text-amber-700 mt-0.5">
            Your name, designation, and department appear on official printable Form A and Form B evaluation reports. Please ensure they are accurate.
          </p>
        </div>
        {isComplete && (
          <button
            onClick={() => setIsOpen(false)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            ✕ Close
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-gray-700 mb-1">
            Full Name (Official) *
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dr. John Doe"
            required
            className="text-xs bg-white"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-700 mb-1">
            Official Designation *
          </label>
          <Input
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder="Associate Professor / Industry Expert"
            required
            className="text-xs bg-white"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-700 mb-1">
            Department / School *
          </label>
          <Input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="School of Engineering / SOET"
            required
            className="text-xs bg-white"
          />
        </div>

        <div className="sm:col-span-3 flex items-center justify-between mt-2 pt-2 border-t border-amber-200">
          <div>
            {error && <span className="text-xs text-red-600 font-semibold">{error}</span>}
            {saved && <span className="text-xs text-green-700 font-semibold">✓ Profile successfully updated!</span>}
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="bg-brand-primary text-white text-xs font-semibold px-4 py-1.5"
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </form>
    </div>
  );
}
