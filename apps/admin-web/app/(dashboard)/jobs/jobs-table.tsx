'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Briefcase,
  Eye,
  MapPin,
  Clock,
  User,
  Wrench,
  IndianRupee,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export function JobsFilterBar({
  currentStatus,
  currentSearch,
  currentDate = '',
  currentMechanic = 'all',
  mechanics = [],
}: {
  currentStatus: string;
  currentSearch: string;
  currentDate?: string;
  currentMechanic?: string;
  mechanics?: any[];
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState(currentSearch);
  const [selectedDate, setSelectedDate] = useState(currentDate);

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(window.location.search);
    if (status && status !== 'all') {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    params.set('page', '1');
    router.push(`/jobs?${params.toString()}`);
  };

  const handleDateChange = (dateVal: string) => {
    setSelectedDate(dateVal);
    const params = new URLSearchParams(window.location.search);
    if (dateVal) {
      params.set('date', dateVal);
    } else {
      params.delete('date');
    }
    params.set('page', '1');
    router.push(`/jobs?${params.toString()}`);
  };

  const handleMechanicChange = (mechId: string) => {
    const params = new URLSearchParams(window.location.search);
    if (mechId && mechId !== 'all') {
      params.set('mechanicId', mechId);
    } else {
      params.delete('mechanicId');
    }
    params.set('page', '1');
    router.push(`/jobs?${params.toString()}`);
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
    router.push(`/jobs?${params.toString()}`);
  };

  const statusFilters = [
    { label: 'All Jobs', value: 'all' },
    { label: 'Matching / Requested', value: 'matching' },
    { label: 'Assigned', value: 'assigned' },
    { label: 'En Route', value: 'mechanic_en_route' },
    { label: 'In Progress', value: 'repair_in_progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Quote Declined', value: 'quote_declined' },
    { label: 'Disputed', value: 'disputed' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {statusFilters.map((tab) => {
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

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search job ID, farmer name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-xs"
          />
        </form>
      </div>

      {/* Date & Mechanic Secondary Filter Row */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-500">Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {selectedDate && (
            <button
              onClick={() => handleDateChange('')}
              className="text-[10px] text-slate-500 hover:text-rose-600 underline"
            >
              Clear
            </button>
          )}
        </div>

        {mechanics.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500">Mechanic:</span>
            <select
              value={currentMechanic}
              onChange={(e) => handleMechanicChange(e.target.value)}
              className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Mechanics</option>
              {mechanics.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.profile?.full_name || 'Mechanic'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

export function JobsTable({ jobs }: { jobs: any[] }) {
  if (jobs.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
        <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-700">No jobs found</h4>
        <p className="text-xs text-slate-400 mt-1">
          No repair dispatch records match your selected filters.
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
              <th className="px-6 py-3.5">Job ID & Lifecycle</th>
              <th className="px-6 py-3.5">Customer / Farmer</th>
              <th className="px-6 py-3.5">Assigned Mechanic</th>
              <th className="px-6 py-3.5">Category & Equipment</th>
              <th className="px-6 py-3.5">Location</th>
              <th className="px-6 py-3.5">Invoice Amount</th>
              <th className="px-6 py-3.5">Created At</th>
              <th className="px-6 py-3.5 text-right">Intervention</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-mono text-slate-900 font-bold block">
                    #{job.id.slice(0, 8)}
                  </span>
                  <div className="mt-1">
                    <StatusBadge type="job" status={job.status} />
                  </div>
                </td>

                <td className="px-6 py-4">
                  <p className="font-semibold text-slate-900">
                    {job.customer?.profile?.full_name ||
                      (job.customer?.profile?.phone ? `Farmer (+${job.customer.profile.phone})` : 'Farmer')}
                  </p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    {job.customer?.profile?.phone || job.customer?.phone || 'No phone'}
                  </p>
                </td>

                <td className="px-6 py-4">
                  {job.mechanic ? (
                    <div>
                      <p className="font-semibold text-slate-900">
                        {job.mechanic.profile?.full_name || 'Mechanic'}
                      </p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        {job.mechanic.profile?.phone || '—'}
                      </p>
                    </div>
                  ) : (
                    <span className="text-amber-600 font-medium italic">
                      Awaiting Mechanic
                    </span>
                  )}
                </td>

                <td className="px-6 py-4 max-w-xs">
                  <p className="font-medium text-slate-800 truncate">
                    {job.request?.category?.name_en || 'Repair Service'}
                  </p>
                  <p className="text-slate-400 text-[11px] truncate mt-0.5">
                    {job.request?.tractor
                      ? `${job.request.tractor.make} ${job.request.tractor.model}`
                      : 'Equipment unspecified'}
                  </p>
                </td>

                <td className="px-6 py-4 max-w-xs">
                  <p className="text-slate-700 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    {job.request?.address_text || job.request?.address || 'Field location'}
                  </p>
                </td>

                <td className="px-6 py-4">
                  <span className="font-bold text-slate-900">
                    {job.final_invoice?.total || job.final_invoice?.[0]?.total
                      ? formatCurrency(job.final_invoice?.total || job.final_invoice?.[0]?.total)
                      : '—'}
                  </span>
                  {(job.final_invoice?.status || job.final_invoice?.[0]?.status) && (
                    <span className="text-[10px] block text-emerald-600 font-medium capitalize">
                      {job.final_invoice?.status || job.final_invoice?.[0]?.status}
                    </span>
                  )}
                </td>

                <td className="px-6 py-4 text-slate-500 text-[11px]">
                  {formatDateTime(job.created_at)}
                </td>

                <td className="px-6 py-4 text-right">
                  <Link href={`/jobs/${job.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      Manage
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
