'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sliders,
  MapPin,
  FolderPlus,
  Save,
  CheckCircle,
  Plus,
  Edit,
  Globe,
  Radio,
  Clock,
  IndianRupee,
  Percent,
  UserX,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import {
  updateAppSetting,
  upsertProblemCategory,
  toggleProblemCategory,
  upsertServiceRegion,
  toggleServiceRegion,
  toggleUserBlockStatus,
} from '@/lib/actions/settings';
import { formatDateTime } from '@/lib/utils';

export function SettingsView({
  settings,
  categories,
  regions,
  cancellations,
}: {
  settings: any[];
  categories: any[];
  regions: any[];
  cancellations?: { customers: any[]; mechanics: any[] };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Settings local state
  const getSettingVal = (key: string, defaultVal: string) =>
    settings.find((s) => s.key === key)?.value || defaultVal;
  const getSettingObj = (key: string) =>
    settings.find((s) => s.key === key);

  const [platformFeePercent, setPlatformFeePercent] = useState(
    getSettingVal('platform_fee_percent', getSettingVal('commission_rate', '10'))
  );
  const [visitChargeAmount, setVisitChargeAmount] = useState(
    getSettingVal('visit_charge_amount', getSettingVal('default_visit_charge', '200'))
  );
  const [serviceRadius, setServiceRadius] = useState(
    getSettingVal('default_service_radius_km', '25')
  );
  const [assignmentTimeout, setAssignmentTimeout] = useState(
    getSettingVal('offer_timeout_seconds', getSettingVal('assignment_timeout_seconds', '30'))
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Category Modal
  const [categoryModal, setCategoryModal] = useState<{
    isOpen: boolean;
    data: any | null;
  }>({
    isOpen: false,
    data: null,
  });

  // Region Modal
  const [regionModal, setRegionModal] = useState<{
    isOpen: boolean;
    data: any | null;
  }>({
    isOpen: false,
    data: null,
  });

  const handleSaveSettings = () => {
    startTransition(async () => {
      await Promise.all([
        updateAppSetting('platform_fee_percent', platformFeePercent),
        updateAppSetting('commission_rate', platformFeePercent),
        updateAppSetting('visit_charge_amount', visitChargeAmount),
        updateAppSetting('default_visit_charge', visitChargeAmount),
        updateAppSetting('default_service_radius_km', serviceRadius),
        updateAppSetting('assignment_timeout_seconds', assignmentTimeout),
        updateAppSetting('offer_timeout_seconds', assignmentTimeout),
      ]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      router.refresh();
    });
  };

  const handleToggleBlock = (profileId: string, currentActive: boolean) => {
    startTransition(async () => {
      await toggleUserBlockStatus(
        profileId,
        !currentActive,
        'High cancellation governance moderation'
      );
      router.refresh();
    });
  };

  const handleCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const categoryData = {
      id: categoryModal.data?.id,
      name_en: formData.get('name_en') as string,
      name_te: formData.get('name_te') as string,
      name_hi: formData.get('name_hi') as string,
      icon: (formData.get('icon') as string) || 'wrench',
      base_price_estimate: Number(formData.get('base_price_estimate')) || 0,
      sort_order: Number(formData.get('sort_order')) || 0,
      is_active: true,
    };

    startTransition(async () => {
      await upsertProblemCategory(categoryData);
      setCategoryModal({ isOpen: false, data: null });
      router.refresh();
    });
  };

  const handleRegionSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const regionData = {
      id: regionModal.data?.id,
      name: formData.get('name') as string,
      state: formData.get('state') as string,
      district: formData.get('district') as string,
      radius_km: Number(formData.get('radius_km')) || 25,
      center_latitude: Number(formData.get('center_latitude')) || 16.3067,
      center_longitude: Number(formData.get('center_longitude')) || 80.4365,
      is_active: true,
    };

    startTransition(async () => {
      await upsertServiceRegion(regionData);
      setRegionModal({ isOpen: false, data: null });
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Application Settings & Pilot Regions
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure matching dispatch heuristics, pilot operational regions, and multilingual service taxonomies.
        </p>
      </div>

      {/* Section 1: Core Platform Parameters */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Core Platform Parameters</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Governs fees, automatic dispatch timeout, and default mechanic search radius
            </p>
          </div>
          {saveSuccess && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 animate-in fade-in">
              <CheckCircle className="w-4 h-4" />
              Settings Saved!
            </span>
          )}
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Platform Fee (platform_fee_percent)
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <input
                  type="number"
                  step="0.1"
                  value={platformFeePercent}
                  onChange={(e) => setPlatformFeePercent(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Platform fee percentage (default 10%). Applied to new jobs only.
              </p>
              {getSettingObj('platform_fee_percent')?.updated_at && (
                <p className="text-[9px] text-emerald-700 mt-0.5 font-medium">
                  Updated: {formatDateTime(getSettingObj('platform_fee_percent')!.updated_at)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Visit Charge (visit_charge_amount)
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <input
                  type="number"
                  value={visitChargeAmount}
                  onChange={(e) => setVisitChargeAmount(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Technician visit & inspection fee (default ₹200).
              </p>
              {getSettingObj('visit_charge_amount')?.updated_at && (
                <p className="text-[9px] text-emerald-700 mt-0.5 font-medium">
                  Updated: {formatDateTime(getSettingObj('visit_charge_amount')!.updated_at)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Search Radius (Kilometers)
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <input
                  type="number"
                  value={serviceRadius}
                  onChange={(e) => setServiceRadius(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Radio className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Notification radius around farmer coordinates
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Offer Timeout (Seconds)
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <input
                  type="number"
                  value={assignmentTimeout}
                  onChange={(e) => setAssignmentTimeout(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                30s countdown before offering to next mechanic
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              isLoading={isPending}
              onClick={handleSaveSettings}
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              Save Platform Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Multilingual Problem Categories */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Multilingual Problem Categories (EN / TE / HI)</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Service taxonomies shown to farmers and mechanics in localized mobile apps
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCategoryModal({ isOpen: true, data: null })}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3">Order</th>
                  <th className="px-6 py-3">English (EN)</th>
                  <th className="px-6 py-3">Telugu (TE - తెలుగు)</th>
                  <th className="px-6 py-3">Hindi (HI - हिन्दी)</th>
                  <th className="px-6 py-3">Icon Key</th>
                  <th className="px-6 py-3">Est. Base Price</th>
                  <th className="px-6 py-3">Active</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat, idx) => (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-slate-400">
                      {cat.sort_order || idx + 1}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-900">
                      {cat.name_en}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-700">
                      {cat.name_te}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-700">
                      {cat.name_hi}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-500">
                      {cat.icon || 'wrench'}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      ₹{cat.base_price_estimate || 0}
                    </td>
                    <td className="px-6 py-3.5">
                      <button
                        onClick={() => {
                          startTransition(async () => {
                            await toggleProblemCategory(cat.id, !cat.is_active);
                            router.refresh();
                          });
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                          cat.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {cat.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setCategoryModal({ isOpen: true, data: cat })
                        }
                      >
                        <Edit className="w-3.5 h-3.5 text-slate-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Pilot Service Regions */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Service Regions & Geofencing</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Authorized operational deployment zones and service territories
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRegionModal({ isOpen: true, data: null })}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Pilot Region
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3">Region Name</th>
                  <th className="px-6 py-3">District & State</th>
                  <th className="px-6 py-3">Center Coordinates</th>
                  <th className="px-6 py-3">Operational Radius</th>
                  <th className="px-6 py-3">Pilot Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {regions.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-slate-900">
                      {reg.name}
                    </td>
                    <td className="px-6 py-3.5">
                      {reg.district}, {reg.state}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-[11px] text-slate-500">
                      {reg.center_latitude != null && reg.center_longitude != null
                        ? `${reg.center_latitude}, ${reg.center_longitude}`
                        : 'Dynamic / GPS based'}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-slate-800">
                      {reg.radius_km || 25} km
                    </td>
                    <td className="px-6 py-3.5">
                      <button
                        onClick={() => {
                          startTransition(async () => {
                            await toggleServiceRegion(reg.id, !reg.is_active);
                            router.refresh();
                          });
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                          reg.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {reg.is_active ? 'Live Pilot' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRegionModal({ isOpen: true, data: reg })}
                      >
                        <Edit className="w-3.5 h-3.5 text-slate-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Cancellation Governance & Risk Shield */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Cancellation Governance & User Control
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks repeated customer and mechanic cancellations. Block malicious or unresponsive users with 1 click.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer cancellations */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Top Cancelling Customers
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Cancellations</th>
                      <th className="px-3 py-2">Account</th>
                      <th className="px-3 py-2 text-right">Moderation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(cancellations?.customers || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-3 text-center text-slate-400">
                          No cancellations recorded
                        </td>
                      </tr>
                    ) : (
                      cancellations?.customers.map((c: any) => {
                        const isActive = c.profile?.is_active !== false;
                        return (
                          <tr key={c.id}>
                            <td className="px-3 py-2">
                              <p className="font-semibold text-slate-900">{c.profile?.full_name || 'Farmer'}</p>
                              <p className="text-[10px] text-slate-400">{c.profile?.phone || 'No phone'}</p>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                (c.cancellation_count || 0) >= 3
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {c.cancellation_count || 0}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`text-[10px] font-semibold ${
                                isActive ? 'text-emerald-700' : 'text-rose-600'
                              }`}>
                                {isActive ? 'Active' : 'Blocked'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              {c.profile?.id && (
                                <button
                                  onClick={() => handleToggleBlock(c.profile.id, isActive)}
                                  className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                                    isActive
                                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                  }`}
                                >
                                  {isActive ? 'Block' : 'Unblock'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mechanic cancellations */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Top Cancelling Mechanics
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-3 py-2">Mechanic</th>
                      <th className="px-3 py-2">Cancellations</th>
                      <th className="px-3 py-2">Account</th>
                      <th className="px-3 py-2 text-right">Moderation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(cancellations?.mechanics || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-3 text-center text-slate-400">
                          No cancellations recorded
                        </td>
                      </tr>
                    ) : (
                      cancellations?.mechanics.map((m: any) => {
                        const isActive = m.profile?.is_active !== false;
                        return (
                          <tr key={m.id}>
                            <td className="px-3 py-2">
                              <p className="font-semibold text-slate-900">{m.profile?.full_name || 'Mechanic'}</p>
                              <p className="text-[10px] text-slate-400">{m.profile?.phone || 'No phone'}</p>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                (m.cancellation_count || 0) >= 3
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {m.cancellation_count || 0}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`text-[10px] font-semibold ${
                                isActive ? 'text-emerald-700' : 'text-rose-600'
                              }`}>
                                {isActive ? 'Active' : 'Blocked'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              {m.profile?.id && (
                                <button
                                  onClick={() => handleToggleBlock(m.profile.id, isActive)}
                                  className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                                    isActive
                                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                  }`}
                                >
                                  {isActive ? 'Block' : 'Unblock'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Add/Edit Modal */}
      <Modal
        isOpen={categoryModal.isOpen}
        onClose={() => setCategoryModal({ isOpen: false, data: null })}
        title={categoryModal.data ? 'Edit Problem Category' : 'Add New Problem Category'}
        description="Provide multilingual names so farmers can browse in English, Telugu, or Hindi."
      >
        <form onSubmit={handleCategorySubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Category Name (English)
            </label>
            <input
              type="text"
              name="name_en"
              required
              defaultValue={categoryModal.data?.name_en || ''}
              placeholder="e.g. Steering & Suspension"
              className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Name in Telugu (తెలుగు)
              </label>
              <input
                type="text"
                name="name_te"
                required
                defaultValue={categoryModal.data?.name_te || ''}
                placeholder="తెలుగు పేరు"
                className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Name in Hindi (हिन्दी)
              </label>
              <input
                type="text"
                name="name_hi"
                required
                defaultValue={categoryModal.data?.name_hi || ''}
                placeholder="हिन्दी नाम"
                className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Icon Slug
              </label>
              <input
                type="text"
                name="icon"
                defaultValue={categoryModal.data?.icon || 'wrench'}
                placeholder="engine, tire, battery..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Est. Base Price (₹)
              </label>
              <input
                type="number"
                name="base_price_estimate"
                defaultValue={categoryModal.data?.base_price_estimate || 400}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Sort Order
              </label>
              <input
                type="number"
                name="sort_order"
                defaultValue={categoryModal.data?.sort_order || 1}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCategoryModal({ isOpen: false, data: null })}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isPending}>
              Save Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* Region Add/Edit Modal */}
      <Modal
        isOpen={regionModal.isOpen}
        onClose={() => setRegionModal({ isOpen: false, data: null })}
        title={regionModal.data ? 'Edit Pilot Region' : 'Add Pilot Service Region'}
        description="Designate a geographical pilot zone for mechanic match dispatch."
      >
        <form onSubmit={handleRegionSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Region Name
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={regionModal.data?.name || ''}
              placeholder="e.g. Central District Zone"
              className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                District
              </label>
              <input
                type="text"
                name="district"
                required
                defaultValue={regionModal.data?.district || ''}
                placeholder="District name"
                className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                State
              </label>
              <input
                type="text"
                name="state"
                required
                defaultValue={regionModal.data?.state || ''}
                placeholder="State name"
                className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Center Latitude
              </label>
              <input
                type="number"
                step="any"
                name="center_latitude"
                placeholder="e.g. 17.3850"
                defaultValue={regionModal.data?.center_latitude ?? ''}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Center Longitude
              </label>
              <input
                type="number"
                step="any"
                name="center_longitude"
                placeholder="e.g. 78.4867"
                defaultValue={regionModal.data?.center_longitude ?? ''}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Radius (KM)
              </label>
              <input
                type="number"
                name="radius_km"
                defaultValue={regionModal.data?.radius_km || 25}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRegionModal({ isOpen: false, data: null })}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isPending}>
              Save Region
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
