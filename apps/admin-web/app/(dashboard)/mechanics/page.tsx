import React from 'react';
import { getMechanics } from '@/lib/actions/mechanics';
import { MechanicsFilterBar, MechanicsTable } from './mechanics-table';

export const revalidate = 0; // Dynamic

export default async function MechanicsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; page?: string };
}) {
  const currentStatus = searchParams.status || 'all';
  const currentSearch = searchParams.q || '';
  const page = parseInt(searchParams.page || '1', 10);

  const { mechanics, count } = await getMechanics({
    status: currentStatus,
    search: currentSearch,
    page,
    limit: 25,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Mechanic Verification & Fleet Directory
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Review submitted government documents, approve new mechanic applicants, and manage service eligibility.
        </p>
      </div>

      <MechanicsFilterBar
        currentStatus={currentStatus}
        currentSearch={currentSearch}
      />

      <div className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{mechanics.length}</span> of{' '}
        <span className="font-semibold text-slate-700">{count}</span> mechanics
      </div>

      <MechanicsTable mechanics={mechanics} />
    </div>
  );
}
