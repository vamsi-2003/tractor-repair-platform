'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Shield } from 'lucide-react';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Executive Dashboard',
    subtitle: 'Real-time metrics, active repair dispatches & system health',
  },
  '/mechanics': {
    title: 'Mechanic Verification & Fleet',
    subtitle: 'Review identity proofs, certify mechanics, and manage directory',
  },
  '/customers': {
    title: 'Customer Directory',
    subtitle: 'Registered farmers, tractor equipment & repair service logs',
  },
  '/jobs': {
    title: 'Requests & Active Repairs',
    subtitle: 'Monitor live match dispatch, quotes, progress, and manual overrides',
  },
  '/disputes': {
    title: 'Disputes & Support Tickets',
    subtitle: 'Review reported incidents, customer appeals & issue direct refunds',
  },
  '/financials': {
    title: 'Financial Ledger & Settlements',
    subtitle: 'Payment splits, online vs cash breakdown & mechanic payout batches',
  },
  '/settings': {
    title: 'Application Settings & Regions',
    subtitle: 'Platform commission, pilot zones & multilingual repair categories',
  },
  '/audit': {
    title: 'Security & Audit Logs',
    subtitle: 'Immutable record of all administrative actions and status updates',
  },
};

export function Header() {
  const pathname = usePathname() || '';

  // Find matching title
  let current = PAGE_TITLES[pathname];
  if (!current) {
    if (pathname.startsWith('/mechanics/')) {
      current = {
        title: 'Mechanic Profile & Document Review',
        subtitle: 'Inspect government identity documents and evaluate verification status',
      };
    } else if (pathname.startsWith('/jobs/')) {
      current = {
        title: 'Job Lifecycle Details',
        subtitle: 'Comprehensive audit trail, parts quotes, and mechanic dispatch',
      };
    } else {
      current = {
        title: 'Admin Console',
        subtitle: 'Tractor Repair Marketplace Platform Management',
      };
    }
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div>
        <h1 className="text-lg font-bold text-slate-900 leading-tight">
          {current.title}
        </h1>
        <p className="text-xs text-slate-500 hidden sm:block">
          {current.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Pilot region indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200/60 rounded-full text-xs font-medium text-emerald-800">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Live GPS Dispatch Active</span>
        </div>

        {/* Role badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md text-xs font-semibold text-slate-700 border border-slate-200">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Role: Super Admin</span>
        </div>
      </div>
    </header>
  );
}
