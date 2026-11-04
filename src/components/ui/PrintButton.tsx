'use client';

import React from 'react';

export default function PrintButton({
  label = 'Print PDF',
  className = 'px-4 py-1.5 text-xs font-bold text-white bg-brand-primary rounded shadow hover:bg-brand-primary-dark',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      {label}
    </button>
  );
}
