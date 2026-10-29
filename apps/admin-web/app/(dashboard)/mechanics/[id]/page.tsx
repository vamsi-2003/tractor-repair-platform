import React from 'react';
import { notFound } from 'next/navigation';
import { getMechanicById } from '@/lib/actions/mechanics';
import { MechanicDetailView } from './mechanic-detail-view';

export const revalidate = 0; // Dynamic

export default async function MechanicDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const mechanic = await getMechanicById(params.id);

  if (!mechanic) {
    notFound();
  }

  return <MechanicDetailView mechanic={mechanic} />;
}
