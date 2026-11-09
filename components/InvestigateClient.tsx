'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from './StatusBadge';
import { Search, Sparkles, FileText, ArrowRight, Clock, AlertCircle } from 'lucide-react';

interface SearchResult {
  post_id: string;
  raw_content: string;
  posted_at: string;
  account_id: string;
  platform_handle: string;
  threat_status: string;
  similarity: number;
}

export function InvestigateClient() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'semantic' | 'fulltext'>('semantic');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exampleQueries = [
    'Urgent wire transfer required for overseas acquisition',
    'Verify your executive portal credentials immediately',
    'Confidential M&A discussion - update your login',
  ];

  async function handleSearch(searchQuery: string = query, searchMode: 'semantic' | 'fulltext' = mode) {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim(), mode: searchMode }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Search request failed');
      }

      const data = await res.json();
      setResults(data.results || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function runExample(ex: string) {
    setQuery(ex);
    handleSearch(ex, mode);
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-500 mb-1">
          // FORENSIC VECTOR & FULL-TEXT RETRIEVAL
        </div>
        <h1 className="text-2xl font-bold font-mono tracking-tight text-neutral-100 uppercase">
          Threat Intelligence Search
        </h1>
        <p className="text-xs text-neutral-400 font-mono mt-1">
          Detect synthetic lures and executive phishing attempts using pgvector HNSW cosine similarity or PostgreSQL GIN full-text indexing.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-[#111111] border border-neutral-800 rounded-sm p-6 space-y-4">
        {/* Toggle Mode */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-neutral-800/80">
          <div className="flex items-center gap-1 bg-[#0a0a0a] border border-neutral-800 p-1 rounded-sm">
            <button
              type="button"
              onClick={() => setMode('semantic')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono text-xs transition-colors duration-150 ${
                mode === 'semantic'
                  ? 'bg-[#22ff88] text-black font-semibold shadow-[0_0_12px_rgba(34,255,136,0.3)]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>SEMANTIC (pgvector HNSW)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('fulltext')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono text-xs transition-colors duration-150 ${
                mode === 'fulltext'
                  ? 'bg-[#22ff88] text-black font-semibold shadow-[0_0_12px_rgba(34,255,136,0.3)]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>FULL-TEXT (GIN ts_rank)</span>
            </button>
          </div>

          <span className="font-mono text-[11px] text-neutral-500">
            {mode === 'semantic'
              ? 'all-mpnet-base-v2 (768-D) <=> content_embedding'
              : 'to_tsvector @@ plainto_tsquery'}
          </span>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                mode === 'semantic'
                  ? 'Enter suspected spear-phishing hook or paraphrase (e.g. wire transfer urgency)...'
                  : 'Enter exact keywords (e.g. credentials, portal, banking)...'
              }
              className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-sm pl-9 pr-4 py-2.5 text-xs text-neutral-100 font-mono placeholder-neutral-600 focus:outline-none focus:border-[#22ff88] focus:ring-1 focus:ring-[#22ff88] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#22ff88] hover:bg-[#5dffa8] text-black font-mono text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(34,255,136,0.2)]"
          >
            {loading ? 'QUERYING...' : 'EXECUTE SEARCH'}
          </button>
        </form>

        {/* Example Clickable Queries */}
        <div className="pt-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-2">
            // PRE-INDEXED SUSPICIOUS PHRASING EXAMPLES
          </div>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => runExample(ex)}
                className="font-mono text-[11px] text-neutral-400 hover:text-[#22ff88] bg-[#0c0c0c] border border-neutral-800 hover:border-[#22ff88]/50 px-2.5 py-1 rounded-sm text-left transition-colors duration-150"
              >
                &ldquo;{ex}&rdquo;
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-red-950/20 border border-red-800/50 rounded-sm flex items-center gap-3 text-red-400 font-mono text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Error during search execution: {error}</span>
        </div>
      )}

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-semibold text-neutral-300 uppercase tracking-widest">
            // MATCHING SOCIAL POSTS ({results ? results.length : 0})
          </span>
          {results && (
            <span className="font-mono text-[11px] text-neutral-500">
              Ranked by {mode === 'semantic' ? 'Cosine Similarity' : 'ts_rank Score'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 bg-[#111111] border border-neutral-800 rounded-sm animate-pulse space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 bg-neutral-800 rounded w-40" />
                  <div className="h-4 bg-neutral-800 rounded w-20" />
                </div>
                <div className="h-3 bg-neutral-850 rounded w-full" />
                <div className="h-3 bg-neutral-850 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : results === null ? (
          <div className="p-12 text-center bg-[#111111]/40 border border-neutral-850 rounded-sm">
            <Search className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
            <p className="font-mono text-xs text-neutral-500 uppercase tracking-widest">
              AWAITING SEARCH QUERY INPUT
            </p>
            <p className="text-[11px] text-neutral-600 font-mono mt-1">
              Select an example above or enter phrasing to match against indexed social posts
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="p-12 text-center bg-[#111111] border border-neutral-800 rounded-sm font-mono text-xs text-neutral-500">
            // NO RESULTS FOUND FOR CURRENT QUERY IN &quot;{mode.toUpperCase()}&quot; MODE
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((r) => {
              const similarityVal = Number(r.similarity) || 0;
              const formattedScore =
                mode === 'semantic'
                  ? `${(similarityVal * 100).toFixed(1)}% match`
                  : `rank ${similarityVal.toFixed(3)}`;

              return (
                <div
                  key={r.post_id}
                  className="p-4 bg-[#111111] border border-neutral-800 hover:border-neutral-700 hover:border-l-2 hover:border-l-[#22ff88] rounded-sm transition-all duration-150 space-y-3"
                >
                  {/* Top Bar: Handle, Status, Score */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Link
                        href={`/accounts/${r.account_id}`}
                        className="font-mono text-xs font-bold text-neutral-100 hover:text-[#22ff88] transition-colors"
                      >
                        {r.platform_handle}
                      </Link>
                      <StatusBadge status={r.threat_status} />
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs px-2 py-0.5 rounded border border-[#22ff88]/30 bg-[#22ff88]/10 text-[#22ff88] font-semibold">
                        {formattedScore}
                      </span>
                      <Link
                        href={`/accounts/${r.account_id}`}
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-neutral-400 hover:text-[#22ff88] transition-colors"
                      >
                        <span>INSPECT</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Raw Post Content Snippet */}
                  <p className="text-xs text-neutral-300 font-mono bg-[#0c0c0c] border border-neutral-850 p-3 rounded-sm leading-relaxed whitespace-pre-wrap">
                    &ldquo;{r.raw_content}&rdquo;
                  </p>

                  {/* Footer Meta */}
                  <div className="flex items-center gap-4 text-[10px] font-mono text-neutral-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-neutral-600" />
                      <span>{new Date(r.posted_at).toLocaleString()}</span>
                    </div>
                    <span>Post ID: {r.post_id.slice(0, 8)}...</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

