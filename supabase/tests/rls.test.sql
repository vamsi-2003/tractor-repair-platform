-- =============================================================
-- File: supabase/tests/rls.test.sql
-- Description: pgTAP test suite verifying Row Level Security (RLS)
--              rules, least-privilege role boundaries, and edge cases.
-- =============================================================

BEGIN;

-- 1. Initialize Test Plan
SELECT plan(18);

-- Helper fixture variables for testing:
-- Customer 1 (Ramesh Babu): profile '00000000-0000-0000-0000-000000000002'
-- Mechanic 1 (Srinivas Rao): profile '00000000-0000-0000-0000-000000000003'
-- Admin (Vikram Patel): profile '00000000-0000-0000-0000-000000000001'

-- Create test customer 2 for cross-user isolation testing
DO $$
DECLARE
  v_cust2_profile_id UUID := '00000000-0000-0000-0000-000000000022';
  v_cust2_rec_id UUID := 'a1000000-0000-0000-0000-000000000022';
  v_tractor2_id UUID := 'b1000000-0000-0000-0000-000000000022';
BEGIN
  INSERT INTO public.profiles (id, role, full_name, phone, preferred_language)
  VALUES (v_cust2_profile_id, 'customer', 'Test Customer 2', '+919999900022', 'en')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.customers (id, profile_id)
  VALUES (v_cust2_rec_id, v_cust2_profile_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.tractors (id, customer_id, make, model, year)
  VALUES (v_tractor2_id, v_cust2_rec_id, 'John Deere', '5050D', 2022)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- -------------------------------------------------------------
-- TEST SUITE 1: ANONYMOUS ACCESS RESTRICTIONS
-- -------------------------------------------------------------
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claims" = '';

-- Anonymous user cannot read profiles
SELECT is_empty(
  'SELECT id FROM public.profiles',
  'Anonymous user should not be able to read any profiles'
);

-- Anonymous user cannot read customer tractors
SELECT is_empty(
  'SELECT id FROM public.tractors',
  'Anonymous user should not be able to read any customer tractors'
);

-- Anonymous user cannot read repair requests
SELECT is_empty(
  'SELECT id FROM public.repair_requests',
  'Anonymous user should not be able to read repair requests'
);

-- Anonymous user CAN read approved mechanics (public directory)
SELECT isnt_empty(
  'SELECT id FROM public.mechanics WHERE status = ''approved''',
  'Anonymous user should be able to read approved mechanics directory'
);

-- Anonymous user CAN read active problem categories
SELECT isnt_empty(
  'SELECT id FROM public.problem_categories WHERE is_active = true',
  'Anonymous user can view problem categories list'
);

-- Anonymous user CANNOT read secure_codes
SELECT is_empty(
  'SELECT id FROM public.secure_codes',
  'Anonymous user must have zero access to secure_codes'
);

-- -------------------------------------------------------------
-- TEST SUITE 2: CUSTOMER 1 ACCESS & CROSS-USER ISOLATION
-- -------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000002", "role": "authenticated"}';

-- Customer 1 can read own profile
SELECT is(
  (SELECT full_name FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000002'),
  'Ramesh Babu (Farmer)',
  'Customer 1 should be able to read their own profile'
);

-- Customer 1 CANNOT read Customer 2 profile
SELECT is_empty(
  'SELECT id FROM public.profiles WHERE id = ''00000000-0000-0000-0000-000000000022''',
  'Customer 1 cannot read Customer 2 profile'
);

-- Customer 1 can read own tractor
SELECT is(
  (SELECT make FROM public.tractors WHERE customer_id = 'a1000000-0000-0000-0000-000000000001'),
  'Mahindra',
  'Customer 1 can read their own tractor'
);

-- Customer 1 CANNOT read Customer 2 tractor
SELECT is_empty(
  'SELECT id FROM public.tractors WHERE customer_id = ''a1000000-0000-0000-0000-000000000022''',
  'Customer 1 cannot read Customer 2 tractor'
);

-- Customer 1 CANNOT read secure_codes directly (even for their own jobs)
SELECT is_empty(
  'SELECT id FROM public.secure_codes',
  'Authenticated customer cannot directly query secure_codes table (must use Edge Function)'
);

-- Customer 1 CANNOT read audit logs
SELECT is_empty(
  'SELECT id FROM public.audit_logs',
  'Customer cannot view audit logs'
);

-- Customer 1 CAN read app settings
SELECT isnt_empty(
  'SELECT key FROM public.app_settings',
  'Customer can read public app settings'
);

-- Customer 1 CANNOT modify app settings
SELECT throws_ok(
  'UPDATE public.app_settings SET value = ''20.00'' WHERE key = ''commission_rate''',
  NULL,
  'Customer cannot update app settings'
);

-- -------------------------------------------------------------
-- TEST SUITE 3: MECHANIC ACCESS RESTRICTIONS
-- -------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000003", "role": "authenticated"}';

-- Mechanic can read own profile
SELECT is(
  (SELECT full_name FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000003'),
  'Srinivas Rao (Mechanic)',
  'Mechanic can read own profile'
);

-- Mechanic CANNOT read secure_codes directly
SELECT is_empty(
  'SELECT id FROM public.secure_codes',
  'Mechanic cannot query secure_codes directly (must verify via Edge Function)'
);

-- Mechanic CANNOT read audit logs
SELECT is_empty(
  'SELECT id FROM public.audit_logs',
  'Mechanic cannot view audit logs'
);

-- -------------------------------------------------------------
-- TEST SUITE 4: ADMIN ACCESS PRIVILEGES
-- -------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';

-- Admin can read all profiles
SELECT is(
  (SELECT COUNT(*)::integer >= 3 FROM public.profiles),
  true,
  'Admin should be able to read all user profiles'
);

SELECT finish();
ROLLBACK;
