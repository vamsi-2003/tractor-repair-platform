'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, Wrench, ArrowRight, Eye, Phone, MapPin, Star } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export function MechanicsFilterBar({
  currentStatus,
  currentSearch,
}: {
  currentStatus: string;
  currentSearch: string;
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(currentSearch);

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(window.location.search);
    if (status && status !== 'all') {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    params.set('page', '1');
    router.push(`/mechanics?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    if (searchTerm.trim()) {
      params.set('q', searchTerm.trim());
    } else {
      params.delete('q');
    }
    params.set('page', '1');
    router.push(`/mechanics?${params.toString()}`);
  };

  const tabs = [
    { label: 'All Mechanics', value: 'all' },
    { label: 'Pending Approval', value: 'pending' },
    { label: 'Approved Fleet', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Suspended', value: 'suspended' },
  ];

  return (
    <div className="space-y-4">
      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {tabs.map((tab) => {
            const active =
              currentStatus === tab.value ||
              (!currentStatus && tab.value === 'all');
            return (
              <button
                key={tab.value}
                onClick={() => handleStatusChange(tab.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                  active
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search mechanic name, phone, workshop..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-xs"
          />
        </form>
      </div>
    </div>
  );
}

export function MechanicsTable({ mechanics }: { mechanics: any[] }) {
  if (mechanics.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
        <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-700">
          No mechanics found
        </h4>
        <p className="text-xs text-slate-400 mt-1">
          Try clearing your search query or switching status filters.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3.5">Mechanic Profile</th>
              <th className="px-6 py-3.5">Verification Status</th>
              <th className="px-6 py-3.5">Experience & Rating</th>
              <th className="px-6 py-3.5">Workshop Location</th>
              <th className="px-6 py-3.5">ID Documents</th>
              <th className="px-6 py-3.5">Registered</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mechanics.map((mechanic) => {
              const docsCount = mechanic.documents?.length || 0;
              const approvedDocs = (mechanic.documents || []).filter(
                (d: any) => d.status === 'approved' || d.status === 'verified'
              ).length;

              return (
                <tr
                  key={mechanic.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 border border-emerald-200">
                        {mechanic.profile?.full_name?.charAt(0) || 'M'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-xs">
                          {mechanic.profile?.full_name || 'Mechanic'}
                        </p>
                        <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {mechanic.profile?.phone || 'No phone'}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <StatusBadge type="mechanic" status={mechanic.status} />
                  </td>

                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-900">
                      {mechanic.experience_years || 0} years exp
                    </p>
                    <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{mechanic.rating_avg ? mechanic.rating_avg.toFixed(1) : '5.0'}</span>
                      <span className="text-slate-400">({mechanic.completed_jobs_count || 0} jobs)</span>
                    </p>
                  </td>

                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-slate-700 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      {mechanic.workshop_address || 'Unspecified'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Radius: {mechanic.service_radius_km || 25} km
                    </p>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                          approvedDocs > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {approvedDocs}/{docsCount} Verified
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-slate-500 text-[11px]">
                    {formatDate(mechanic.created_at)}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <Link href={`/mechanics/${mechanic.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        Inspect KYC
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
