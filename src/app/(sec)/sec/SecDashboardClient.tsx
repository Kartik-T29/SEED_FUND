'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TIERS, getTierBadgeClasses } from '@/lib/tiers';
import { formatDate } from '@/lib/utils';
import { Search, Clock, CheckCircle2, AlertCircle, FileText, ArrowUpDown, Filter } from 'lucide-react';

interface SecDashboardClientProps {
  initialApplications: any[];
  tierSummary: any;
  currentUserId: string;
}

export default function SecDashboardClient({
  initialApplications,
  tierSummary,
  currentUserId,
}: SecDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<string>(tierSummary.defaultTier || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyPendingMe, setOnlyPendingMe] = useState(false);
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  const counts = tierSummary.counts || {};

  // Tab configurations
  const tabs = [
    { key: 'ALL', label: 'All Tiers', count: counts.ALL?.count || 0 },
    ...TIERS.map((t) => ({
      key: t.key,
      label: t.label,
      count: counts[t.key]?.count || 0,
    })),
  ];

  // Filtering and sorting
  const filteredApplications = useMemo(() => {
    return initialApplications.filter((app) => {
      // Tier tab filter
      if (activeTab !== 'ALL' && (app.grantType || 'IDEATION') !== activeTab) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const teamName = (app.startup?.teamName || '').toLowerCase();
        const applicantName = (app.startup?.user?.name || '').toLowerCase();
        if (!teamName.includes(query) && !applicantName.includes(query)) {
          return false;
        }
      }

      // "Pending my review" filter
      if (onlyPendingMe) {
        const myAssessment = app.assessments?.find((a: any) => a.memberId === currentUserId);
        if (myAssessment?.status === 'SUBMITTED') {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date-desc') {
        const dA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dB - dA;
      }
      if (sortBy === 'date-asc') {
        const dA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dA - dB;
      }
      if (sortBy === 'amount-desc') {
        return Number(b.requestedTotal) - Number(a.requestedTotal);
      }
      if (sortBy === 'amount-asc') {
        return Number(a.requestedTotal) - Number(b.requestedTotal);
      }
      return 0;
    });
  }, [initialApplications, activeTab, searchQuery, onlyPendingMe, sortBy, currentUserId]);

  return (
    <div className="space-y-6">
      {/* Summary Strip Above Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Overall</p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-gray-900">{counts.ALL?.pendingMyReview || 0}</span>
            <span className="text-xs text-amber-600 font-medium">pending me</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">₹{Number(counts.ALL?.totalRequested || 0).toLocaleString('en-IN')} req.</p>
        </div>

        {TIERS.map((tier) => {
          const tc = counts[tier.key] || { count: 0, pendingMyReview: 0, totalRequested: 0 };
          return (
            <div
              key={tier.key}
              onClick={() => setActiveTab(tier.key)}
              className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                activeTab === tier.key
                  ? 'bg-blue-50/50 border-brand-primary shadow-sm ring-1 ring-brand-primary'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">{tier.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${getTierBadgeClasses(tier.key)}`}>
                  {tier.range ? `₹${(tier.range[1] / 1000)}k` : 'Var'}
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl font-bold text-gray-900">{tc.pendingMyReview}</span>
                <span className="text-xs text-amber-600 font-medium">pending</span>
              </div>
              <p className="text-xs text-gray-400 mt-1 truncate">
                ₹{Number(tc.totalRequested || 0).toLocaleString('en-IN')} total
              </p>
            </div>
          );
        })}
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-2 overflow-x-auto pb-px" aria-label="Tier Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap pb-3 px-3.5 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                  isActive
                    ? 'border-brand-primary text-brand-primary font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Filters & Search Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by team or founder name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              checked={onlyPendingMe}
              onChange={(e) => setOnlyPendingMe(e.target.checked)}
              className="rounded text-brand-primary focus:ring-brand-primary h-4 w-4"
            />
            <span>Pending my review</span>
          </label>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="date-desc">Submitted (Newest)</option>
              <option value="date-asc">Submitted (Oldest)</option>
              <option value="amount-desc">Requested Total (High)</option>
              <option value="amount-asc">Requested Total (Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-3">
        {filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="font-medium text-gray-700">No applications found</p>
              <p className="text-sm text-gray-400 mt-1">
                {onlyPendingMe
                  ? 'All applications in this tier have already been assessed by you.'
                  : 'No submitted applications match the selected tier and filter criteria.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredApplications.map((app) => {
            const tierKey = app.grantType || 'IDEATION';
            const tierBadgeClass = getTierBadgeClasses(tierKey);
            const assessedCount = app._count?.assessments || 0;

            // My assessment status
            const myAssessment = app.assessments?.find((a: any) => a.memberId === currentUserId);
            const myStatus = myAssessment?.status; // 'SUBMITTED' | 'DRAFT' | undefined

            return (
              <Card key={app.id} className="hover:border-gray-300 transition-colors">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {app.startup?.teamName}
                      </h3>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${tierBadgeClass}`}>
                        {tierKey}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        v{app.version}
                      </span>
                      <Badge variant={
                        app.status === 'SUBMITTED' ? 'warning' :
                        app.status === 'IN_REVIEW' ? 'info' :
                        app.status === 'APPROVED' ? 'success' :
                        app.status === 'REJECTED' ? 'danger' : 'default'
                      }>
                        {app.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      <span>
                        Applicant: <strong className="text-gray-700">{app.startup?.user?.name}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Requested: <strong className="text-gray-900">₹{Number(app.requestedTotal).toLocaleString('en-IN')}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Submitted: {app.submittedAt ? formatDate(app.submittedAt) : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-center flex-wrap">
                    {/* Committee count badge */}
                    <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg">
                      <span className="font-medium text-gray-800">{assessedCount} of 3</span> assessed
                    </div>

                    {/* My Progress Badge */}
                    {myStatus === 'SUBMITTED' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Assessed
                      </span>
                    ) : myStatus === 'DRAFT' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="h-3.5 w-3.5" /> Draft Saved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 border border-gray-200">
                        <AlertCircle className="h-3.5 w-3.5" /> Not started
                      </span>
                    )}

                    <Link href={`/sec/applications/${app.id}`}>
                      <Button size="sm">
                        {myStatus === 'SUBMITTED' ? 'View Assessment' : 'Assess Application'}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
