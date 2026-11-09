'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StatusBadge } from './StatusBadge';
import { RiskBar } from './RiskBar';
import { NetworkGraph } from './NetworkGraph';
import {
  ArrowLeft,
  Building,
  UserCheck,
  Globe,
  Trash2,
  Network,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  Share2,
} from 'lucide-react';

interface AccountDetail {
  account_id: string;
  platform_handle: string;
  display_name: string | null;
  threat_status: string;
  risk_score: number | string;
  neo4j_node_ref: string | null;
  executive_id: string | null;
  first_name: string | null;
  last_name: string | null;
  official_title: string | null;
  employment_status: string | null;
  company_id: string | null;
  company_name: string | null;
  primary_domain: string | null;
  platform_name: string;
}

interface PostItem {
  post_id: string;
  raw_content: string;
  posted_at: string;
}

interface AccountDetailClientProps {
  accountId: string;
  userRole: string;
}

export function AccountDetailClient({ accountId, userRole }: AccountDetailClientProps) {
  const router = useRouter();
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({
    nodes: [],
    links: [],
  });

  const [loading, setLoading] = useState(true);
  const [loadingGraph, setLoadingGraph] = useState(true);
  const [newScore, setNewScore] = useState<string>('');
  const [updatingRisk, setUpdatingRisk] = useState(false);
  const [riskMessage, setRiskMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Confirm Ring modal state
  const [showRingDialog, setShowRingDialog] = useState(false);
  const [confirmingRing, setConfirmingRing] = useState(false);
  const [ringResult, setRingResult] = useState<string | null>(null);

  // Delete modal state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load account data and network graph
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/accounts/${accountId}`);
        if (!res.ok) throw new Error('Failed to load account');
        const data = await res.json();
        setAccount(data.account);
        setPosts(data.posts || []);
        setNewScore(String(data.account.risk_score || 0));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    async function loadNetwork() {
      setLoadingGraph(true);
      try {
        const res = await fetch(`/api/accounts/${accountId}/network`);
        if (res.ok) {
          const data = await res.json();
          setGraphData(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingGraph(false);
      }
    }

    loadData();
    loadNetwork();
  }, [accountId]);

  async function handleRiskUpdate(e: React.FormEvent) {
    e.preventDefault();
    setRiskMessage(null);
    setUpdatingRisk(true);

    try {
      const res = await fetch(`/api/accounts/${accountId}/risk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: parseFloat(newScore) }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update risk');
      }

      setAccount((prev) =>
        prev
          ? {
              ...prev,
              risk_score: data.account.risk_score,
              threat_status: data.account.threat_status,
            }
          : null
      );
      setRiskMessage({
        text: `Score updated to ${data.account.risk_score}. Status dynamically updated to "${data.account.threat_status}".`,
      });
    } catch (err: unknown) {
      setRiskMessage({
        text: err instanceof Error ? err.message : String(err),
        isError: true,
      });
    } finally {
      setUpdatingRisk(false);
    }
  }

  async function handleConfirmRing() {
    setConfirmingRing(true);
    setRingResult(null);

    try {
      const res = await fetch(`/api/accounts/${accountId}/confirm-ring`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to confirm ring');
      }

      setRingResult(
        `Successfully confirmed ${data.confirmed} ring account(s) as Confirmed_Phishing.`
      );
      setShowRingDialog(false);

      // Refresh account details
      const refreshRes = await fetch(`/api/accounts/${accountId}`);
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setAccount(refreshData.account);
      }
    } catch (err: unknown) {
      alert(`Ring Confirmation Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setConfirmingRing(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete account');
      }
      router.push('/dashboard');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 bg-neutral-800 rounded w-48" />
        <div className="h-32 bg-[#111111] border border-neutral-800 rounded" />
        <div className="h-64 bg-[#111111] border border-neutral-800 rounded" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="p-12 text-center bg-[#111111] border border-neutral-800 rounded-sm font-mono text-xs text-neutral-500">
        // ACCOUNT NOT FOUND IN REPOSITORY
      </div>
    );
  }

  const isImpostor = Boolean(account.neo4j_node_ref);

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 font-mono text-xs text-neutral-400 hover:text-[#22ff88] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>RETURN TO MATRIX</span>
          </Link>
          <span className="text-neutral-600 font-mono">/</span>
          <span className="font-mono text-xs text-neutral-500 truncate max-w-[200px]">
            {account.platform_handle}
          </span>
        </div>

        {/* Action Buttons: Confirm Ring & Delete */}
        <div className="flex items-center gap-3">
          {/* Confirm Ring button (Analyst & Admin) */}
          <button
            type="button"
            onClick={() => setShowRingDialog(true)}
            disabled={!isImpostor}
            title={
              !isImpostor
                ? 'Only accounts with Neo4j infrastructure nodes belong to scam rings'
                : 'Confirm entire shared IP/Domain ring'
            }
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-sm font-mono text-xs transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>CONFIRM ENTIRE RING</span>
          </button>

          {/* Delete Account button (Admin only) */}
          {userRole === 'Admin' && (
            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/40 rounded-sm font-mono text-xs transition-colors duration-150"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>DELETE PROFILE</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Ring Feedback banner */}
      {ringResult && (
        <div className="p-3 bg-emerald-950/20 border border-emerald-850 rounded-sm flex items-center gap-2 font-mono text-xs text-[#22ff88]">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{ringResult}</span>
        </div>
      )}

      {/* Entity Card: Impersonator & Target Executive */}
      <div className="bg-[#111111] border border-neutral-800 rounded-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-neutral-800">
          {/* Impersonator Column */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest">
                // MONITORED HANDLE
              </span>
              <StatusBadge status={account.threat_status} />
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-850 text-neutral-400 border border-neutral-700">
                {account.platform_name}
              </span>
            </div>
            <h1 className="text-2xl font-bold font-mono text-neutral-100">
              {account.platform_handle}
            </h1>
            {account.display_name && (
              <p className="text-xs text-neutral-400 font-mono">
                Display: &ldquo;{account.display_name}&rdquo;
              </p>
            )}
            <div className="text-[11px] font-mono text-neutral-500 pt-1">
              UUID: <span className="text-neutral-400">{account.account_id}</span>
              {account.neo4j_node_ref && (
                <span className="ml-3 text-sky-400">
                  Neo4j Node: {account.neo4j_node_ref}
                </span>
              )}
            </div>
          </div>

          {/* Current Risk Display */}
          <div className="bg-[#0a0a0a] border border-neutral-800 p-4 rounded-sm flex flex-col items-end min-w-[200px]">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-1">
              AGGREGATE RISK SCORE
            </span>
            <div className="flex items-center gap-2 mb-2">
              <RiskBar score={account.risk_score} />
            </div>
            <span className="text-[10px] font-mono text-neutral-600">
              Stored Procedure: update_account_risk
            </span>
          </div>
        </div>

        {/* Corporate Roster Context */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5">
          {/* Target Executive Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-neutral-400 font-mono text-xs uppercase tracking-wider">
              <UserCheck className="w-3.5 h-3.5 text-[#22ff88]" />
              <span>Targeted Corporate Executive</span>
            </div>
            {account.first_name ? (
              <div className="p-3 bg-[#0c0c0c] border border-neutral-850 rounded-sm space-y-1">
                <div className="text-sm font-semibold text-neutral-200">
                  {account.first_name} {account.last_name}
                </div>
                <div className="text-xs text-neutral-400 font-mono">
                  {account.official_title}
                </div>
                <div className="text-[10px] font-mono text-neutral-500 flex items-center gap-2 pt-1">
                  <span>Status: {account.employment_status}</span>
                  <span>•</span>
                  <span>ID: {account.executive_id?.slice(0, 8)}...</span>
                </div>
              </div>
            ) : (
              <p className="font-mono text-xs text-neutral-500 p-3 bg-[#0c0c0c] border border-neutral-850 rounded-sm">
                No targeted executive linked (Direct Brand Attack)
              </p>
            )}
          </div>

          {/* Company Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-neutral-400 font-mono text-xs uppercase tracking-wider">
              <Building className="w-3.5 h-3.5 text-sky-400" />
              <span>Registered Corporate Entity</span>
            </div>
            {account.company_name ? (
              <div className="p-3 bg-[#0c0c0c] border border-neutral-850 rounded-sm space-y-1">
                <div className="text-sm font-semibold text-neutral-200">
                  {account.company_name}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-sky-400 font-mono">
                  <Globe className="w-3 h-3" />
                  <span>{account.primary_domain}</span>
                </div>
                <div className="text-[10px] font-mono text-neutral-500 pt-1">
                  Company ID: {account.company_id?.slice(0, 8)}...
                </div>
              </div>
            ) : (
              <p className="font-mono text-xs text-neutral-500 p-3 bg-[#0c0c0c] border border-neutral-850 rounded-sm">
                No company record linked
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Risk Calibration & Procedural Update */}
      <div className="bg-[#111111] border border-neutral-800 rounded-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-neutral-200 uppercase tracking-widest">
              // RISK ASSESSMENT PROCEDURE (TRANSACTION CALL)
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-neutral-850 text-neutral-400 border border-neutral-700">
              CALL update_account_risk()
            </span>
          </div>
        </div>

        <form onSubmit={handleRiskUpdate} className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-1">
              Manual Risk Calibration (0.00 to 100.00)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={newScore}
              onChange={(e) => setNewScore(e.target.value)}
              required
              className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-sm px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-[#22ff88]"
            />
            <p className="text-[10px] font-mono text-neutral-600 mt-1">
              Thresholds: &ge;80.00 &rarr; Confirmed_Phishing | &ge;40.00 &rarr; Suspect | &lt;40.00 &rarr; Benign
            </p>
          </div>

          <button
            type="submit"
            disabled={updatingRisk}
            className="w-full sm:w-auto px-5 py-2 bg-[#22ff88] hover:bg-[#5dffa8] text-black font-mono text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors duration-150 disabled:opacity-50"
          >
            {updatingRisk ? 'EXECUTING TRANSACTION...' : 'COMMIT RISK SCORE'}
          </button>
        </form>

        {riskMessage && (
          <div
            className={`p-3 rounded-sm font-mono text-xs border ${
              riskMessage.isError
                ? 'bg-red-950/20 border-red-800 text-red-400'
                : 'bg-[#22ff88]/10 border-[#22ff88]/30 text-[#22ff88]'
            }`}
          >
            {riskMessage.text}
          </div>
        )}
      </div>

      {/* Neo4j Infrastructure Graph Section */}
      <div className="bg-[#111111] border border-neutral-800 rounded-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-[#22ff88]" />
            <span className="font-mono text-xs font-semibold text-neutral-200 uppercase tracking-widest">
              // INFRASTRUCTURE GRAPH (NEO4J)
            </span>
          </div>
          <span className="text-[10px] font-mono text-neutral-500">
            Cross-Paradigm Ref: {account.neo4j_node_ref || 'NONE'}
          </span>
        </div>

        {loadingGraph ? (
          <div className="h-80 flex items-center justify-center font-mono text-xs text-neutral-500">
            QUERYING GRAPH CLUSTERS...
          </div>
        ) : (
          <NetworkGraph nodes={graphData.nodes} links={graphData.links} />
        )}
      </div>

      {/* Recent Posts Section */}
      <div className="bg-[#111111] border border-neutral-800 rounded-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <span className="font-mono text-xs font-semibold text-neutral-200 uppercase tracking-widest">
            // RECENT SOCIAL POSTS & VECTOR EMBEDDINGS ({posts.length})
          </span>
          <span className="text-[10px] font-mono text-neutral-500">
            HNSW 768-D Indexed
          </span>
        </div>

        {posts.length === 0 ? (
          <p className="font-mono text-xs text-neutral-500 py-6 text-center">
            // NO HARVESTED POSTS RECORDED FOR THIS ACCOUNT
          </p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.post_id}
                className="p-3.5 bg-[#0c0c0c] border border-neutral-850 rounded-sm space-y-2 hover:border-neutral-750 transition-colors"
              >
                <p className="text-xs text-neutral-200 font-mono leading-relaxed whitespace-pre-wrap">
                  &ldquo;{post.raw_content}&rdquo;
                </p>
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 pt-1 border-t border-neutral-900">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-neutral-600" />
                    <span>{new Date(post.posted_at).toLocaleString()}</span>
                  </div>
                  <span>UUID: {post.post_id.slice(0, 8)}...</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Ring Dialog Modal */}
      {showRingDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111111] border border-amber-500/50 rounded-sm max-w-md w-full p-6 space-y-4 shadow-[0_0_24px_rgba(245,158,11,0.2)]">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-mono font-bold text-sm uppercase tracking-wider">
                CONFIRM SCAM RING
              </h3>
            </div>

            <p className="text-xs text-neutral-300 font-mono leading-relaxed">
              This action executes a single atomic transaction:
              <br />
              1. Traverses Neo4j for all accounts sharing IP or Email Domains with{' '}
              <span className="text-[#22ff88]">{account.platform_handle}</span>.
              <br />
              2. Sets session user for the audit trigger.
              <br />
              3. Calls <span className="text-amber-400">CALL bulk_confirm_accounts()</span>,
              updating all ring members to score 95.00 and status &ldquo;Confirmed_Phishing&rdquo;.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRingDialog(false)}
                disabled={confirmingRing}
                className="px-4 py-2 border border-neutral-800 text-neutral-400 font-mono text-xs rounded-sm hover:text-neutral-200"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmRing}
                disabled={confirmingRing}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-mono text-xs font-semibold rounded-sm tracking-wider uppercase"
              >
                {confirmingRing ? 'EXECUTING TRANSACTION...' : 'CONFIRM ENTIRE RING'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111111] border border-red-500/50 rounded-sm max-w-md w-full p-6 space-y-4 shadow-[0_0_24px_rgba(239,68,68,0.2)]">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-mono font-bold text-sm uppercase tracking-wider">
                CONFIRM PROFILE DELETION
              </h3>
            </div>

            <p className="text-xs text-neutral-300 font-mono leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <span className="text-red-400 font-bold">{account.platform_handle}</span>?
              <br />
              All associated social posts in PostgreSQL will cascade delete via foreign key constraints.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleting}
                className="px-4 py-2 border border-neutral-800 text-neutral-400 font-mono text-xs rounded-sm hover:text-neutral-200"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-4 py-2 bg-red-500 hover:bg-red-400 text-black font-mono text-xs font-semibold rounded-sm tracking-wider uppercase"
              >
                {deleting ? 'DELETING...' : 'CONFIRM DELETE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

