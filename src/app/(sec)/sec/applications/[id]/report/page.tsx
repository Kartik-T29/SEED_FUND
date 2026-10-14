import { getSession } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { getConsolidatedReport, Forbidden } from '@/lib/access';
import ConsolidatedReportView from '@/components/consolidated/ConsolidatedReportView';
import Link from 'next/link';
import { ArrowLeft, FileText, Printer } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SecConsolidatedReportPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session || session.role !== 'SEC_MEMBER') redirect('/login');

  let report: any;
  try {
    report = await getConsolidatedReport(session, params.id);
  } catch (error: any) {
    if (error instanceof Forbidden || error?.message === 'REVEAL_AFTER_OWN_SUBMIT') {
      notFound();
    }
    throw error;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-3">
          <Link
            href={`/sec/applications/${params.id}`}
            className="p-2 border rounded-lg hover:bg-gray-100 text-gray-600 transition"
            title="Back to Assessment"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Consolidated SEC Report (Form A)
            </h1>
            <p className="text-xs text-gray-500">
              {report.application?.startup?.teamName} • Tier: {report.application?.grantType}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/applications/${params.id}/pdf/summary`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
          >
            <Printer className="h-4 w-4 text-emerald-600" />
            <span>Summary Report (PDF)</span>
          </a>
          <a
            href={`/api/applications/${params.id}/pdf/application`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
          >
            <FileText className="h-4 w-4 text-brand-primary" />
            <span>Application (PDF)</span>
          </a>
        </div>
      </div>

      <ConsolidatedReportView report={report} showSectionAnchors={true} />
    </div>
  );
}
