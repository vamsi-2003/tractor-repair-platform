-- =============================================================
-- File: supabase/tests/database.test.sql
-- Description: pgTAP database schema, extension, and trigger tests
-- =============================================================

BEGIN;

-- 1. Initialize Test Plan
SELECT plan(38);

-- 2. Verify Required Extensions
SELECT has_extension('uuid-ossp', 'Extension uuid-ossp must be installed');
SELECT has_extension('pgcrypto', 'Extension pgcrypto must be installed');
SELECT has_extension('postgis', 'Extension postgis must be installed');

-- 3. Verify Core Tables Exist
SELECT has_table('public', 'profiles', 'Table profiles must exist');
SELECT has_table('public', 'customers', 'Table customers must exist');
SELECT has_table('public', 'tractors', 'Table tractors must exist');
SELECT has_table('public', 'mechanics', 'Table mechanics must exist');
SELECT has_table('public', 'problem_categories', 'Table problem_categories must exist');
SELECT has_table('public', 'mechanic_skills', 'Table mechanic_skills must exist');
SELECT has_table('public', 'mechanic_documents', 'Table mechanic_documents must exist');
SELECT has_table('public', 'repair_requests', 'Table repair_requests must exist');
SELECT has_table('public', 'request_media', 'Table request_media must exist');
SELECT has_table('public', 'mechanic_matches', 'Table mechanic_matches must exist');
SELECT has_table('public', 'jobs', 'Table jobs must exist');
SELECT has_table('public', 'job_status_history', 'Table job_status_history must exist');
SELECT has_table('public', 'secure_codes', 'Table secure_codes must exist');
SELECT has_table('public', 'quotes', 'Table quotes must exist');
SELECT has_table('public', 'quote_line_items', 'Table quote_line_items must exist');
SELECT has_table('public', 'invoices', 'Table invoices must exist');
SELECT has_table('public', 'invoice_items', 'Table invoice_items must exist');
SELECT has_table('public', 'payments', 'Table payments must exist');
SELECT has_table('public', 'payment_events', 'Table payment_events must exist');
SELECT has_table('public', 'platform_commissions', 'Table platform_commissions must exist');
SELECT has_table('public', 'mechanic_balances', 'Table mechanic_balances must exist');
SELECT has_table('public', 'settlements', 'Table settlements must exist');
SELECT has_table('public', 'refunds', 'Table refunds must exist');
SELECT has_table('public', 'reviews', 'Table reviews must exist');
SELECT has_table('public', 'notifications', 'Table notifications must exist');
SELECT has_table('public', 'support_tickets', 'Table support_tickets must exist');
SELECT has_table('public', 'app_settings', 'Table app_settings must exist');
SELECT has_table('public', 'service_regions', 'Table service_regions must exist');
SELECT has_table('public', 'audit_logs', 'Table audit_logs must exist');

-- 4. Verify RLS is enabled on sensitive tables
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'secure_codes'),
  'RLS must be enabled on secure_codes table'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'jobs'),
  'RLS must be enabled on jobs table'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'payments'),
  'RLS must be enabled on payments table'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles'),
  'RLS must be enabled on profiles table'
);

-- 5. Verify Seed Data & Configuration Defaults
SELECT isnt_empty(
  'SELECT id FROM public.problem_categories WHERE name_en = ''Engine''',
  'Problem category Engine should be present'
);
SELECT is(
  (SELECT value FROM public.app_settings WHERE key = 'commission_rate'),
  '10.00',
  'Default commission rate must be 10.00%'
);

-- 6. Verify RPC Functions Exist
SELECT has_function('public', 'find_matching_mechanics', ARRAY['uuid'], 'find_matching_mechanics function must exist');
SELECT has_function('public', 'assign_job_atomic', ARRAY['uuid', 'uuid', 'text', 'text', 'timestamp with time zone'], 'assign_job_atomic function must exist');

-- 7. Finish Tests and Rollback cleanly
SELECT finish();
ROLLBACK;
