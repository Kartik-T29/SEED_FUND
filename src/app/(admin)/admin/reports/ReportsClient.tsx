'use client';

import { useState } from 'react';
import {
  FileBarChart,
  Download,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Layers,
  IndianRupee,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  ExternalLink,
} from 'lucide-react';
import { TIERS, getTierBadgeClasses, formatCurrency } from '@/lib/tiers';

interface GrantItem {
  id: string;
  startupId: string;
  startupTeamName: string;
  grantType: string;
  amount: number;
  closedAt: string | null;
  waived: boolean;
}

interface ApplicationItem {
  id: string;
  teamName: string;
  applicantName: string;
  grantType: string | null;
  status: string;
  requestedTotal: number;
  submittedAt: string | null;
  evaluation: {
    decision: string;
    approvedTotal: number;
    decidedAt: string;
    forced: boolean;
  } | null;
}

interface AuditLogItem {
  id: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  reason: string | null;
  details: any;
  at: string;
}

interface UserMap {
  [id: string]: {
    name: string;
    email: string;
    role: string;
  };
}

interface ReportsClientProps {
  totalGrantsAwarded: number;
  totalApprovedAmount: number;
  perTierBreakdown: Record<string, { count: number; totalAmount: number }>;
  grants: GrantItem[];
  applications: ApplicationItem[];
  auditLogs: AuditLogItem[];
  userMap: UserMap;
}

