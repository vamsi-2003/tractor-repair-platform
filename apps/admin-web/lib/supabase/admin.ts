import { createClient } from '@supabase/supabase-js';

/**
 * Creates an administrative Supabase client using the SERVICE ROLE key.
 * Used exclusively on the server for sensitive administrative tasks:
 * - Generating private signed URLs for mechanic identity documents
 * - Bypassing RLS policies for admin audit trails and batch settlements
 * - Verifying and updating profiles directly
 */
export function createAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'http://127.0.0.1:54321';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
