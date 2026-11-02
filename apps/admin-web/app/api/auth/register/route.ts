import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://clkukpyeqphgeaiikaru.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, full_name, phone, role = 'customer' } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, full_name' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing' },
        { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const sbAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create user with email pre-confirmed so rate-limited GoTrue emails don't block registration
    const { data: created, error: createError } = await sbAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        phone: phone ? `+91${phone.replace(/\D/g, '').slice(-10)}` : null,
        role,
      },
    });

    if (createError) {
      // If user already exists, update their password so they can log in
      if (createError.message?.toLowerCase().includes('already registered')) {
        const { data: existingUsers } = await sbAdmin.auth.admin.listUsers();
        const user = existingUsers?.users?.find(
          (u) => u.email === email.trim().toLowerCase()
        );
        if (user) {
          await sbAdmin.auth.admin.updateUserById(user.id, {
            password,
            email_confirm: true,
          });
          return NextResponse.json(
            { message: 'User updated successfully', user },
            { headers: { 'Access-Control-Allow-Origin': '*' } }
          );
        }
      }

      return NextResponse.json(
        { error: createError.message },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const userId = created.user?.id;
    if (userId) {
      // Ensure profile and role records exist
      await sbAdmin.from('profiles').upsert({
        id: userId,
        role,
        full_name: full_name.trim(),
        phone: phone ? `+91${phone.replace(/\D/g, '').slice(-10)}` : null,
        is_active: true,
      });

      if (role === 'customer') {
        await sbAdmin.from('customers').upsert({ profile_id: userId }, { onConflict: 'profile_id' });
      } else {
        await sbAdmin.from('mechanics').upsert(
          {
            profile_id: userId,
            status: 'pending_approval',
            experience_years: 3,
            service_radius_km: 25,
            is_online: false,
          },
          { onConflict: 'profile_id' }
        );
      }
    }

    return NextResponse.json(
      { message: 'User created successfully', user: created.user },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
