import React from 'react';
import {
  getAppSettings,
  getProblemCategories,
  getServiceRegions,
  getCancellationMetrics,
} from '@/lib/actions/settings';
import { SettingsView } from './settings-view';

export const revalidate = 0; // Dynamic

export default async function SettingsPage() {
  const [settings, categories, regions, cancellations] = await Promise.all([
    getAppSettings(),
    getProblemCategories(),
    getServiceRegions(),
    getCancellationMetrics(),
  ]);

  return (
    <SettingsView
      settings={settings}
      categories={categories}
      regions={regions}
      cancellations={cancellations}
    />
  );
}
