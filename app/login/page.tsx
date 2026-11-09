'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Login failed');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Network error — try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
      {/* Dot-grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, #222 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-8 text-center">
          <span className="font-mono text-2xl font-bold tracking-[0.2em] text-neutral-100 uppercase">
            SOCMINT
          </span>
          <span className="inline-block w-2 h-4 bg-[#22ff88] ml-1 align-middle animate-pulse" />
          <p className="mt-2 font-mono text-xs text-neutral-500 tracking-widest uppercase">
            // executive impersonation detection
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#111111] border border-neutral-800 rounded-sm p-8">
          <p className="font-mono text-xs text-neutral-500 tracking-widest uppercase mb-6">
            // authenticate
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-xs text-neutral-500 uppercase tracking-widest mb-1">
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-sm px-3 py-2 text-sm text-neutral-100 font-mono placeholder-neutral-700 focus:outline-none focus:border-[#22ff88] focus:ring-1 focus:ring-[#22ff88] transition-colors duration-150"
                placeholder="analyst_cyber"
              />
            </div>

            <div>
              <label className="block font-mono text-xs text-neutral-500 uppercase tracking-widest mb-1">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-sm px-3 py-2 text-sm text-neutral-100 font-mono placeholder-neutral-700 focus:outline-none focus:border-[#22ff88] focus:ring-1 focus:ring-[#22ff88] transition-colors duration-150"
                placeholder="••••••••••"
              />
            </div>

            {error && (
              <p className="font-mono text-xs text-red-500 tracking-wide">
                ✗ {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#22ff88] hover:bg-[#5dffa8] text-black font-mono text-sm font-semibold uppercase tracking-widest py-2 rounded-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(34,255,136,0.25)] hover:shadow-[0_0_20px_rgba(34,255,136,0.4)]"
            >
              {loading ? '...' : 'Access System'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center font-mono text-xs text-neutral-700">
          unauthorized access is monitored and logged
        </p>
      </div>
    </div>
  );
}