export default function ReportsClient({
  totalGrantsAwarded,
  totalApprovedAmount,
  perTierBreakdown,
  grants,
  applications,
  auditLogs,
  userMap,
}: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState<'policy' | 'allocations' | 'audit'>('policy');

  // Audit Log Filters
  const [auditSearchAction, setAuditSearchAction] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState('ALL');
  const [auditActorFilter, setAuditActorFilter] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    if (auditEntityFilter !== 'ALL' && log.entity !== auditEntityFilter) return false;
    if (auditActorFilter !== 'ALL' && log.actorId !== auditActorFilter) return false;
    if (auditSearchAction.trim()) {
      const q = auditSearchAction.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchReason = log.reason?.toLowerCase().includes(q) || false;
      const matchEntity = log.entity.toLowerCase().includes(q);
      return matchAction || matchReason || matchEntity;
    }
    return true;
  });

  // Unique entities for filter
  const uniqueEntities = Array.from(new Set(auditLogs.map((l) => l.entity))).sort();
  // Unique actors for filter
  const uniqueActorIds = Array.from(new Set(auditLogs.map((l) => l.actorId)));

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Grant ID',
      'Startup Team Name',
      'Grant Tier',
      'Sanctioned Amount (INR)',
      'Waived Limit?',
      'Status',
    ];

    const rows = grants.map((g) => [
      g.id,
      `"${g.startupTeamName.replace(/"/g, '""')}"`,
      g.grantType,
      g.amount,
      g.waived ? 'YES' : 'NO',
      g.closedAt ? 'Closed' : 'Active',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ideapad-grant-allocations-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('policy')}
          className={`py-3 px-5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'policy'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <IndianRupee className="h-4 w-4" />
          Policy & Half-Yearly Summary
        </button>

        <button
          onClick={() => setActiveTab('allocations')}
          className={`py-3 px-5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'allocations'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Layers className="h-4 w-4" />
          Grant Allocations ({grants.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3 px-5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-brand-primary text-brand-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: POLICY & SUMMARY */}
      {activeTab === 'policy' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Grants Sanctioned</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{totalGrantsAwarded}</p>
              <p className="text-xs text-gray-500 mt-1">Through Form B official approvals</p>
            </div>

            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Capital Allocated</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{formatCurrency(totalApprovedAmount)}</p>
              <p className="text-xs text-gray-500 mt-1">Disbursed or committed seed capital</p>
            </div>

            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Average Grant Size</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {totalGrantsAwarded > 0
                  ? formatCurrency(Math.round(totalApprovedAmount / totalGrantsAwarded))
                  : '₹0'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Across all active tiers</p>
            </div>
          </div>

          {/* Tier Policy Distribution Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Policy Tier Sanctions & Allocation Breakdown
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Categorized in accordance with IDEAPAD Seed Fund Scheme rules
                </p>
              </div>
            </div>

            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-3 text-left">Grant Tier</th>
                  <th className="px-6 py-3 text-left">Policy Range</th>
                  <th className="px-6 py-3 text-center">Grants Sanctioned</th>
                  <th className="px-6 py-3 text-right">Total Capital Allocated</th>
                  <th className="px-6 py-3 text-right">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                {TIERS.map((tier) => {
                  const stat = perTierBreakdown[tier.key] || { count: 0, totalAmount: 0 };
                  const percent =
                    totalApprovedAmount > 0
                      ? ((stat.totalAmount / totalApprovedAmount) * 100).toFixed(1)
                      : '0.0';

                  return (
                    <tr key={tier.key} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getTierBadgeClasses(tier.key)}`}>
                          {tier.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-600">
                        {tier.range
                          ? `${formatCurrency(tier.range[0])} – ${formatCurrency(tier.range[1])}`
                          : 'Variable (case-by-case)'}
                      </td>

                      <td className="px-6 py-4 text-center font-semibold text-gray-900">
                        {stat.count}
                      </td>

                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {formatCurrency(stat.totalAmount)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-gray-500 font-mono">{percent}%</span>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-brand-primary h-1.5 rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: GRANT ALLOCATIONS */}
      {activeTab === 'allocations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Sanctioned Grant History</h3>
              <p className="text-xs text-gray-500">
                List of all sanctioned grants registered in the GrantHistory ledger.
              </p>
            </div>

            <button
              onClick={handleExportCSV}
              disabled={grants.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm disabled:opacity-50 transition-colors"
            >
              <Download className="h-4 w-4" /> Export Allocations (CSV)
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-gray-500 font-medium">
                  <tr>
                    <th className="px-6 py-3 text-left">Grant ID</th>
                    <th className="px-6 py-3 text-left">Startup Team</th>
                    <th className="px-6 py-3 text-left">Tier</th>
                    <th className="px-6 py-3 text-right">Approved Amount</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-right">Waived Limit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-700">
                  {grants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No grants have been sanctioned yet.
                      </td>
                    </tr>
                  ) : (
                    grants.map((g) => (
                      <tr key={g.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono text-xs text-gray-500">{g.id.slice(0, 10)}...</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{g.startupTeamName}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${getTierBadgeClasses(g.grantType)}`}>
                            {g.grantType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                          {formatCurrency(g.amount)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {g.closedAt ? (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" /> Closed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {g.waived ? (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                              Waived by Admin
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Standard</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Audit Filters */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search action or reason..."
                  value={auditSearchAction}
                  onChange={(e) => setAuditSearchAction(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={auditEntityFilter}
                  onChange={(e) => setAuditEntityFilter(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
                >
                  <option value="ALL">All Entities</option>
                  {uniqueEntities.map((ent) => (
                    <option key={ent} value={ent}>
                      {ent}
                    </option>
                  ))}
                </select>

                <select
                  value={auditActorFilter}
                  onChange={(e) => setAuditActorFilter(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
                >
                  <option value="ALL">All Actors</option>
                  {uniqueActorIds.map((actId) => {
                    const u = userMap[actId];
                    return (
                      <option key={actId} value={actId}>
                        {u ? `${u.name} (${u.role})` : actId.slice(0, 8)}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-gray-500 font-medium">
                  <tr>
                    <th className="w-8 px-3 py-3"></th>
                    <th className="px-4 py-3 text-left">Timestamp</th>
                    <th className="px-4 py-3 text-left">Actor</th>
                    <th className="px-4 py-3 text-left">Action</th>
                    <th className="px-4 py-3 text-left">Entity</th>
                    <th className="px-4 py-3 text-left">Admin Rationale / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-700">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No audit log entries found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => {
                      const actor = userMap[log.actorId];
                      const isExpanded = expandedLogId === log.id;

                      return (
                        <>
                          <tr
                            key={log.id}
                            className={`hover:bg-gray-50 cursor-pointer ${
                              isExpanded ? 'bg-blue-50/50' : ''
                            }`}
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          >
                            <td className="px-3 py-4 text-center text-gray-400">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </td>

                            <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500">
                              {new Date(log.at).toLocaleString()}
                            </td>

                            <td className="px-4 py-4 whitespace-nowrap">
                              {actor ? (
                                <div>
                                  <div className="font-medium text-gray-900">{actor.name}</div>
                                  <div className="text-[11px] text-gray-500">{actor.email}</div>
                                </div>
                              ) : (
                                <span className="font-mono text-xs text-gray-400">{log.actorId.slice(0, 8)}...</span>
                              )}
                            </td>

                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                                {log.action}
                              </span>
                            </td>

                            <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                              <span className="font-semibold text-gray-800">{log.entity}</span>
                              <span className="text-gray-400 block font-mono text-[10px]">
                                {log.entityId.slice(0, 12)}...
                              </span>
                            </td>

                            <td className="px-4 py-4 text-xs">
                              {log.reason ? (
                                <div className="bg-amber-50/70 border-l-2 border-amber-400 pl-2 py-0.5 text-gray-800 italic">
                                  "{log.reason}"
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">No reason provided</span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Details Row */}
                          {isExpanded && (
                            <tr key={`${log.id}-details`} className="bg-gray-50">
                              <td colSpan={6} className="px-6 py-4">
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Audit Entry Metadata & Changes
                                  </p>
                                  <pre className="text-xs font-mono bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto max-h-60">
                                    {JSON.stringify(log.details, null, 2) || '{}'}
                                  </pre>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
