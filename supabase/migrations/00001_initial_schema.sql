-- =============================================================
-- Migration: 00001_initial_schema.sql
-- Description: Complete initial schema for Tractor Repair Marketplace
-- Tables: 29 tables with UUID PKs, PostGIS geography, constraints,
--         triggers, indexes, and Row Level Security enabled.
-- =============================================================

-- -------------------------------------------------------------
-- 1. EXTENSIONS
-- -------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- -------------------------------------------------------------
-- 2. ENUM TYPES
-- -------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('customer', 'mechanic', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.mechanic_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.job_status AS ENUM (
    'requested',
    'matching',
    'assigned',
    'mechanic_en_route',
    'arrived',
    'quote_submitted',
    'quote_approved',
    'quote_rejected',
    'quote_modified',
    'repair_in_progress',
    'repair_completed',
    'payment_pending',
    'payment_failed',
    'paid',
    'completed',
    'cancelled',
    'disputed',
    'no_mechanic_available'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('online', 'cash');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending', 'created', 'authorized', 'captured', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.quote_status AS ENUM ('pending', 'approved', 'rejected', 'modified');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.match_status AS ENUM ('notified', 'accepted', 'declined', 'timed_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.document_status AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.code_type AS ENUM ('start', 'finish');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM ('job_update', 'payment', 'system', 'promotion');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.settlement_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -------------------------------------------------------------
-- 3. TRIGGER FUNCTIONS
-- -------------------------------------------------------------

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to automatically generate geography point from lat/lng
CREATE OR REPLACE FUNCTION public.generate_location_point()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude::double precision, NEW.latitude::double precision), 4326)::geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------------
-- 4. TABLES DEFINITIONS
-- -------------------------------------------------------------

