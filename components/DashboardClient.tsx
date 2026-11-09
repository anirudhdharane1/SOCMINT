'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { StatusBadge } from './StatusBadge';
import { RiskBar } from './RiskBar';
import {
  ShieldAlert,
  Search,
  Filter,
  Users,
  Building,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Flame,
} from 'lucide-react';

interface ThreatItem {
  account_id: string;
  platform_handle: string;
  display_name: string | null;
  threat_status: string;
  risk_score: number | string;
  targeted_executive: string | null;
  company_name: string | null;
  platform_name: string;
}

interface StatsData {
  byStatus: Record<string, number>;
  totalAccounts: number;
  execWithImpostors: Array<{
    executive: string;
    official_title: string;
    company_name: string;
    impostor_count: string | number;
  }>;
  companyThreats: Array<{
    company_name: string;
    threat_count: string | number;
  }>;
  aboveAvgRisk: Array<{
    account_id: string;
    platform_handle: string;
    threat_status: string;
    risk_score: number | string;
    targeted_executive: string | null;
    company_name: string | null;
  }>;
}

export function DashboardClient() {
  const [threats, setThreats] = useState<ThreatItem[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loadingThreats, setLoadingThreats] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const fetchThreats = useCallback(async () => {
    setLoadingThreats(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (platformFilter) params.append('platform', platformFilter);
      if (companyFilter) params.append('company', companyFilter);
      if (searchFilter) params.append('search', searchFilter);

      const res = await fetch(`/api/threats?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setThreats(data.threats || []);
      }
    } catch (err) {
      console.error('Failed to load threats:', err);
    } finally {
      setLoadingThreats(false);
    }
  }, [statusFilter, platformFilter, companyFilter, searchFilter]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchThreats();
  }, [fetchThreats]);

  const confirmedCount = stats?.byStatus?.['Confirmed_Phishing'] ?? 0;
  const suspectCount = stats?.byStatus?.['Suspect'] ?? 0;
  const benignCount = stats?.byStatus?.['Benign'] ?? 0;
  const totalMonitored = stats?.totalAccounts ?? 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-500 mb-1">
            // THREAT OVERVIEW & REALTIME TELEMETRY
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-neutral-100 uppercase">
            Active Impersonation Matrix
          </h1>
        </div>
        <button
          onClick={() => {
            fetchStats();
            fetchThreats();
          }}
          className="self-start md:self-auto flex items-center gap-2 px-3 py-1.5 bg-[#121212] border border-neutral-800 hover:border-neutral-700 text-neutral-300 font-mono text-xs rounded-sm transition-colors duration-150"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>REFRESH FEEDS</span>
        </button>
      </div>

      {/* Metric Cards (with green corner bracket accent) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Confirmed Phishing */}
        <div className="relative bg-[#111111] border border-neutral-800 p-5 rounded-sm overflow-hidden">
          {/* Top-left corner bracket accent */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#22ff88]" />
          <div className="flex items-center justify-between text-neutral-500 mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest">
              CONFIRMED PHISHING
            </span>
            <Flame className="w-4 h-4 text-red-500" />
          </div>
          <div className="font-mono text-3xl font-bold text-red-400">
            {loadingStats ? '--' : confirmedCount}
          </div>
          <div className="mt-2 text-[10px] font-mono text-neutral-500">
            High confidence impersonators
          </div>
        </div>

        {/* Card 2: Suspect Accounts */}
        <div className="relative bg-[#111111] border border-neutral-800 p-5 rounded-sm overflow-hidden">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#22ff88]" />
          <div className="flex items-center justify-between text-neutral-500 mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest">
              SUSPECT ANOMALIES
            </span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-amber-400">
            {loadingStats ? '--' : suspectCount}
          </div>
          <div className="mt-2 text-[10px] font-mono text-neutral-500">
            Elevated risk score (40-79)
          </div>
        </div>

        {/* Card 3: Benign / Verified */}
        <div className="relative bg-[#111111] border border-neutral-800 p-5 rounded-sm overflow-hidden">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#22ff88]" />
          <div className="flex items-center justify-between text-neutral-500 mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest">
              BENIGN / VERIFIED
            </span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-sky-400">
            {loadingStats ? '--' : benignCount}
          </div>
          <div className="mt-2 text-[10px] font-mono text-neutral-500">
            Harmless or verified profiles
          </div>
        </div>

        {/* Card 4: Total Monitored */}
        <div className="relative bg-[#111111] border border-neutral-800 p-5 rounded-sm overflow-hidden">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#22ff88]" />
          <div className="flex items-center justify-between text-neutral-500 mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest">
              TOTAL PROFILES
            </span>
            <TrendingUp className="w-4 h-4 text-[#22ff88]" />
          </div>
          <div className="font-mono text-3xl font-bold text-[#22ff88]">
            {loadingStats ? '--' : totalMonitored}
          </div>
          <div className="mt-2 text-[10px] font-mono text-neutral-500">
            Across registered corporate rosters
          </div>
        </div>
      </div>

      {/* Threats Table Section */}
      <div className="bg-[#111111] border border-neutral-800 rounded-sm overflow-hidden">
        {/* Section Header & Filters */}
        <div className="p-4 border-b border-neutral-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-neutral-200 uppercase tracking-widest">
                // ACTIVE PHISHING THREATS VIEW
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                v_active_phishing_threats
              </span>
            </div>
            <div className="text-[11px] font-mono text-neutral-500">
              Showing {threats.length} targets
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search handle, name..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-sm pl-8 pr-3 py-1.5 text-xs text-neutral-200 font-mono placeholder-neutral-600 focus:outline-none focus:border-[#22ff88]"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-sm px-3 py-1.5 text-xs text-neutral-300 font-mono focus:outline-none focus:border-[#22ff88]"
              >
                <option value="">All Threat Statuses</option>
                <option value="Confirmed_Phishing">Confirmed Phishing</option>
                <option value="Suspect">Suspect</option>
                <option value="Pending">Pending</option>
                <option value="Benign">Benign</option>
                <option value="Official">Official</option>
              </select>
            </div>

            {/* Platform Filter */}
            <div className="relative">
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-sm px-3 py-1.5 text-xs text-neutral-300 font-mono focus:outline-none focus:border-[#22ff88]"
              >
                <option value="">All Social Platforms</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Twitter">Twitter / X</option>
                <option value="Facebook">Facebook</option>
                <option value="Instagram">Instagram</option>
              </select>
            </div>

            {/* Company Filter */}
            <div>
              <input
                type="text"
                placeholder="Filter by company..."
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-sm px-3 py-1.5 text-xs text-neutral-200 font-mono placeholder-neutral-600 focus:outline-none focus:border-[#22ff88]"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-[#0e0e0e] text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                <th className="py-2.5 px-4 font-medium">Handle / Impersonator</th>
                <th className="py-2.5 px-4 font-medium">Targeted Executive</th>
                <th className="py-2.5 px-4 font-medium">Company</th>
                <th className="py-2.5 px-4 font-medium">Platform</th>
                <th className="py-2.5 px-4 font-medium">Threat Status</th>
                <th className="py-2.5 px-4 font-medium">Risk Score</th>
                <th className="py-2.5 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-xs">
              {loadingThreats ? (
                // Skeletons
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4">
                      <div className="h-3.5 bg-neutral-800 rounded w-28 mb-1" />
                      <div className="h-2.5 bg-neutral-800/60 rounded w-20" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3 bg-neutral-800 rounded w-24" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3 bg-neutral-800 rounded w-28" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-3 bg-neutral-800 rounded w-16" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-neutral-800 rounded-full w-20" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-2 bg-neutral-800 rounded w-16" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="h-5 bg-neutral-800 rounded w-12 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : threats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500 font-mono text-xs">
                    // NO RESULTS FOUND MATCHING FILTER CRITERIA
                  </td>
                </tr>
              ) : (
                threats.map((t) => (
                  <tr
                    key={t.account_id}
                    className="hover:bg-[#161616] hover:border-l-2 hover:border-l-[#22ff88] transition-colors duration-150 group"
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono text-neutral-100 font-medium group-hover:text-[#22ff88] transition-colors">
                        {t.platform_handle}
                      </div>
                      {t.display_name && (
                        <div className="text-[11px] text-neutral-500 truncate max-w-[200px]">
                          {t.display_name}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-300">
                      {t.targeted_executive || '—'}
                    </td>
                    <td className="py-3 px-4 text-neutral-400">
                      {t.company_name || '—'}
                    </td>
                    <td className="py-3 px-4 text-neutral-400 font-mono text-[11px]">
                      {t.platform_name}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={t.threat_status} />
                    </td>
                    <td className="py-3 px-4">
                      <RiskBar score={t.risk_score} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/accounts/${t.account_id}`}
                        className="inline-flex items-center gap-1 font-mono text-[11px] px-2.5 py-1 bg-neutral-900 border border-neutral-700 hover:border-[#22ff88] text-neutral-300 hover:text-[#22ff88] rounded-sm transition-colors duration-150"
                      >
                        <span>INSPECT</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* The Three Analytic Widgets from /api/stats */}
      <div className="space-y-3">
        <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-500">
          // ADVANCED DBMS QUERY ANALYTICS
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Widget 1: Executives with 2+ Impostors (GROUP BY + HAVING) */}
          <div className="bg-[#111111] border border-neutral-800 rounded-sm p-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span className="font-mono text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                  Targeted Execs (≥ 2 Impostors)
                </span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                HAVING COUNT ≥ 2
              </span>
            </div>

            <div className="flex-1 space-y-2.5">
              {loadingStats ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-neutral-800/40 animate-pulse rounded" />
                ))
              ) : stats?.execWithImpostors?.length === 0 ? (
                <p className="font-mono text-xs text-neutral-500 py-4 text-center">
                  NO RESULTS
                </p>
              ) : (
                stats?.execWithImpostors?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-[#0d0d0d] border border-neutral-850 rounded-sm flex items-center justify-between hover:border-neutral-700 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-medium text-xs text-neutral-200 truncate">
                        {item.executive}
                      </div>
                      <div className="text-[10px] text-neutral-500 truncate">
                        {item.official_title} • {item.company_name}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] font-mono text-neutral-500 uppercase">
                        Clones:
                      </span>
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.5 rounded">
                        {item.impostor_count}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Widget 2: Company Threat Surface (LEFT JOIN including 0) */}
          <div className="bg-[#111111] border border-neutral-800 rounded-sm p-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-3">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-sky-400" />
                <span className="font-mono text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                  Company Threat Surface
                </span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                LEFT JOIN
              </span>
            </div>

            <div className="flex-1 space-y-2">
              {loadingStats ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 bg-neutral-800/40 animate-pulse rounded" />
                ))
              ) : stats?.companyThreats?.length === 0 ? (
                <p className="font-mono text-xs text-neutral-500 py-4 text-center">
                  NO RESULTS
                </p>
              ) : (
                stats?.companyThreats?.slice(0, 6).map((comp, idx) => {
                  const count = Number(comp.threat_count) || 0;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-[#0d0d0d] border border-neutral-850 rounded-sm text-xs"
                    >
                      <span className="text-neutral-300 truncate max-w-[180px]">
                        {comp.company_name}
                      </span>
                      <span
                        className={`font-mono text-xs px-2 py-0.5 rounded font-semibold ${
                          count > 0
                            ? 'text-red-400 bg-red-500/10 border border-red-500/30'
                            : 'text-neutral-500 bg-neutral-800 border border-neutral-700'
                        }`}
                      >
                        {count} threats
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Widget 3: Above-Average Risk Accounts (Subquery) */}
          <div className="bg-[#111111] border border-neutral-800 rounded-sm p-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-400" />
                <span className="font-mono text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                  Above-Average Risk Accounts
                </span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                &gt; AVG(risk_score)
              </span>
            </div>

            <div className="flex-1 space-y-2.5">
              {loadingStats ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-neutral-800/40 animate-pulse rounded" />
                ))
              ) : stats?.aboveAvgRisk?.length === 0 ? (
                <p className="font-mono text-xs text-neutral-500 py-4 text-center">
                  NO RESULTS
                </p>
              ) : (
                stats?.aboveAvgRisk?.slice(0, 5).map((acc) => (
                  <div
                    key={acc.account_id}
                    className="p-2.5 bg-[#0d0d0d] border border-neutral-850 rounded-sm flex items-center justify-between hover:border-neutral-700 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <Link
                        href={`/accounts/${acc.account_id}`}
                        className="font-mono text-xs text-[#22ff88] hover:underline font-semibold truncate block"
                      >
                        {acc.platform_handle}
                      </Link>
                      <div className="text-[10px] text-neutral-500 truncate">
                        vs. {acc.targeted_executive} ({acc.company_name})
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <RiskBar score={acc.risk_score} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

