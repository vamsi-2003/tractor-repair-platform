-- =============================================================
-- Migration: 00008_realtime_and_status_transitions.sql
-- Description: 
--   1. Realtime replication publication for jobs, quotes, repair_requests
--   2. Atomic RPC submit_job_quote (with genuine mechanic_id and valid quote_status)
--   3. Atomic RPC respond_to_quote (transitions quote and job status atomically)
--   4. Explicit UPDATE RLS policies on public.jobs and public.repair_requests
-- =============================================================

-- -------------------------------------------------------------
-- 1. REALTIME PUBLICATION REPLICATION
-- -------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'quotes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'repair_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.repair_requests;
  END IF;
END $$;

ALTER TABLE public.jobs REPLICA IDENTITY FULL;
ALTER TABLE public.quotes REPLICA IDENTITY FULL;
ALTER TABLE public.repair_requests REPLICA IDENTITY FULL;

-- -------------------------------------------------------------
-- 2. ATOMIC RPC: SUBMIT JOB QUOTE
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_job_quote(
  p_job_id UUID,
  p_labor_cost NUMERIC,
  p_parts_estimate NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_quote_id UUID;
  v_visit_charge NUMERIC := 200;
  v_total NUMERIC;
BEGIN
  -- Verify job
  SELECT * INTO v_job
  FROM public.jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found', p_job_id;
  END IF;

  -- Read visit_charge_amount from app_settings
  SELECT COALESCE(value::numeric, 200) INTO v_visit_charge
  FROM public.app_settings
  WHERE key = 'visit_charge_amount';

  v_total := v_visit_charge + COALESCE(p_labor_cost, 0) + COALESCE(p_parts_estimate, 0);

  -- Upsert quote with valid quote_status 'pending' and genuine mechanic_id
  INSERT INTO public.quotes (
    job_id,
    mechanic_id,
    visit_fee,
    labor_cost,
    parts_estimate,
    total,
    mechanic_notes,
    status,
    updated_at
  ) VALUES (
    p_job_id,
    v_job.mechanic_id,
    v_visit_charge,
    COALESCE(p_labor_cost, 0),
    COALESCE(p_parts_estimate, 0),
    v_total,
    p_notes,
    'pending',
    now()
  )
  ON CONFLICT (job_id) DO UPDATE SET
    visit_fee = v_visit_charge,
    labor_cost = EXCLUDED.labor_cost,
    parts_estimate = EXCLUDED.parts_estimate,
    total = v_total,
    mechanic_notes = EXCLUDED.mechanic_notes,
    status = 'pending',
    updated_at = now()
  RETURNING id INTO v_quote_id;

  -- Advance job status to 'quote_submitted'
  UPDATE public.jobs
  SET status = 'quote_submitted',
      updated_at = now()
  WHERE id = p_job_id;

  -- Record status history
  INSERT INTO public.job_status_history (job_id, old_status, new_status, notes)
  VALUES (
    p_job_id,
    v_job.status,
    'quote_submitted',
    'Mechanic submitted quote: Visit ₹' || v_visit_charge || ' + Labor ₹' || COALESCE(p_labor_cost, 0) || ' + Parts ₹' || COALESCE(p_parts_estimate, 0) || ' = Total ₹' || v_total
  );

  RETURN jsonb_build_object(
    'success', true,
    'quote_id', v_quote_id,
    'job_id', p_job_id,
    'status', 'quote_submitted',
    'visit_fee', v_visit_charge,
    'labor_cost', p_labor_cost,
    'parts_estimate', COALESCE(p_parts_estimate, 0),
    'total', v_total
  );
END;
$$;

-- -------------------------------------------------------------
-- 3. ATOMIC RPC: RESPOND TO QUOTE
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.respond_to_quote(
  p_job_id UUID,
  p_quote_id UUID,
  p_approved BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_quote RECORD;
  v_new_job_status public.job_status;
  v_new_quote_status public.quote_status;
BEGIN
  -- Verify job
  SELECT * INTO v_job
  FROM public.jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found', p_job_id;
  END IF;

  -- Verify quote
  SELECT * INTO v_quote
  FROM public.quotes
  WHERE (id = p_quote_id OR job_id = p_job_id)
  ORDER BY (id = p_quote_id) DESC, created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found for job %', p_job_id;
  END IF;

  IF p_approved THEN
    v_new_job_status := 'quote_approved';
    v_new_quote_status := 'approved';
  ELSE
    v_new_job_status := 'quote_declined';
    v_new_quote_status := 'rejected';
  END IF;

  -- Update quote
  UPDATE public.quotes
  SET status = v_new_quote_status,
      customer_response_at = now(),
      updated_at = now()
  WHERE id = v_quote.id;

  -- Update job status
  UPDATE public.jobs
  SET status = v_new_job_status,
      updated_at = now()
  WHERE id = p_job_id;

  -- Record status history
  INSERT INTO public.job_status_history (job_id, old_status, new_status, notes)
  VALUES (
    p_job_id,
    v_job.status,
    v_new_job_status,
    CASE WHEN p_approved THEN 'Customer approved repair quote' ELSE 'Customer declined repair quote' END
  );

  RETURN jsonb_build_object(
    'success', true,
    'job_id', p_job_id,
    'quote_id', v_quote.id,
    'status', v_new_job_status::text,
    'quote_status', v_new_quote_status::text
  );
END;
$$;

-- -------------------------------------------------------------
-- 4. FUNCTION GRANTS
-- -------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.submit_job_quote(UUID, NUMERIC, NUMERIC, TEXT) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_quote(UUID, UUID, BOOLEAN) TO authenticated, service_role, anon;

-- -------------------------------------------------------------
-- 4B. ATOMIC RPC: GET OR CREATE FINISH CODE
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_finish_code(
  p_job_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code RECORD;
  v_new_code TEXT;
  v_job RECORD;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found', p_job_id;
  END IF;

  SELECT * INTO v_code
  FROM public.secure_codes
  WHERE job_id = p_job_id AND code_type = 'finish';

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'code', v_code.code,
      'is_used', v_code.is_used
    );
  END IF;

  v_new_code := (FLOOR(100000 + RANDOM() * 900000))::TEXT;

  INSERT INTO public.secure_codes (
    job_id,
    code_type,
    code,
    code_hash,
    expires_at,
    max_attempts,
    attempts,
    is_used
  ) VALUES (
    p_job_id,
    'finish',
    v_new_code,
    v_new_code,
    now() + INTERVAL '24 hours',
    5,
    0,
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'code', v_new_code,
    'is_used', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_finish_code(UUID) TO authenticated, service_role, anon;

-- -------------------------------------------------------------
-- 4C. COMPLETE JOB CASH WITH APP_SETTINGS FEE CALCULATION RPC
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_job_cash_server(
  p_job_id UUID,
  p_spare_parts_amount NUMERIC DEFAULT 0,
  p_finish_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_quote RECORD;
  v_code RECORD;
  v_visit_charge NUMERIC := 200;
  v_platform_percent NUMERIC := 10;
  v_labor_charge NUMERIC := 0;
  v_parts_total NUMERIC := COALESCE(p_spare_parts_amount, 0);
  v_grand_total NUMERIC;
  v_platform_fee NUMERIC;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found', p_job_id;
  END IF;

  -- 1. Verify finish code
  IF p_finish_code IS NOT NULL AND TRIM(p_finish_code) != '' THEN
    SELECT * INTO v_code
    FROM public.secure_codes
    WHERE job_id = p_job_id AND code_type = 'finish';

    IF FOUND THEN
      IF TRIM(v_code.code) != TRIM(p_finish_code) THEN
        RAISE EXCEPTION 'Invalid Finish Code provided';
      END IF;

      UPDATE public.secure_codes
      SET is_used = true, used_at = now()
      WHERE id = v_code.id;
    END IF;
  END IF;

  -- 2. Read quote details
  SELECT * INTO v_quote FROM public.quotes WHERE job_id = p_job_id ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN
    v_visit_charge := COALESCE(v_quote.visit_fee, 200);
    v_labor_charge := COALESCE(v_quote.labor_cost, 0);
    IF v_parts_total = 0 AND COALESCE(v_quote.parts_estimate, 0) > 0 THEN
      v_parts_total := v_quote.parts_estimate;
    END IF;
  ELSE
    SELECT COALESCE(value::numeric, 200) INTO v_visit_charge FROM public.app_settings WHERE key = 'visit_charge_amount';
  END IF;

  -- 3. Read platform_fee_percent from app_settings
  SELECT COALESCE(value::numeric, 10) INTO v_platform_percent
  FROM public.app_settings
  WHERE key = 'platform_fee_percent';

  -- 4. Calculate total and platform fee server-side
  v_grand_total := v_visit_charge + v_labor_charge + v_parts_total;
  v_platform_fee := ROUND(v_grand_total * (v_platform_percent / 100.0), 2);

  -- 5. Upsert Invoice
  INSERT INTO public.invoices (
    job_id,
    quote_id,
    visit_charge,
    repair_amount,
    parts_amount,
    subtotal,
    platform_fee,
    total,
    status
  ) VALUES (
    p_job_id,
    v_quote.id,
    v_visit_charge,
    v_labor_charge,
    v_parts_total,
    v_grand_total,
    v_platform_fee,
    v_grand_total,
    'paid'
  )
  ON CONFLICT (job_id) DO UPDATE SET
    visit_charge = v_visit_charge,
    repair_amount = v_labor_charge,
    parts_amount = v_parts_total,
    subtotal = v_grand_total,
    platform_fee = v_platform_fee,
    total = v_grand_total,
    status = 'paid',
    updated_at = now();

  -- 6. Transition job status to completed
  UPDATE public.jobs
  SET status = 'completed',
      completed_at = now(),
      repair_completed_at = now(),
      updated_at = now()
  WHERE id = p_job_id;

  -- 7. Record status history
  INSERT INTO public.job_status_history (job_id, old_status, new_status, notes)
  VALUES (p_job_id, v_job.status, 'completed', 'Job marked completed. Total ₹' || v_grand_total || ' collected in cash. Commission ₹' || v_platform_fee);

  -- 8. Record completed cash payment (using valid enum value 'captured' for payment_status)
  INSERT INTO public.payments (
    invoice_id,
    method,
    amount,
    status,
    paid_at
  )
  SELECT id, 'cash', v_grand_total, 'captured', now()
  FROM public.invoices
  WHERE job_id = p_job_id;

  -- 9. Update repair_requests to completed
  IF v_job.request_id IS NOT NULL THEN
    UPDATE public.repair_requests
    SET status = 'completed',
        updated_at = now()
    WHERE id = v_job.request_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'completed',
    'total', v_grand_total,
    'platform_fee', v_platform_fee,
    'mechanic_net', (v_grand_total - v_platform_fee)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_job_cash_server(UUID, NUMERIC, TEXT) TO authenticated, service_role, anon;

-- -------------------------------------------------------------
-- 5. RLS POLICIES FOR JOBS AND REPAIR REQUESTS
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can update assigned jobs" ON public.jobs;
CREATE POLICY "Customers can update assigned jobs"
  ON public.jobs FOR UPDATE
  USING (customer_id = public.get_customer_id(auth.uid()))
  WITH CHECK (customer_id = public.get_customer_id(auth.uid()));

DROP POLICY IF EXISTS "Mechanics can update assigned jobs" ON public.jobs;
CREATE POLICY "Mechanics can update assigned jobs"
  ON public.jobs FOR UPDATE
  USING (mechanic_id = public.get_mechanic_id(auth.uid()))
  WITH CHECK (mechanic_id = public.get_mechanic_id(auth.uid()));

DROP POLICY IF EXISTS "Mechanics can insert jobs for accepted requests" ON public.jobs;
CREATE POLICY "Mechanics can insert jobs for accepted requests"
  ON public.jobs FOR INSERT
  WITH CHECK (mechanic_id = public.get_mechanic_id(auth.uid()));

DROP POLICY IF EXISTS "Mechanics can update matched requests" ON public.repair_requests;
CREATE POLICY "Mechanics can update matched requests"
  ON public.repair_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j WHERE j.request_id = repair_requests.id AND j.mechanic_id = public.get_mechanic_id(auth.uid())
    ) OR EXISTS (
      SELECT 1 FROM public.mechanic_matches m WHERE m.request_id = repair_requests.id AND m.mechanic_id = public.get_mechanic_id(auth.uid())
    )
  )
  WITH CHECK (true);

-- -------------------------------------------------------------
-- 6. SECURE CODES ROBUST RPCs & AUTOMATIC TRIGGER
-- -------------------------------------------------------------

-- A. Get or Create Start Code RPC
CREATE OR REPLACE FUNCTION public.get_or_create_start_code(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code RECORD;
  v_new_code TEXT;
  v_job RECORD;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found', p_job_id;
  END IF;

  SELECT * INTO v_code
  FROM public.secure_codes
  WHERE job_id = p_job_id AND code_type = 'start';

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'code', v_code.code,
      'is_used', v_code.is_used
    );
  END IF;

  v_new_code := (FLOOR(100000 + RANDOM() * 900000))::TEXT;

  INSERT INTO public.secure_codes (
    job_id,
    code_type,
    code,
    code_hash,
    expires_at,
    max_attempts,
    attempts,
    is_used
  ) VALUES (
    p_job_id,
    'start',
    v_new_code,
    v_new_code,
    now() + INTERVAL '24 hours',
    3,
    0,
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'code', v_new_code,
    'is_used', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_start_code(UUID) TO authenticated, service_role, anon;

-- B. Get or Create Finish Code RPC
CREATE OR REPLACE FUNCTION public.get_or_create_finish_code(p_job_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code RECORD;
  v_new_code TEXT;
  v_job RECORD;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found', p_job_id;
  END IF;

  SELECT * INTO v_code
  FROM public.secure_codes
  WHERE job_id = p_job_id AND code_type = 'finish';

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'code', v_code.code,
      'is_used', v_code.is_used
    );
  END IF;

  v_new_code := (FLOOR(100000 + RANDOM() * 900000))::TEXT;

  INSERT INTO public.secure_codes (
    job_id,
    code_type,
    code,
    code_hash,
    expires_at,
    max_attempts,
    attempts,
    is_used
  ) VALUES (
    p_job_id,
    'finish',
    v_new_code,
    v_new_code,
    now() + INTERVAL '24 hours',
    5,
    0,
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'code', v_new_code,
    'is_used', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_finish_code(UUID) TO authenticated, service_role, anon;

-- C. Verify Job Start Code RPC
CREATE OR REPLACE FUNCTION public.verify_job_start_code(
  p_job_id UUID,
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_code RECORD;
  v_clean_code TEXT := TRIM(p_code);
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Job not found');
  END IF;

  SELECT * INTO v_code
  FROM public.secure_codes
  WHERE job_id = p_job_id AND code_type = 'start'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Start code not generated for this job');
  END IF;

  IF TRIM(v_code.code) != v_clean_code THEN
    UPDATE public.secure_codes
    SET attempts = attempts + 1
    WHERE id = v_code.id;
    RETURN jsonb_build_object('success', false, 'message', 'Incorrect Start Code. Please ask the farmer for the code displayed on their app.');
  END IF;

  UPDATE public.secure_codes
  SET is_used = true, used_at = now()
  WHERE id = v_code.id;

  UPDATE public.jobs
  SET status = 'arrived',
      arrived_at = COALESCE(arrived_at, now()),
      updated_at = now()
  WHERE id = p_job_id;

  INSERT INTO public.job_status_history (job_id, old_status, new_status, notes)
  VALUES (p_job_id, v_job.status, 'arrived', 'Start code verified successfully. Mechanic arrived at site.');

  RETURN jsonb_build_object(
    'success', true,
    'status', 'arrived',
    'message', 'Start code verified successfully!'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_job_start_code(UUID, TEXT) TO authenticated, service_role, anon;

-- D. Automatic Secure Code Generation Trigger
CREATE OR REPLACE FUNCTION public.ensure_job_secure_codes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_code TEXT;
  v_finish_code TEXT;
BEGIN
  IF NEW.status IN ('assigned', 'started', 'quote_submitted', 'quote_approved', 'repair_in_progress', 'bill_ready') THEN
    IF NOT EXISTS (SELECT 1 FROM public.secure_codes WHERE job_id = NEW.id AND code_type = 'start') THEN
      v_start_code := (FLOOR(100000 + RANDOM() * 900000))::TEXT;
      INSERT INTO public.secure_codes (
        job_id, code_type, code, code_hash, expires_at, max_attempts, attempts, is_used
      ) VALUES (
        NEW.id, 'start', v_start_code, v_start_code, now() + INTERVAL '24 hours', 3, 0, false
      );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.secure_codes WHERE job_id = NEW.id AND code_type = 'finish') THEN
      v_finish_code := (FLOOR(100000 + RANDOM() * 900000))::TEXT;
      INSERT INTO public.secure_codes (
        job_id, code_type, code, code_hash, expires_at, max_attempts, attempts, is_used
      ) VALUES (
        NEW.id, 'finish', v_finish_code, v_finish_code, now() + INTERVAL '24 hours', 5, 0, false
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jobs_ensure_secure_codes ON public.jobs;
CREATE TRIGGER trg_jobs_ensure_secure_codes
  AFTER INSERT OR UPDATE OF status ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_job_secure_codes();

-- -------------------------------------------------------------
-- 6. ATOMIC JOB ASSIGNMENT FIX (with valid match_status 'notified')
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_job_atomic(
  p_request_id UUID,
  p_mechanic_id UUID,
  p_start_code TEXT,
  p_code_hash TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 minutes')
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_mechanic RECORD;
  v_job_id UUID;
  v_secure_code_id UUID;
  v_customer_profile_id UUID;
BEGIN
  -- 1. Lock the repair request row exclusively to prevent concurrent assignment
  SELECT * INTO v_request
  FROM public.repair_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repair request % not found', p_request_id;
  END IF;

  IF v_request.status NOT IN ('requested', 'matching') THEN
    RAISE EXCEPTION 'Job already accepted or unavailable (current status: %)', v_request.status;
  END IF;

  -- 2. Verify mechanic exists and is approved
  SELECT * INTO v_mechanic
  FROM public.mechanics
  WHERE id = p_mechanic_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mechanic % not found', p_mechanic_id;
  END IF;

  IF v_mechanic.status != 'approved' THEN
    RAISE EXCEPTION 'Mechanic % is not approved', p_mechanic_id;
  END IF;

  -- Find customer profile for notifications
  SELECT profile_id INTO v_customer_profile_id
  FROM public.customers
  WHERE id = v_request.customer_id;

  -- 3. Update repair request status to assigned
  UPDATE public.repair_requests
  SET status = 'assigned',
      updated_at = now()
  WHERE id = p_request_id;

  -- 4. Create Job record
  INSERT INTO public.jobs (
    request_id,
    customer_id,
    mechanic_id,
    status,
    assigned_at
  ) VALUES (
    p_request_id,
    v_request.customer_id,
    p_mechanic_id,
    'assigned',
    now()
  ) RETURNING id INTO v_job_id;

  -- 5. Insert secure start code
  INSERT INTO public.secure_codes (
    job_id,
    code_type,
    code,
    code_hash,
    expires_at,
    max_attempts,
    attempts,
    is_used
  ) VALUES (
    v_job_id,
    'start',
    p_start_code,
    p_code_hash,
    p_expires_at,
    3,
    0,
    false
  ) RETURNING id INTO v_secure_code_id;

  -- 6. Update matches: accepted for winner, timed_out for other contenders
  UPDATE public.mechanic_matches
  SET status = 'accepted',
      responded_at = now()
  WHERE request_id = p_request_id AND mechanic_id = p_mechanic_id;

  UPDATE public.mechanic_matches
  SET status = 'timed_out',
      responded_at = now()
  WHERE request_id = p_request_id AND mechanic_id != p_mechanic_id AND status = 'notified';

  -- 7. Record job status history
  INSERT INTO public.job_status_history (
    job_id,
    old_status,
    new_status,
    changed_by,
    notes
  ) VALUES (
    v_job_id,
    v_request.status,
    'assigned',
    v_mechanic.profile_id,
    'Mechanic accepted job assignment'
  );

  RETURN jsonb_build_object(
    'success', true,
    'job_id', v_job_id,
    'request_id', p_request_id,
    'mechanic_id', p_mechanic_id,
    'start_code', p_start_code,
    'status', 'assigned'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_job_atomic(UUID, UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated, service_role, anon;


