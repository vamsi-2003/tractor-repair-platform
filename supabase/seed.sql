-- =============================================================
-- File: supabase/seed.sql
-- Description: Local development fixtures
--              Creates test admin, test customer with tractor,
--              and test approved mechanic with skills & documents.
-- NOTE: Intended for local development and testing only.
-- =============================================================

DO $$
DECLARE
  v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
  v_customer_id UUID := '00000000-0000-0000-0000-000000000002';
  v_mechanic_id UUID := '00000000-0000-0000-0000-000000000003';

  v_customer_record_id UUID := 'a1000000-0000-0000-0000-000000000001';
  v_tractor_record_id UUID := 'b1000000-0000-0000-0000-000000000001';
  v_mechanic_record_id UUID := 'd2000000-0000-0000-0000-000000000001';

  v_pwd_hash TEXT := crypt('password123', gen_salt('bf'));
BEGIN
  -- -----------------------------------------------------------
  -- 1. AUTH USERS (if auth schema exists in local Supabase)
  -- -----------------------------------------------------------
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    -- Admin Auth User
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      phone, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'admin@tractorapp.com',
      v_pwd_hash,
      now(),
      '+919999900001',
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Admin Vikram Patel","role":"admin"}',
      now(),
      now()
    ) ON CONFLICT (id) DO UPDATE SET
      encrypted_password = EXCLUDED.encrypted_password,
      raw_user_meta_data = EXCLUDED.raw_user_meta_data;

    -- Customer Auth User
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      phone, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      v_customer_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'customer@tractorapp.com',
      v_pwd_hash,
      now(),
      '+919999900002',
      now(),
      '{"provider":"phone","providers":["phone"]}',
      '{"full_name":"Ramesh Babu (Farmer)","role":"customer"}',
      now(),
      now()
    ) ON CONFLICT (id) DO UPDATE SET
      encrypted_password = EXCLUDED.encrypted_password,
      raw_user_meta_data = EXCLUDED.raw_user_meta_data;

    -- Mechanic Auth User
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      phone, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      v_mechanic_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'mechanic@tractorapp.com',
      v_pwd_hash,
      now(),
      '+919999900003',
      now(),
      '{"provider":"phone","providers":["phone"]}',
      '{"full_name":"Srinivas Rao (Mechanic)","role":"mechanic"}',
      now(),
      now()
    ) ON CONFLICT (id) DO UPDATE SET
      encrypted_password = EXCLUDED.encrypted_password,
      raw_user_meta_data = EXCLUDED.raw_user_meta_data;
  END IF;

  -- -----------------------------------------------------------
  -- 2. PUBLIC PROFILES
  -- -----------------------------------------------------------
  INSERT INTO public.profiles (id, role, full_name, phone, avatar_url, preferred_language, is_active)
  VALUES
    (
      v_admin_id,
      'admin',
      'Admin Vikram Patel',
      '+919999900001',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      'en',
      true
    ),
    (
      v_customer_id,
      'customer',
      'Ramesh Babu (Farmer)',
      '+919999900002',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
      'te',
      true
    ),
    (
      v_mechanic_id,
      'mechanic',
      'Srinivas Rao (Mechanic)',
      '+919999900003',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
      'te',
      true
    )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    avatar_url = EXCLUDED.avatar_url,
    preferred_language = EXCLUDED.preferred_language,
    is_active = EXCLUDED.is_active;

  -- -----------------------------------------------------------
  -- 3. CUSTOMER RECORD & TRACTOR
  -- -----------------------------------------------------------
  INSERT INTO public.customers (id, profile_id, default_tractor_id)
  VALUES (v_customer_record_id, v_customer_id, NULL)
  ON CONFLICT (profile_id) DO NOTHING;

  INSERT INTO public.tractors (id, customer_id, make, model, year, registration_number)
  VALUES (
    v_tractor_record_id,
    v_customer_record_id,
    'Mahindra',
    '575 DI Sarpanch',
    2021,
    'AP 07 TX 4589'
  )
  ON CONFLICT (id) DO UPDATE SET
    make = EXCLUDED.make,
    model = EXCLUDED.model,
    year = EXCLUDED.year,
    registration_number = EXCLUDED.registration_number;

  UPDATE public.customers
  SET default_tractor_id = v_tractor_record_id
  WHERE id = v_customer_record_id;

  -- -----------------------------------------------------------
  -- 4. MECHANIC RECORD, SKILLS & DOCUMENTS
  -- -----------------------------------------------------------
  INSERT INTO public.mechanics (
    id,
    profile_id,
    status,
    experience_years,
    workshop_address,
    service_radius_km,
    is_online,
    current_location,
    rating_avg,
    total_jobs,
    admin_notes,
    approved_at,
    approved_by
  )
  VALUES (
    v_mechanic_record_id,
    v_mechanic_id,
    'approved',
    10,
    'Opposite Old Market Yard, Tenali Road, Guntur, Andhra Pradesh 522001',
    30.00,
    true,
    ST_SetSRID(ST_MakePoint(80.4365, 16.3067), 4326)::geography, -- Guntur coordinates
    4.85,
    38,
    'Verified mechanic with over 10 years of tractor repair experience in Guntur district.',
    now(),
    v_admin_id
  )
  ON CONFLICT (profile_id) DO UPDATE SET
    status = EXCLUDED.status,
    experience_years = EXCLUDED.experience_years,
    workshop_address = EXCLUDED.workshop_address,
    service_radius_km = EXCLUDED.service_radius_km,
    is_online = EXCLUDED.is_online,
    current_location = EXCLUDED.current_location,
    rating_avg = EXCLUDED.rating_avg,
    total_jobs = EXCLUDED.total_jobs,
    admin_notes = EXCLUDED.admin_notes,
    approved_at = EXCLUDED.approved_at,
    approved_by = EXCLUDED.approved_by;

  -- Mechanic Skills: Engine, Hydraulics, Clutch/Gearbox
  INSERT INTO public.mechanic_skills (mechanic_id, category_id)
  VALUES
    (v_mechanic_record_id, 'c1000000-0000-0000-0000-000000000001'), -- Engine
    (v_mechanic_record_id, 'c1000000-0000-0000-0000-000000000002'), -- Hydraulics
    (v_mechanic_record_id, 'c1000000-0000-0000-0000-000000000003')  -- Clutch / Gearbox
  ON CONFLICT (mechanic_id, category_id) DO NOTHING;

  -- Mechanic Documents: Aadhaar & Certificate (Verified)
  INSERT INTO public.mechanic_documents (
    id,
    mechanic_id,
    document_type,
    file_path,
    status,
    verified_by,
    verified_at,
    rejection_reason
  )
  VALUES
    (
      'd1000000-0000-0000-0000-000000000001',
      v_mechanic_record_id,
      'aadhaar',
      'documents/m1/aadhaar_verified.pdf',
      'verified',
      v_admin_id,
      now(),
      NULL
    ),
    (
      'd1000000-0000-0000-0000-000000000002',
      v_mechanic_record_id,
      'workshop_license',
      'documents/m1/workshop_cert.pdf',
      'verified',
      v_admin_id,
      now(),
      NULL
    )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    verified_by = EXCLUDED.verified_by,
    verified_at = EXCLUDED.verified_at;

  -- Initial Mechanic Balance
  INSERT INTO public.mechanic_balances (
    id,
    mechanic_id,
    total_earned,
    total_commission_due,
    total_settled,
    balance_due
  )
  VALUES (
    'b2000000-0000-0000-0000-000000000001',
    v_mechanic_record_id,
    45000.00,
    4500.00,
    35000.00,
    5500.00
  )
  ON CONFLICT (mechanic_id) DO UPDATE SET
    total_earned = EXCLUDED.total_earned,
    total_commission_due = EXCLUDED.total_commission_due,
    total_settled = EXCLUDED.total_settled,
    balance_due = EXCLUDED.balance_due;

END $$;
