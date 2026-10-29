import React from 'react';
import { getDisputesAndTickets } from '@/lib/actions/disputes';
import { DisputesView } from './disputes-view';

export const revalidate = 0; // Dynamic

export default async function DisputesPage({
  searchParams,
}: {
  searchParams: { status?: string; priority?: string; q?: string; page?: string };
}) {
  const currentStatus = searchParams.status || 'all';
  const currentPriority = searchParams.priority || 'all';
  const currentSearch = searchParams.q || '';
  const page = parseInt(searchParams.page || '1', 10);

  const { tickets, count } = await getDisputesAndTickets({
    status: currentStatus,
    priority: currentPriority,
    search: currentSearch,
    page,
    limit: 25,
  });

  return (
    <DisputesView
      tickets={tickets}
      count={count}
      currentStatus={currentStatus}
      currentPriority={currentPriority}
      currentSearch={currentSearch}
    />
  );
}