-- 1. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'customer',
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE,
  avatar_url TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'te', 'hi')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. customers
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  default_tractor_id UUID, -- circular FK to tractors added below
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. tractors
CREATE TABLE IF NOT EXISTS public.tractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER CHECK (year IS NULL OR (year >= 1950 AND year <= 2100)),
  registration_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add circular FK for customers.default_tractor_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_customers_default_tractor'
  ) THEN
    ALTER TABLE public.customers
      ADD CONSTRAINT fk_customers_default_tractor
      FOREIGN KEY (default_tractor_id) REFERENCES public.tractors(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. mechanics
CREATE TABLE IF NOT EXISTS public.mechanics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.mechanic_status NOT NULL DEFAULT 'pending',
  experience_years INTEGER NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
  workshop_address TEXT,
  service_radius_km NUMERIC(6,2) NOT NULL DEFAULT 25.00 CHECK (service_radius_km > 0),
  is_online BOOLEAN NOT NULL DEFAULT false,
  current_location geography(Point, 4326),
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (rating_avg >= 0.00 AND rating_avg <= 5.00),
  total_jobs INTEGER NOT NULL DEFAULT 0 CHECK (total_jobs >= 0),
  admin_notes TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. problem_categories
CREATE TABLE IF NOT EXISTS public.problem_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL UNIQUE,
  name_te TEXT NOT NULL,
  name_hi TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. mechanic_skills
CREATE TABLE IF NOT EXISTS public.mechanic_skills (
  mechanic_id UUID NOT NULL REFERENCES public.mechanics(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.problem_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (mechanic_id, category_id)
);

-- 7. mechanic_documents
CREATE TABLE IF NOT EXISTS public.mechanic_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID NOT NULL REFERENCES public.mechanics(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- e.g. 'aadhaar', 'pan', 'license', 'certificate'
  file_path TEXT NOT NULL,
  status public.document_status NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. repair_requests
CREATE TABLE IF NOT EXISTS public.repair_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  tractor_id UUID NOT NULL REFERENCES public.tractors(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES public.problem_categories(id) ON DELETE RESTRICT,
  description TEXT,
  voice_note_url TEXT,
  latitude NUMERIC(10,7) NOT NULL CHECK (latitude >= -90.0000000 AND latitude <= 90.0000000),
  longitude NUMERIC(10,7) NOT NULL CHECK (longitude >= -180.0000000 AND longitude <= 180.0000000),
  location geography(Point, 4326),
  address_text TEXT NOT NULL,
  status public.job_status NOT NULL DEFAULT 'requested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. request_media
CREATE TABLE IF NOT EXISTS public.request_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.repair_requests(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. mechanic_matches
CREATE TABLE IF NOT EXISTS public.mechanic_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.repair_requests(id) ON DELETE CASCADE,
  mechanic_id UUID NOT NULL REFERENCES public.mechanics(id) ON DELETE CASCADE,
  status public.match_status NOT NULL DEFAULT 'notified',
  distance_km NUMERIC(8,2) CHECK (distance_km IS NULL OR distance_km >= 0),
  notified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_mechanic_matches_request_mechanic UNIQUE (request_id, mechanic_id)
);

-- 11. jobs
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE REFERENCES public.repair_requests(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  mechanic_id UUID NOT NULL REFERENCES public.mechanics(id) ON DELETE RESTRICT,
  status public.job_status NOT NULL DEFAULT 'assigned',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  en_route_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  repair_started_at TIMESTAMPTZ,
  repair_completed_at TIMESTAMPTZ,
  payment_received_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. job_status_history
CREATE TABLE IF NOT EXISTS public.job_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  old_status public.job_status,
  new_status public.job_status NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. secure_codes
CREATE TABLE IF NOT EXISTS public.secure_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  code_type public.code_type NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. quotes
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.jobs(id) ON DELETE CASCADE,
  mechanic_id UUID NOT NULL REFERENCES public.mechanics(id) ON DELETE RESTRICT,
  visit_fee NUMERIC(12,2) NOT NULL CHECK (visit_fee >= 0),
  labor_cost NUMERIC(12,2) NOT NULL CHECK (labor_cost >= 0),
  parts_estimate NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (parts_estimate >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  mechanic_notes TEXT,
  status public.quote_status NOT NULL DEFAULT 'pending',
  customer_response_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. quote_line_items
CREATE TABLE IF NOT EXISTS public.quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.jobs(id) ON DELETE RESTRICT,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE RESTRICT,
  visit_charge NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (visit_charge >= 0),
  repair_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (repair_amount >= 0),
  parts_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (parts_amount >= 0),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
  platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (platform_fee >= 0),
  total NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. invoice_items
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  item_type TEXT NOT NULL CHECK (item_type IN ('visit', 'labor', 'part', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  method public.payment_method NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status public.payment_status NOT NULL DEFAULT 'pending',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. payment_events
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  razorpay_event_id TEXT UNIQUE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 20. platform_commissions
CREATE TABLE IF NOT EXISTS public.platform_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.jobs(id) ON DELETE RESTRICT,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  mechanic_id UUID NOT NULL REFERENCES public.mechanics(id) ON DELETE RESTRICT,
  commission_rate NUMERIC(5,2) NOT NULL CHECK (commission_rate >= 0.00 AND commission_rate <= 100.00),
  commission_amount NUMERIC(12,2) NOT NULL CHECK (commission_amount >= 0.00),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'waived', 'settled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 21. mechanic_balances
CREATE TABLE IF NOT EXISTS public.mechanic_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID NOT NULL UNIQUE REFERENCES public.mechanics(id) ON DELETE RESTRICT,
  total_earned NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_earned >= 0.00),
  total_commission_due NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_commission_due >= 0.00),
  total_settled NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_settled >= 0.00),
  balance_due NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 22. settlements
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mechanic_id UUID NOT NULL REFERENCES public.mechanics(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  settlement_status public.settlement_status NOT NULL DEFAULT 'pending',
  reference_id TEXT,
  notes TEXT,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 23. refunds
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason TEXT,
  razorpay_refund_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 24. reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.jobs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  mechanic_id UUID NOT NULL REFERENCES public.mechanics(id) ON DELETE RESTRICT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  tags TEXT[] DEFAULT '{}'::text[],
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 25. notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 26. support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 27. app_settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 28. service_regions
CREATE TABLE IF NOT EXISTS public.service_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  boundary geography(Polygon, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 29. audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- 5. INDEXES
-- -------------------------------------------------------------

-- mechanics indexes
CREATE INDEX IF NOT EXISTS idx_mechanics_current_location ON public.mechanics USING GIST (current_location);
CREATE INDEX IF NOT EXISTS idx_mechanics_status ON public.mechanics (status);
CREATE INDEX IF NOT EXISTS idx_mechanics_is_online ON public.mechanics (is_online);
CREATE INDEX IF NOT EXISTS idx_mechanics_profile_id ON public.mechanics (profile_id);

-- repair_requests indexes
CREATE INDEX IF NOT EXISTS idx_repair_requests_location ON public.repair_requests USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_repair_requests_status ON public.repair_requests (status);
CREATE INDEX IF NOT EXISTS idx_repair_requests_customer_id ON public.repair_requests (customer_id);
CREATE INDEX IF NOT EXISTS idx_repair_requests_created_at ON public.repair_requests (created_at DESC);

-- jobs indexes
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_mechanic_id ON public.jobs (mechanic_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON public.jobs (customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs (created_at DESC);

-- mechanic_matches indexes
CREATE INDEX IF NOT EXISTS idx_mechanic_matches_request_id ON public.mechanic_matches (request_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_matches_mechanic_id ON public.mechanic_matches (mechanic_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_matches_status ON public.mechanic_matches (status);

-- payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON public.payments (razorpay_order_id);

-- notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

-- audit_logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs (resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- secure_codes indexes (including partial unique index for active codes)
CREATE INDEX IF NOT EXISTS idx_secure_codes_job_code_type ON public.secure_codes (job_id, code_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_secure_codes_active_unique ON public.secure_codes (job_id, code_type) WHERE is_used = false;

-- service_regions boundary index
CREATE INDEX IF NOT EXISTS idx_service_regions_boundary ON public.service_regions USING GIST (boundary);

-- additional relational performance indexes
CREATE INDEX IF NOT EXISTS idx_customers_profile_id ON public.customers (profile_id);
CREATE INDEX IF NOT EXISTS idx_tractors_customer_id ON public.tractors (customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_job_id ON public.quotes (job_id);
CREATE INDEX IF NOT EXISTS idx_quotes_mechanic_id ON public.quotes (mechanic_id);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote_id ON public.quote_line_items (quote_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON public.invoices (job_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_mechanic_documents_mechanic_id ON public.mechanic_documents (mechanic_id);
CREATE INDEX IF NOT EXISTS idx_request_media_request_id ON public.request_media (request_id);
CREATE INDEX IF NOT EXISTS idx_job_status_history_job_id ON public.job_status_history (job_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_reporter_id ON public.support_tickets (reporter_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets (status);

-- -------------------------------------------------------------
-- 6. TRIGGERS
-- -------------------------------------------------------------

-- repair_requests location point trigger
DROP TRIGGER IF EXISTS trg_repair_requests_location ON public.repair_requests;
CREATE TRIGGER trg_repair_requests_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.repair_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_location_point();

-- updated_at triggers on all tables with updated_at column
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_tractors_updated_at ON public.tractors;
CREATE TRIGGER trg_tractors_updated_at
  BEFORE UPDATE ON public.tractors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_mechanics_updated_at ON public.mechanics;
CREATE TRIGGER trg_mechanics_updated_at
  BEFORE UPDATE ON public.mechanics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_repair_requests_updated_at ON public.repair_requests;
CREATE TRIGGER trg_repair_requests_updated_at
  BEFORE UPDATE ON public.repair_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_jobs_updated_at ON public.jobs;
CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_quotes_updated_at ON public.quotes;
CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_platform_commissions_updated_at ON public.platform_commissions;
CREATE TRIGGER trg_platform_commissions_updated_at
  BEFORE UPDATE ON public.platform_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_mechanic_balances_updated_at ON public.mechanic_balances;
CREATE TRIGGER trg_mechanic_balances_updated_at
  BEFORE UPDATE ON public.mechanic_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_settlements_updated_at ON public.settlements;
CREATE TRIGGER trg_settlements_updated_at
  BEFORE UPDATE ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_service_regions_updated_at ON public.service_regions;
CREATE TRIGGER trg_service_regions_updated_at
  BEFORE UPDATE ON public.service_regions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger to sync auth.users with public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.phone, 'User'),
    NEW.phone,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'customer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) THEN
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
  END IF;
END $$;

-- -------------------------------------------------------------
-- 7. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- -------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanic_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanic_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanic_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secure_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanic_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
