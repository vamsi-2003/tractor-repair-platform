import React from 'react';
import {
  getFinancialSummary,
  getInvoices,
  getMechanicLedger,
  getRecentSettlements,
} from '@/lib/actions/financials';
import { FinancialsView } from './financials-view';

export const revalidate = 0; // Dynamic

export default async function FinancialsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const currentStatus = searchParams.status || 'all';
  const page = parseInt(searchParams.page || '1', 10);

  const [summary, { invoices, count: invoicesCount }, mechanicBalances, settlements] =
    await Promise.all([
      getFinancialSummary(),
      getInvoices({ status: currentStatus, page, limit: 20 }),
      getMechanicLedger(),
      getRecentSettlements(),
    ]);

  return (
    <FinancialsView
      summary={summary}
      invoices={invoices}
      invoicesCount={invoicesCount}
      mechanicBalances={mechanicBalances}
      recentSettlements={settlements}
    />
  );
}
