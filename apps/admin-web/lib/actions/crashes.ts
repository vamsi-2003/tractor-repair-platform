'use server';

import { createAdminClient } from '../supabase/admin';

export interface CrashLogItem {
  id: string;
  user_id: string | null;
  role: string;
  error_message: string;
  stack_trace: string | null;
  component_stack: string | null;
  screen_name: string;
  app_version: string;
  device_info: Record<string, any>;
  severity: string;
  created_at: string;
}

export async function getCrashLogs(options?: {
  severity?: string;
  role?: string;
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
    .from('app_crash_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options?.severity && options.severity !== 'all') {
    query = query.eq('severity', options.severity);
  }

  if (options?.role && options.role !== 'all') {
    query = query.eq('role', options.role);
  }

  if (options?.search) {
    const s = options.search.trim();
    query = query.or(`error_message.ilike.%${s}%,screen_name.ilike.%${s}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching crash logs:', error);
    return { logs: [], count: 0 };
  }

  return { logs: (data as CrashLogItem[]) || [], count: count || 0 };
}
