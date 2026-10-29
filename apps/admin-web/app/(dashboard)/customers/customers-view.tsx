'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Users,
  Tractor,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  ChevronDown,
  ChevronUp,
  UserX,
  UserCheck,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toggleUserBlockStatus } from '@/lib/actions/settings';

export function CustomersView({
  customers,
  count,
  currentSearch,
}: {
  customers: any[];
  count: number;
  currentSearch: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState(currentSearch);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

  const handleToggleBlock = (profileId: string, currentActive: boolean) => {
    startTransition(async () => {
      await toggleUserBlockStatus(profileId, !currentActive, 'Admin moderation');
      router.refresh();
    });
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
    router.push(`/customers?${params.toString()}`);
  };

  const toggleExpand = (id: string) => {
    setExpandedCustomerId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Customer & Tractor Fleet Directory
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Registered farmers, tractor equipment inventory, and dispatch histories.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search farmer name, phone, village..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-xs"
          />
        </form>
      </div>

      <div className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{customers.length}</span> of{' '}
        <span className="font-semibold text-slate-700">{count}</span> customers
      </div>

      {customers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-700">No customers found</h4>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search terms or verify farmer profile records.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Farmer Profile</th>
                  <th className="px-6 py-3.5">Location & District</th>
                  <th className="px-6 py-3.5">Registered Tractors</th>
                  <th className="px-6 py-3.5">Service Jobs</th>
                  <th className="px-6 py-3.5">Member Since</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => {
                  const isExpanded = expandedCustomerId === c.id;
                  const tractors = c.tractors || [];
                  const jobsCount = c.jobs?.length || 0;
                  const isActive = c.profile?.is_active !== false;

                  return (
                    <React.Fragment key={c.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center shrink-0 border border-slate-200">
                              {c.profile?.full_name?.charAt(0) || 'F'}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-xs">
                                {c.profile?.full_name || 'Farmer Customer'}
                              </p>
                              <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {c.profile?.phone || 'No phone'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            {c.village || c.mandal || c.district
                              ? [c.village, c.mandal, c.district].filter(Boolean).join(', ')
                              : 'Not specified'}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {c.state || 'State not specified'}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {tractors.length} Tractor{tractors.length !== 1 ? 's' : ''}
                            </span>
                            {tractors.length > 0 && (
                              <span className="text-slate-500 text-[11px] truncate max-w-[140px]">
                                {tractors[0].make} {tractors[0].model}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-800">
                            {jobsCount} Repair{jobsCount !== 1 ? 's' : ''}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-slate-500 text-[11px]">
                          {formatDate(c.created_at)}
                        </td>

                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {isActive ? 'Active' : 'Blocked'}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {c.profile?.id && (
                              <button
                                onClick={() => handleToggleBlock(c.profile.id, isActive)}
                                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                                  isActive
                                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                              >
                                {isActive ? 'Block' : 'Unblock'}
                              </button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleExpand(c.id)}
                              className="text-xs"
                            >
                              <Tractor className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              Fleet ({tractors.length})
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 ml-1" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 ml-1" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Tractors Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-y border-slate-200/80">
                          <td colSpan={6} className="px-8 py-4">
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Tractor className="w-4 h-4 text-emerald-600" />
                                Registered Farm Tractors ({tractors.length})
                              </h4>

                              {tractors.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">
                                  No specific tractors registered yet.
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {tractors.map((t: any) => (
                                    <div
                                      key={t.id}
                                      className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-900 text-xs">
                                          {t.make} {t.model}
                                        </span>
                                        {t.year && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                                            {t.year}
                                          </span>
                                        )}
                                      </div>

                                      <div className="text-[11px] text-slate-600 grid grid-cols-2 gap-1 pt-1 border-t border-slate-100">
                                        <div>
                                          <span className="text-slate-400 block text-[9px] uppercase">
                                            Reg Number
                                          </span>
                                          <span className="font-mono font-medium">
                                            {t.registration_number || 'N/A'}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-slate-400 block text-[9px] uppercase">
                                            Hours Run
                                          </span>
                                          <span>{t.hours_run ? `${t.hours_run} hrs` : 'N/A'}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
