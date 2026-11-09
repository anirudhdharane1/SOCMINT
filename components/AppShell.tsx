'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  ClipboardList,
  LogOut,
  ShieldAlert,
} from 'lucide-react';

interface AppShellProps {
  user: {
    user_id?: string;
    username: string;
    role: string;
  };
  children: ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Investigate',
      href: '/investigate',
      icon: Search,
    },
    ...(user.role === 'Admin'
      ? [
          {
            label: 'Audit Logs',
            href: '/audit',
            icon: ClipboardList,
            badge: 'Admin',
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 flex relative overflow-x-hidden">
      {/* Background dot grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40 z-0"
        style={{
          backgroundImage: 'radial-gradient(circle, #262626 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Slim Left Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-neutral-800 bg-[#0d0d0d]/90 backdrop-blur-md flex flex-col z-20 relative min-h-screen">
        {/* Brand header */}
        <div className="h-16 flex items-center px-5 border-b border-neutral-800 gap-2">
          <ShieldAlert className="w-5 h-5 text-[#22ff88]" />
          <Link href="/dashboard" className="flex items-center">
            <span className="font-mono font-bold text-lg tracking-[0.2em] text-neutral-100 uppercase">
              SOCMINT
            </span>
            <span className="inline-block w-2 h-4 bg-[#22ff88] ml-1 animate-pulse" />
          </Link>
        </div>

        {/* Navigation links */}
        <div className="p-3 space-y-1 flex-1">
          <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-neutral-600">
            // Navigation
          </div>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-mono tracking-wide transition-all duration-150 ${
                  isActive
                    ? 'bg-[#161616] text-[#22ff88] border-l-2 border-[#22ff88] shadow-[0_0_12px_rgba(34,255,136,0.15)] font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#141414] border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-[#22ff88]' : 'text-neutral-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-neutral-700 bg-neutral-800/80 text-neutral-400 font-mono">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* System status indicator at bottom of sidebar */}
        <div className="p-4 border-t border-neutral-800 font-mono text-[11px] text-neutral-500">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22ff88] shadow-[0_0_6px_#22ff88]" />
            <span className="text-neutral-400 uppercase tracking-widest">Postgres + Neo4j</span>
          </div>
          <p className="text-[10px] text-neutral-600 truncate">HNSW 768-D // Graph Active</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-neutral-800 bg-[#0c0c0c]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-neutral-500 uppercase tracking-widest">
              OP_CONSOLE //
            </span>
            <span className="font-mono text-xs text-neutral-300 uppercase tracking-wider">
              Executive Impersonation Shield
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* User badge */}
            <div className="flex items-center gap-2.5 bg-[#121212] border border-neutral-800 px-3 py-1.5 rounded-sm">
              <span className="w-2 h-2 rounded-full bg-[#22ff88]" />
              <span className="font-mono text-xs text-neutral-200 font-medium">
                {user.username}
              </span>
              <span
                className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded tracking-wider border ${
                  user.role === 'Admin'
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : 'bg-[#22ff88]/10 text-[#22ff88] border-[#22ff88]/30'
                }`}
              >
                {user.role}
              </span>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              title="Terminate Session"
              className="flex items-center gap-1.5 font-mono text-xs text-neutral-400 hover:text-red-400 px-3 py-1.5 rounded-sm border border-neutral-800 hover:border-red-900/50 bg-[#121212] transition-colors duration-150"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>LOGOUT</span>
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

