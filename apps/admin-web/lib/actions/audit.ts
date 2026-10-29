'use server';

import { createAdminClient } from '../supabase/admin';

export async function getAuditLogs(options?: {
  action?: string;
  entityType?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const adminClient = createAdminClient();
  const page = options?.page || 1;
  const limit = options?.limit || 30;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = adminClient
    .from('audit_logs')
    .select(
      `
      *,
      user:profiles (
        id,
        full_name,
        role
      )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options?.action && options.action !== 'all') {
    query = query.ilike('action', `%${options.action}%`);
  }

  if (options?.entityType && options.entityType !== 'all') {
    query = query.ilike('entity_type', `%${options.entityType}%`);
  }

  if (options?.search) {
    const s = options.search.trim();
    query = query.or(
      `action.ilike.%${s}%,entity_type.ilike.%${s}%,entity_id.ilike.%${s}%,ip_address.ilike.%${s}%`
    );
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching audit logs:', error);
    return { logs: [], count: 0, error: error.message };
  }

  return { logs: data || [], count: count || 0 };
}
