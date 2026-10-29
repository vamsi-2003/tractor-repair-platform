import React from 'react';
import { notFound } from 'next/navigation';
import { getJobById, getApprovedMechanics } from '@/lib/actions/jobs';
import { JobDetailView } from './job-detail-view';

export const revalidate = 0; // Dynamic

export default async function JobDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const job = await getJobById(params.id);

  if (!job) {
    notFound();
  }

  const approvedMechanics = await getApprovedMechanics();

  return <JobDetailView job={job} approvedMechanics={approvedMechanics} />;
}
