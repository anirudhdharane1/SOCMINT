'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  User,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Database,
} from 'lucide-react';

interface AuditLogItem {
  log_id: string;
  action_type: string;
  target_table: string;
  action_timestamp: string;
  change_details: {
    account_id?: string;
    handle?: string;
    old_status?: string;
    new_status?: string;
    old_score?: number | string;
    new_score?: number | string;
    [key: string]: any;
  } | null;
  acting_username: string | null;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export function AuditClient() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit?page=${page}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-500 mb-1">
            // COMPLIANCE & TRIGGER-GENERATED TELEMETRY
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-neutral-100 uppercase">
            Database Audit Trail
          </h1>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            Generated automatically by PostgreSQL trigger <code className="text-[#22ff88]">trg_audit_account_status</code> on <code className="text-neutral-300">Monitored_Accounts</code>.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(pagination.page)}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-1.5 bg-[#121212] border border-neutral-800 hover:border-neutral-700 text-neutral-300 font-mono text-xs rounded-sm transition-colors duration-150"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>REFRESH LOGS</span>
        </button>
      </div>

      {/* Audit Log Table Card */}
      <div className="bg-[#111111] border border-neutral-800 rounded-sm overflow-hidden">
        {/* Subheader */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#22ff88]" />
            <span className="font-mono text-xs font-semibold text-neutral-200 uppercase tracking-widest">
              // AUDIT_LOGS TABLE
            </span>
          </div>
          <span className="text-[11px] font-mono text-neutral-500">
            Total Recorded Events: {pagination.total}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-[#0e0e0e] text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                <th className="py-2.5 px-4 font-medium">Timestamp</th>
                <th className="py-2.5 px-4 font-medium">Acting User</th>
                <th className="py-2.5 px-4 font-medium">Action Type</th>
                <th className="py-2.5 px-4 font-medium">Target Table</th>
                <th className="py-2.5 px-4 font-medium">Parsed Change Details (JSONB)</th>
                <th className="py-2.5 px-4 font-medium text-right">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-xs font-mono">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4">
                      <div className="h-3 bg-neutral-800 rounded w-28" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3 bg-neutral-800 rounded w-20" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-neutral-800 rounded w-24" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3 bg-neutral-800 rounded w-28" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3 bg-neutral-850 rounded w-72 mb-1" />
                      <div className="h-2.5 bg-neutral-850/60 rounded w-48" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="h-4 bg-neutral-800 rounded w-12 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500 font-mono text-xs">
                    // NO AUDIT LOGS RECORDED YET
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const details = log.change_details;
                  const hasStatusChange =
                    details?.old_status &&
                    details?.new_status &&
                    details.old_status !== details.new_status;
                  const hasScoreChange =
                    details?.old_score !== undefined &&
                    details?.new_score !== undefined &&
                    details.old_score !== details.new_score;

                  return (
                    <tr
                      key={log.log_id}
                      className="hover:bg-[#161616] hover:border-l-2 hover:border-l-[#22ff88] transition-colors duration-150"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 text-neutral-400 whitespace-nowrap text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-neutral-600" />
                          <span>{new Date(log.action_timestamp).toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Acting User */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-neutral-500" />
                          <span
                            className={
                              log.acting_username
                                ? 'text-[#22ff88] font-semibold'
                                : 'text-neutral-600 italic'
                            }
                          >
                            {log.acting_username || 'SYSTEM / ANONYMOUS'}
                          </span>
                        </div>
                      </td>

                      {/* Action Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] tracking-wider uppercase border font-semibold ${
                            log.action_type === 'STATUS_UPDATE'
                              ? 'bg-amber-400/10 text-amber-400 border-amber-400/30'
                              : log.action_type === 'RISK_UPDATE'
                              ? 'bg-sky-400/10 text-sky-400 border-sky-400/30'
                              : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                          }`}
                        >
                          {log.action_type}
                        </span>
                      </td>

                      {/* Target Table */}
                      <td className="py-3 px-4 text-neutral-400 text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1 text-neutral-400">
                          <Database className="w-3 h-3 text-neutral-600" />
                          <span>{log.target_table}</span>
                        </div>
                      </td>

                      {/* Parsed Change Details */}
                      <td className="py-3 px-4">
                        {details ? (
                          <div className="space-y-1">
                            {details.handle && (
                              <div className="text-neutral-200 font-semibold text-[11px]">
                                Target: {details.handle}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                              {hasStatusChange && (
                                <div className="flex items-center gap-1">
                                  <span className="text-neutral-500">Status:</span>
                                  <span className="text-neutral-400 line-through">
                                    {details.old_status}
                                  </span>
                                  <ArrowRight className="w-2.5 h-2.5 text-neutral-600" />
                                  <span className="text-amber-400 font-bold">
                                    {details.new_status}
                                  </span>
                                </div>
                              )}

                              {hasScoreChange && (
                                <div className="flex items-center gap-1">
                                  <span className="text-neutral-500">Score:</span>
                                  <span className="text-neutral-400 line-through">
                                    {Number(details.old_score).toFixed(1)}
                                  </span>
                                  <ArrowRight className="w-2.5 h-2.5 text-neutral-600" />
                                  <span className="text-[#22ff88] font-bold">
                                    {Number(details.new_score).toFixed(1)}
                                  </span>
                                </div>
                              )}

                              {!hasStatusChange && !hasScoreChange && (
                                <div className="text-[10px] text-neutral-500 truncate max-w-sm">
                                  {JSON.stringify(details)}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-600 italic">No details</span>
                        )}
                      </td>

                      {/* Action Link to account if applicable */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {details?.account_id && (
                          <Link
                            href={`/accounts/${details.account_id}`}
                            className="font-mono text-[10px] px-2 py-0.5 bg-neutral-900 border border-neutral-750 hover:border-[#22ff88] text-neutral-300 hover:text-[#22ff88] rounded transition-colors"
                          >
                            VIEW
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between text-xs font-mono">
          <div className="text-neutral-500">
            Page {pagination.page} of {Math.max(1, pagination.pages)}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 border border-neutral-800 rounded-sm text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>PREV</span>
            </button>
            <button
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages || loading}
              className="flex items-center gap-1 px-3 py-1.5 border border-neutral-800 rounded-sm text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>NEXT</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

