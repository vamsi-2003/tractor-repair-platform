'use server';

import { createAdminClient } from '../supabase/admin';
import { revalidatePath } from 'next/cache';

export async function getAppSettings() {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('app_settings')
    .select('*')
    .order('key');

  if (error) {
    console.error('Error fetching app settings:', error);
    return [];
  }

  return data || [];
}

export async function updateAppSetting(
  key: string,
  value: string,
  adminUserId?: string
) {
  const adminClient = createAdminClient();

  const { data: oldSetting } = await adminClient
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single();

  const { error } = await adminClient
    .from('app_settings')
    .update({
      value,
      updated_at: new Date().toISOString(),
      updated_by: adminUserId || null,
    })
    .eq('key', key);

  if (error) {
    return { success: false, error: error.message };
  }

  // Audit log
  try {
    await adminClient.from('audit_logs').insert({
      user_id: adminUserId || null,
      action: 'update_app_setting',
      entity_type: 'app_setting',
      entity_id: key,
      old_values: { value: oldSetting?.value },
      new_values: { value },
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }

  revalidatePath('/settings');
  return { success: true };
}

export async function getProblemCategories() {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('problem_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data || [];
}

export async function upsertProblemCategory(
  category: {
    id?: string;
    name_en: string;
    name_te: string;
    name_hi: string;
    icon?: string;
    sort_order?: number;
    base_price_estimate?: number;
    is_active?: boolean;
  },
  adminUserId?: string
) {
  const adminClient = createAdminClient();

  if (category.id) {
    const { error } = await adminClient
      .from('problem_categories')
      .update({
        name_en: category.name_en,
        name_te: category.name_te,
        name_hi: category.name_hi,
        icon: category.icon || 'wrench',
        sort_order: category.sort_order || 0,
        base_price_estimate: category.base_price_estimate || 0,
        is_active: category.is_active ?? true,
      })
      .eq('id', category.id);

    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await adminClient
      .from('problem_categories')
      .insert({
        name_en: category.name_en,
        name_te: category.name_te,
        name_hi: category.name_hi,
        icon: category.icon || 'wrench',
        sort_order: category.sort_order || 0,
        base_price_estimate: category.base_price_estimate || 0,
        is_active: category.is_active ?? true,
      });

    if (error) return { success: false, error: error.message };
  }

  // Audit log
  try {
    await adminClient.from('audit_logs').insert({
      user_id: adminUserId || null,
      action: category.id ? 'update_problem_category' : 'create_problem_category',
      entity_type: 'problem_category',
      entity_id: category.id || category.name_en,
      new_values: category,
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }

  revalidatePath('/settings');
  return { success: true };
}

export async function toggleProblemCategory(
  id: string,
  isActive: boolean,
  adminUserId?: string
) {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('problem_categories')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/settings');
  return { success: true };
}

export async function getServiceRegions() {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('service_regions')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching service regions:', error);
    return [];
  }

  return data || [];
}

export async function upsertServiceRegion(
  region: {
    id?: string;
    name: string;
    state: string;
    district: string;
    radius_km?: number;
    center_latitude?: number | null;
    center_longitude?: number | null;
    is_active?: boolean;
  },
  adminUserId?: string
) {
  const adminClient = createAdminClient();

  if (region.id) {
    const { error } = await adminClient
      .from('service_regions')
      .update({
        name: region.name,
        state: region.state,
        district: region.district,
        is_active: region.is_active ?? true,
        radius_km: region.radius_km || 25,
        center_latitude: region.center_latitude || null,
        center_longitude: region.center_longitude || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', region.id);

    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await adminClient
      .from('service_regions')
      .insert({
        name: region.name,
        state: region.state,
        district: region.district,
        is_active: region.is_active ?? true,
        radius_km: region.radius_km || 25,
        center_latitude: region.center_latitude || null,
        center_longitude: region.center_longitude || null,
      });

    if (error) return { success: false, error: error.message };
  }

  // Audit log
  try {
    await adminClient.from('audit_logs').insert({
      user_id: adminUserId || null,
      action: region.id ? 'update_service_region' : 'create_service_region',
      entity_type: 'service_region',
      entity_id: region.id || region.name,
      new_values: region,
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }

  revalidatePath('/settings');
  return { success: true };
}

export async function toggleServiceRegion(
  id: string,
  isActive: boolean,
  adminUserId?: string
) {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('service_regions')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/settings');
  return { success: true };
}

export async function getCancellationMetrics() {
  const adminClient = createAdminClient();

  const { data: customers } = await adminClient
    .from('customers')
    .select(
      `
      id,
      cancellation_count,
      profile:profiles (
        id,
        full_name,
        phone,
        is_active
      )
    `
    )
    .order('cancellation_count', { ascending: false })
    .limit(20);

  const { data: mechanics } = await adminClient
    .from('mechanics')
    .select(
      `
      id,
      cancellation_count,
      status,
      profile:profiles!mechanics_profile_id_fkey (
        id,
        full_name,
        phone,
        is_active
      )
    `
    )
    .order('cancellation_count', { ascending: false })
    .limit(20);

  return {
    customers: customers || [],
    mechanics: mechanics || [],
  };
}

export async function toggleUserBlockStatus(
  profileId: string,
  isActive: boolean,
  reason?: string,
  adminUserId?: string
) {
  const adminClient = createAdminClient();

  const { data: oldProfile } = await adminClient
    .from('profiles')
    .select('id, full_name, phone, role, is_active')
    .eq('id', profileId)
    .single();

  const { error } = await adminClient
    .from('profiles')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Audit log
  try {
    await adminClient.from('audit_logs').insert({
      user_id: adminUserId || null,
      action: isActive ? 'user_unblocked' : 'user_blocked',
      entity_type: 'profile',
      entity_id: profileId,
      old_values: { is_active: oldProfile?.is_active },
      new_values: { is_active: isActive, reason: reason || null },
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }

  revalidatePath('/settings');
  revalidatePath('/customers');
  revalidatePath('/mechanics');
  revalidatePath('/');
  return { success: true };
}
