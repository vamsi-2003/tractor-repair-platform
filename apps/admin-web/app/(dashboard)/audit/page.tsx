import React from 'react';
import { getAuditLogs } from '@/lib/actions/audit';
import { AuditView } from './audit-view';

export const revalidate = 0; // Dynamic

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { action?: string; entity?: string; q?: string; page?: string };
}) {
  const currentAction = searchParams.action || 'all';
  const currentEntity = searchParams.entity || 'all';
  const currentSearch = searchParams.q || '';
  const page = parseInt(searchParams.page || '1', 10);

  const { logs, count } = await getAuditLogs({
    action: currentAction,
    entityType: currentEntity,
    search: currentSearch,
    page,
    limit: 30,
  });

  return (
    <AuditView
      logs={logs}
      count={count}
      currentAction={currentAction}
      currentEntity={currentEntity}
      currentSearch={currentSearch}
    />
  );
}
