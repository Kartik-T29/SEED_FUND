'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TIERS, getTierBadgeClasses } from '@/lib/tiers';
import { formatDate } from '@/lib/utils';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowUpDown,
  Filter,
  Clock,
  Sparkles,
  Users,
  Layers,
} from 'lucide-react';

interface AdminDashboardClientProps {
  initialApplications: any[];
  tierSummary: any;
  activeSecMembers: any[];
}

export default function AdminDashboardClient({
  initialApplications,
  tierSummary,
  activeSecMembers,
}: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'READY_FORM_B' | 'WAITING' | 'DECIDED' | 'REPRESENT' | 'DRAFTS'>('ALL');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  const counts = tierSummary.counts || {};
  const activeSecCount = activeSecMembers.length;

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

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const teamName = (app.startup?.teamName || '').toLowerCase();
        const founder = (app.startup?.user?.name || '').toLowerCase();
        if (!teamName.includes(query) && !founder.includes(query)) {
          return false;
        }
      }

      const submittedAssCount = app.assessments?.filter((a: any) => a.status === 'SUBMITTED' && !a.outdated).length || 0;
      const isMilestoneSubmitted = app.milestone?.status === 'SUBMITTED';
      const isReadyForFormB = submittedAssCount >= activeSecCount && activeSecCount > 0 && isMilestoneSubmitted && !app.evaluation;
      const isWaiting = submittedAssCount < activeSecCount && !app.evaluation && app.status !== 'DRAFT';
      const isDecided = !!app.evaluation || ['APPROVED', 'REJECTED'].includes(app.status);
      const isDraft = app.status === 'DRAFT';
      const isRepresent = app.status === 'REPRESENT';

      if (filterMode === 'READY_FORM_B' && !isReadyForFormB) return false;
      if (filterMode === 'WAITING' && !isWaiting) return false;
      if (filterMode === 'DECIDED' && !isDecided) return false;
      if (filterMode === 'REPRESENT' && !isRepresent) return false;
      if (filterMode === 'DRAFTS' && !isDraft) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date-desc') {
        const dA = a.submittedAt ? new Date(a.submittedAt).getTime() : new Date(a.createdAt).getTime();
        const dB = b.submittedAt ? new Date(b.submittedAt).getTime() : new Date(b.createdAt).getTime();
        return dB - dA;
      }
      if (sortBy === 'date-asc') {
        const dA = a.submittedAt ? new Date(a.submittedAt).getTime() : new Date(a.createdAt).getTime();
        const dB = b.submittedAt ? new Date(b.submittedAt).getTime() : new Date(b.createdAt).getTime();
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
  }, [initialApplications, activeTab, searchQuery, filterMode, sortBy, activeSecCount]);

  return (
    <div className="space-y-6">
      {/* Summary Strip (Per tier: apps count, total requested, total approved) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">All Grants</p>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold text-gray-900">{counts.ALL?.count || 0}</span>
            <span className="text-xs text-brand-primary font-bold">{counts.ALL?.readyForFormB || 0} ready</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1 flex justify-between">
            <span>Req: ₹{Number(counts.ALL?.totalRequested || 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold truncate">
            Apprv: ₹{Number(counts.ALL?.totalApproved || 0).toLocaleString('en-IN')}
          </div>
        </div>

        {TIERS.map((tier) => {
          const tc = counts[tier.key] || { count: 0, totalRequested: 0, totalApproved: 0, readyForFormB: 0 };
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
                <span className="text-xl font-bold text-gray-900">{tc.count}</span>
                {tc.readyForFormB > 0 && (
                  <span className="text-xs text-emerald-600 font-bold">{tc.readyForFormB} ready</span>
                )}
              </div>
              <div className="text-[11px] text-gray-400 mt-1 truncate">
                Req: ₹{Number(tc.totalRequested || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-emerald-600 font-medium truncate">
                Apprv: ₹{Number(tc.totalApproved || 0).toLocaleString('en-IN')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tier Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-2 overflow-x-auto pb-px">
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

      {/* Quick Filters, Search & Sort */}
      <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200">
        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-semibold text-gray-500 uppercase mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Filters:
          </span>
          {[
            { key: 'ALL', label: 'All Applications' },
            { key: 'READY_FORM_B', label: '★ Ready for Form B' },
            { key: 'WAITING', label: 'Waiting on SEC Members' },
            { key: 'DECIDED', label: 'Decided / Sanctioned' },
            { key: 'REPRESENT', label: 'Re-presentation' },
            { key: 'DRAFTS', label: 'Drafts' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterMode(f.key as any)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                filterMode === f.key
                  ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by startup team name or founder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              <option value="date-desc">Submitted Date (Newest)</option>
              <option value="date-asc">Submitted Date (Oldest)</option>
              <option value="amount-desc">Requested Total (High to Low)</option>
              <option value="amount-asc">Requested Total (Low to High)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications Table / Cards */}
      <div className="space-y-3">
        {filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              <Layers className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="font-medium text-gray-700">No applications match the filters</p>
              <p className="text-sm text-gray-400 mt-1">Try resetting the filter or switching tiers.</p>
            </CardContent>
          </Card>
        ) : (
          filteredApplications.map((app) => {
            const tierKey = app.grantType || 'IDEATION';
            const tierBadgeClass = getTierBadgeClasses(tierKey);

            // Active submitted assessments
            const submittedAssessments = app.assessments?.filter((a: any) => a.status === 'SUBMITTED' && !a.outdated) || [];
            const submittedMemberIds = new Set(submittedAssessments.map((a: any) => a.memberId));
            const pendingMembers = activeSecMembers.filter((m) => !submittedMemberIds.has(m.id));

            const isMilestoneSubmitted = app.milestone?.status === 'SUBMITTED';
            const isReadyForFormB =
              submittedAssessments.length >= activeSecCount &&
              activeSecCount > 0 &&
              isMilestoneSubmitted &&
              !app.evaluation;

            const isDraft = app.status === 'DRAFT';

            return (
              <Card key={app.id} className={`hover:border-gray-300 transition-colors ${isDraft ? 'bg-gray-50/70 border-dashed' : ''}`}>
                <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {app.startup?.teamName}
                      </h3>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${tierBadgeClass}`}>
                        {tierKey}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                        v{app.version}
                      </span>
                      <Badge variant={
                        app.status === 'SUBMITTED' ? 'warning' :
                        app.status === 'IN_REVIEW' ? 'info' :
                        app.status === 'APPROVED' ? 'success' :
                        app.status === 'REJECTED' ? 'danger' :
                        app.status === 'DRAFT' ? 'outline' : 'default'
                      }>
                        {isDraft ? 'DRAFT (Read-Only)' : app.status.replace('_', ' ')}
                      </Badge>

                      {/* Ready for Form B Badge */}
                      {isReadyForFormB && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                          <Sparkles className="h-3 w-3" /> Ready for Form B
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      <span>
                        Applicant: <strong className="text-gray-800">{app.startup?.user?.name}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Requested: <strong className="text-gray-900 font-mono">₹{Number(app.requestedTotal).toLocaleString('en-IN')}</strong>
                      </span>
                      {app.evaluation && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-semibold">
                            Approved: ₹{Number(app.evaluation.approvedTotal).toLocaleString('en-IN')} ({app.evaluation.decision})
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span>
                        {isDraft ? `Created: ${formatDate(app.createdAt)}` : `Submitted: ${app.submittedAt ? formatDate(app.submittedAt) : 'N/A'}`}
                      </span>
                    </div>

                    {/* Pending Members Warning */}
                    {!isDraft && !app.evaluation && pendingMembers.length > 0 && (
                      <div className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded inline-flex items-center gap-1.5 border border-amber-200 mt-1">
                        <Clock className="h-3 w-3" />
                        <span>Waiting on: <strong>{pendingMembers.map((m) => m.name).join(', ')}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Right side stats & action */}
                  <div className="flex items-center gap-4 flex-wrap self-end lg:self-center">
                    {/* Progress indicators */}
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Assessed:</span>
                        <span className="font-bold text-gray-800">{submittedAssessments.length}/{activeSecCount}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Milestone:</span>
                        <span className={isMilestoneSubmitted ? 'font-bold text-emerald-600' : 'text-gray-400'}>
                          {isMilestoneSubmitted ? 'Submitted' : 'Pending'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link href={`/admin/applications/${app.id}`}>
                        <Button size="sm" variant="outline" className="text-xs px-2.5 py-1">
                          View report
                        </Button>
                      </Link>

                      <Link href={`/admin/applications/${app.id}#form-b`}>
                        <Button
                          size="sm"
                          variant={isReadyForFormB ? 'primary' : 'outline'}
                          className="text-xs px-2.5 py-1"
                        >
                          Fill Form B
                        </Button>
                      </Link>

                      <a
                        href={`/api/applications/${app.id}/zip`}
                        className="inline-flex items-center justify-center font-medium rounded-lg transition-colors border border-gray-300 text-gray-700 hover:bg-gray-50 px-2.5 py-1 text-xs"
                        title="Download ZIP bundle"
                      >
                        Download all
                      </a>
                    </div>
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
