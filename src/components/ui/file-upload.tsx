'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { cn } from '@/lib/utils';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';

interface FileUploadProps {
  label: string;
  accept?: string;
  error?: string;
  maxSizeMB?: number;
  onChange: (file: File | null) => void;
  currentFile?: string;
  required?: boolean;
}

function FileUpload({ label, accept = '.pdf,.jpg,.jpeg,.png', error, maxSizeMB = 5, onChange, currentFile, required }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>(currentFile || '');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File | null) => {
    if (!file) {
      setFileName('');
      onChange(null);
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File size must be under ${maxSizeMB} MB`);
      return;
    }
    setFileName(file.name);
    onChange(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] || null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0] || null);
  };

  const isPdf = fileName.endsWith('.pdf');

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
          dragOver ? 'border-brand-primary bg-blue-50' : 'border-gray-300 hover:border-gray-400',
          error && 'border-danger'
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
        {fileName ? (
          <div className="flex items-center justify-center gap-2">
            {isPdf ? <FileText className="h-5 w-5 text-brand-primary" /> : <ImageIcon className="h-5 w-5 text-brand-primary" />}
            <span className="text-sm text-gray-700 truncate max-w-[200px]">{fileName}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleFile(null); if (inputRef.current) inputRef.current.value = ''; }}
              className="p-0.5 rounded hover:bg-gray-200"
              aria-label="Remove file"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <Upload className="h-8 w-8 mx-auto text-gray-400" />
            <p className="text-sm text-gray-500">Click or drag file to upload</p>
            <p className="text-xs text-gray-400">PDF, JPEG, PNG up to {maxSizeMB}MB</p>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export { FileUpload };
