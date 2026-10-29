'use server';

import { createAdminClient } from '../supabase/admin';

export async function getCustomers(options?: {
  search?: string;
  district?: string;
  page?: number;
  limit?: number;
}) {
  const adminClient = createAdminClient();
  const page = options?.page || 1;
  const limit = options?.limit || 25;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = adminClient
    .from('customers')
    .select(
      `
      *,
      profile:profiles!inner (
        id,
        full_name,
        phone,
        avatar_url,
        is_active,
        preferred_language,
        created_at
      ),
      tractors:tractors (
        id,
        make,
        model,
        year,
        registration_number,
        hours_run,
        fuel_type,
        horsepower
      ),
      jobs:jobs (
        id,
        status,
        created_at
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options?.district && options.district !== 'all') {
    query = query.ilike('district', `%${options.district}%`);
  }

  if (options?.search) {
    const s = options.search.trim();
    query = query.or(
      `profile.full_name.ilike.%${s}%,profile.phone.ilike.%${s}%,village.ilike.%${s}%,mandal.ilike.%${s}%,district.ilike.%${s}%`
    );
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching customers:', error);
    return { customers: [], count: 0, error: error.message };
  }

  return { customers: data || [], count: count || 0 };
}

export async function getCustomerById(id: string) {
  const adminClient = createAdminClient();

  const { data: customer, error } = await adminClient
    .from('customers')
    .select(
      `
      *,
      profile:profiles (
        id,
        full_name,
        phone,
        avatar_url,
        is_active,
        preferred_language,
        created_at
      ),
      tractors:tractors (
        id,
        make,
        model,
        year,
        registration_number,
        hours_run,
        fuel_type,
        horsepower,
        created_at
      ),
      jobs:jobs (
        id,
        status,
        created_at,
        completed_at,
        mechanic:mechanics (
          id,
          profile:profiles (full_name, phone)
        ),
        request:repair_requests (
          description,
          category:problem_categories (name_en)
        )
      )
    `
    )
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching customer details:', error);
    return null;
  }

  return customer;
}
