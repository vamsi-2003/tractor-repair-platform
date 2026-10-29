'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wrench,
  Users,
  Briefcase,
  AlertOctagon,
  Wallet,
  Settings,
  ShieldCheck,
  LogOut,
  Tractor,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOutAdmin } from '@/lib/actions/auth';

const NAV_ITEMS = [
  {
    name: 'Overview',
    href: '/',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: 'Mechanics',
    href: '/mechanics',
    icon: Wrench,
    badgeKey: 'pendingMechanics',
  },
  {
    name: 'Customers',
    href: '/customers',
    icon: Users,
  },
  {
    name: 'Requests & Jobs',
    href: '/jobs',
    icon: Briefcase,
    badgeKey: 'activeJobs',
  },
  {
    name: 'Disputes & Tickets',
    href: '/disputes',
    icon: AlertOctagon,
    badgeKey: 'disputes',
  },
  {
    name: 'Financials & Ledger',
    href: '/financials',
    icon: Wallet,
  },
  {
    name: 'Settings & Regions',
    href: '/settings',
    icon: Settings,
  },
  {
    name: 'Audit Logs',
    href: '/audit',
    icon: ShieldCheck,
  },
];

export function Sidebar() {
  const pathname = usePathname() || '';

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center text-white shadow-md shadow-emerald-900/30">
          <Tractor className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-sm font-bold text-white tracking-wide block leading-none">
            TRACTOR REPAIR
          </span>
          <span className="text-[10px] font-semibold text-emerald-400 tracking-wider uppercase mt-1 inline-block">
            Admin Console
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
          Platform Management
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group',
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/30 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                  )}
                />
                <span>{item.name}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Admin User Footer & Sign out */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/80">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
              AD
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-none">
                Platform Admin
              </p>
              <p className="text-[11px] text-slate-400 truncate mt-1">
                admin@tractorapp.com
              </p>
            </div>
          </div>
          <form action={signOutAdmin}>
            <button
              type="submit"
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
