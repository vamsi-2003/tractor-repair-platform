'use server';

import { createAdminClient } from '../supabase/admin';

export async function getDashboardOverviewMetrics() {
  const adminClient = createAdminClient();

  // 1. Fetch mechanics counts
  const { data: mechanics } = await adminClient
    .from('mechanics')
    .select('id, status, is_online');

  const totalMechanics = mechanics?.length || 0;
  const onlineMechanics = (mechanics || []).filter(
    (m) => m.is_online === true || m.status === 'approved'
  ).length;
  const pendingApprovals = (mechanics || []).filter(
    (m) => m.status === 'pending'
  ).length;

  // 2. Fetch jobs counts
  const { data: jobs } = await adminClient
    .from('jobs')
    .select('id, status, created_at');

  const totalJobs = jobs?.length || 0;
  const activeJobs = (jobs || []).filter((j) =>
    [
      'requested',
      'matching',
      'assigned',
      'accepted',
      'mechanic_en_route',
      'en_route',
      'arrived',
      'quote_submitted',
      'quote_approved',
      'repair_in_progress',
      'in_progress',
      'payment_pending',
    ].includes(j.status)
  ).length;
  const completedJobs = (jobs || []).filter(
    (j) => j.status === 'completed' || j.status === 'paid'
  ).length;

  // 3. Fetch financial metrics (real paid invoices only)
  const { data: invoices } = await adminClient
    .from('invoices')
    .select('total, platform_fee, status, created_at');

  const paidInvoices = (invoices || []).filter((inv) => inv.status === 'paid');
  const totalRevenue = paidInvoices.reduce(
    (sum, inv) => sum + (Number(inv.total) || 0),
    0
  );
  const totalCommission = paidInvoices.reduce(
    (sum, inv) => sum + (Number(inv.platform_fee) || 0),
    0
  );

  // 4. Fetch tickets / disputes
  const { data: tickets } = await adminClient
    .from('support_tickets')
    .select('id, status, priority');

  const activeDisputes = (tickets || []).filter(
    (t) => t.status === 'open' || t.status === 'in_progress'
  ).length;

  // 5. Fetch customers count
  const { count: customersCount } = await adminClient
    .from('customers')
    .select('id', { count: 'exact', head: true });

  // 6. Recent 5 jobs with customer and mechanic names
  const { data: recentJobs } = await adminClient
    .from('jobs')
    .select(
      `
      id,
      status,
      created_at,
      customer:customers (
        id,
        profile:profiles (full_name, phone)
      ),
      mechanic:mechanics (
        id,
        profile:profiles!mechanics_profile_id_fkey (full_name)
      ),
      request:repair_requests (
        id,
        description,
        category:problem_categories (name_en),
        tractor:tractors (make, model)
      ),
      invoice:invoices (total)
    `
    )
    .order('created_at', { ascending: false })
    .limit(6);

  // 7. Recent pending mechanic applications
  const { data: pendingMechanics } = await adminClient
    .from('mechanics')
    .select(
      `
      id,
      status,
      experience_years,
      workshop_address,
      created_at,
      profile:profiles!mechanics_profile_id_fkey (full_name, phone)
    `
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    kpis: {
      activeJobs,
      totalJobs,
      completedJobs,
      totalRevenue,
      totalCommission,
      onlineMechanics,
      totalMechanics,
      pendingApprovals,
      activeDisputes,
      totalCustomers: customersCount || 0,
    },
    recentJobs: recentJobs || [],
    pendingMechanics: pendingMechanics || [],
  };
}
