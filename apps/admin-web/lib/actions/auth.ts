'use server';

import { createClient } from '../supabase/server';
import { createAdminClient } from '../supabase/admin';
import { redirect } from 'next/navigation';

export interface AuthResponse {
  success: boolean;
  error?: string;
}

export async function signInAdmin(
  prevState: AuthResponse | null,
  formData: FormData
): Promise<AuthResponse> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = (formData.get('redirectTo') as string) || '/';

  if (!email || !password) {
    return { success: false, error: 'Please provide both email and password.' };
  }

  const supabase = createClient();

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

  if (authError || !authData.user) {
    return {
      success: false,
      error: authError?.message || 'Invalid administrator credentials.',
    };
  }

  // Verify that the user has the 'admin' role in profiles
  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, role, is_active, full_name')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: 'Profile record not found. Access denied.',
    };
  }

  if (profile.role !== 'admin') {
    await supabase.auth.signOut();
    return {
      success: false,
      error: 'Access denied: Only platform administrators can sign in.',
    };
  }

  if (profile.is_active === false) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: 'Your administrator account has been deactivated.',
    };
  }

  // Audit log the successful sign-in
  try {
    await adminClient.from('audit_logs').insert({
      user_id: authData.user.id,
      action: 'admin_login_success',
      entity_type: 'auth',
      entity_id: authData.user.id,
      new_values: { email, signed_in_at: new Date().toISOString() },
    });
  } catch (err) {
    console.error('Failed to log admin login audit event:', err);
  }

  redirect(redirectTo);
}

export async function signOutAdmin(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function getCurrentAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return null;
  }

  return { user, profile };
}
