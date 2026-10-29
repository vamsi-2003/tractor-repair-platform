import React from 'react';
import { getCustomers } from '@/lib/actions/customers';
import { CustomersView } from './customers-view';

export const revalidate = 0; // Dynamic

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const currentSearch = searchParams.q || '';
  const page = parseInt(searchParams.page || '1', 10);

  const { customers, count } = await getCustomers({
    search: currentSearch,
    page,
    limit: 25,
  });

  return (
    <CustomersView
      customers={customers}
      count={count}
      currentSearch={currentSearch}
    />
  );
}
