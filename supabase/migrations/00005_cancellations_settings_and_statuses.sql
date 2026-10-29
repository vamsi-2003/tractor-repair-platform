-- =============================================================
-- Migration 00005: Add cancellation counts, voice notes, and app settings
-- =============================================================

-- 1. Add cancellation count to customers and mechanics
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS cancellation_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.mechanics
  ADD COLUMN IF NOT EXISTS cancellation_count INTEGER NOT NULL DEFAULT 0;

-- 2. Expand request_media types to include audio / voice_note
ALTER TABLE public.request_media
  DROP CONSTRAINT IF EXISTS request_media_media_type_check;

ALTER TABLE public.request_media
  ADD CONSTRAINT request_media_media_type_check
  CHECK (media_type IN ('photo', 'video', 'audio', 'voice_note'));

-- 3. Add job_status enum values if not present
DO $$
BEGIN
  ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'offered';
  ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'started';
  ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'quote_sent';
  ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'quote_declined';
  ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'bill_ready';
  ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'declined';
  ALTER TYPE public.job_status ADD VALUE IF NOT EXISTS 'no_mechanic_found';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 4. Ensure required app_settings are seeded
INSERT INTO public.app_settings (key, value, description)
VALUES
  ('platform_fee_percent', '10', 'Default platform fee percentage charged on repair jobs'),
  ('visit_charge_amount', '200', 'Default technician visit and inspection charge in INR'),
  ('max_mechanic_offers', '5', 'Maximum number of nearby mechanics to sequentially offer a job to'),
  ('offer_timeout_seconds', '30', 'Seconds a mechanic has to accept an incoming offer before offering to the next')
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description;
