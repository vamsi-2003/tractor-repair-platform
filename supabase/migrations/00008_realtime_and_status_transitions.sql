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
