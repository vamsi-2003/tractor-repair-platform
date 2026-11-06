import React from 'react';
import { getCrashLogs } from '@/lib/actions/crashes';
import { CrashView } from './crash-view';

export const revalidate = 0; // Dynamic

export default async function CrashesPage({
  searchParams,
}: {
  searchParams: { severity?: string; role?: string; q?: string; page?: string };
}) {
  const currentSeverity = searchParams.severity || 'all';
  const currentRole = searchParams.role || 'all';
  const currentSearch = searchParams.q || '';
  const page = parseInt(searchParams.page || '1', 10);

  const { logs, count } = await getCrashLogs({
    severity: currentSeverity,
    role: currentRole,
    search: currentSearch,
    page,
    limit: 30,
  });

  return (
    <CrashView
      logs={logs}
      count={count}
      currentSeverity={currentSeverity}
      currentRole={currentRole}
      currentSearch={currentSearch}
    />
  );
}
