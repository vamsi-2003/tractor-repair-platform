import React from 'react';
import { getJobs } from '@/lib/actions/jobs';
import { getMechanics } from '@/lib/actions/mechanics';
import { JobsFilterBar, JobsTable } from './jobs-table';

export const revalidate = 0; // Dynamic

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; page?: string; date?: string; mechanicId?: string };
}) {
  const currentStatus = searchParams.status || 'all';
  const currentSearch = searchParams.q || '';
  const currentDate = searchParams.date || '';
  const currentMechanic = searchParams.mechanicId || 'all';
  const page = parseInt(searchParams.page || '1', 10);

  const [{ jobs, count }, { mechanics }] = await Promise.all([
    getJobs({
      status: currentStatus,
      search: currentSearch,
      date: currentDate,
      mechanicId: currentMechanic,
      page,
      limit: 25,
    }),
    getMechanics({ limit: 100 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Requests & Live Repair Dispatches
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Monitor active mechanic dispatches, lifecycle progression, quotes, and intervene on stalled jobs.
        </p>
      </div>

      <JobsFilterBar
        currentStatus={currentStatus}
        currentSearch={currentSearch}
        currentDate={currentDate}
        currentMechanic={currentMechanic}
        mechanics={mechanics}
      />

      <div className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{jobs.length}</span> of{' '}
        <span className="font-semibold text-slate-700">{count}</span> jobs
      </div>

      <JobsTable jobs={jobs} />
    </div>
  );
}
