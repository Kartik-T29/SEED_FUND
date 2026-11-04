'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText, ChevronDown, AlertCircle } from 'lucide-react';

interface DownloadApplicationButtonProps {
  isSubmitted: boolean;
  version?: number;
  submittedAtIST?: string;
  availableVersions?: Array<{
    version: number;
    createdAt?: string | Date;
    dataHash?: string;
  }>;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function DownloadApplicationButton({
  isSubmitted,
  version = 1,
  submittedAtIST,
  availableVersions = [],
  className = '',
  size = 'md',
}: DownloadApplicationButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number>(version);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDownload = async (v = selectedVersion) => {
    if (!isSubmitted) return;

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const url = `/dashboard/application/download?version=${v}`;
      const response = await fetch(url);

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          // ignore json parse error
        }

        if (response.status === 429) {
          throw new Error('Rate limit reached (max 10 downloads/min). Please wait a moment before trying again.');
        }

        if (response.status === 403) {
          throw new Error(errorData.error || 'You can download your application after you submit it.');
        }

        throw new Error(errorData.error || `Download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `IDEAPAD-Seed-Application-v${v}.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error('Download PDF error:', err);
      setErrorMessage(err.message || 'Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isSubmitted) {
    return (
      <div className={`inline-flex flex-col ${className}`}>
        <Button
          type="button"
          variant="outline"
          size={size}
          disabled
          className="opacity-60 cursor-not-allowed flex items-center gap-1.5"
          title="You can download your application after you submit it."
        >
          <Download className="w-4 h-4 text-gray-400" />
          <span>Download my application (PDF)</span>
        </Button>
        <span className="text-[11px] text-gray-500 mt-1 italic">
          You can download your application after you submit it.
        </span>
      </div>
    );
  }

  const hasMultipleVersions = availableVersions && availableVersions.length > 1;

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size={size}
          onClick={() => handleDownload(selectedVersion)}
          disabled={isGenerating}
          className="font-semibold text-brand-primary border-brand-primary/30 hover:bg-brand-primary/5 shadow-sm flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
              <span>Generating PDF...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 text-brand-primary" />
              <span>Download my application (PDF)</span>
            </>
          )}
        </Button>

        {/* Multiple Versions Selector */}
        {hasMultipleVersions && (
          <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border rounded px-2 py-1">
            <span className="text-gray-500">Version:</span>
            <select
              value={selectedVersion}
              onChange={(e) => {
                const newV = parseInt(e.target.value, 10);
                setSelectedVersion(newV);
                handleDownload(newV);
              }}
              disabled={isGenerating}
              className="bg-transparent font-semibold text-gray-800 border-none focus:outline-none cursor-pointer"
            >
              {availableVersions.map((v) => (
                <option key={v.version} value={v.version}>
                  v{v.version} {v.version === version ? '(Latest)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Submitted info badge */}
      <div className="flex items-center gap-2 text-[11px] text-gray-500">
        <span>v{selectedVersion}</span>
        {submittedAtIST && <span>· Submitted on {submittedAtIST}</span>}
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-danger flex items-start gap-1.5 mt-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
