-- =============================================================
-- Migration: 00004_functions_and_rpc.sql
-- Description: Helper RPC functions for Tractor Repair Marketplace
--              - Secure code column addition for safe server-side retrieval
--              - PostGIS mechanic matching function
--              - Atomic job assignment transaction
--              - Payment completion & commission settlement RPC
-- =============================================================

-- -------------------------------------------------------------
-- 1. SECURE CODES TABLE ENHANCEMENT
-- -------------------------------------------------------------
-- Add plaintext code column to secure_codes.
-- RLS continues to protect this table from ALL public/authenticated direct access.
-- Only service role and SECURITY DEFINER functions can access it.
ALTER TABLE public.secure_codes ADD COLUMN IF NOT EXISTS code TEXT;

-- -------------------------------------------------------------
-- 2. GEOSPATIAL MECHANIC MATCHING RPC
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.find_matching_mechanics(p_request_id UUID)
RETURNS TABLE (
  mechanic_id UUID,
  profile_id UUID,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  rating_avg NUMERIC,
  total_jobs INTEGER,
  workshop_address TEXT,
  service_radius_km NUMERIC,
  distance_km NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_req RECORD;
BEGIN
  SELECT r.id, r.category_id, r.location, r.status
  INTO v_req
  FROM public.repair_requests r
  WHERE r.id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repair request not found: %', p_request_id;
  END IF;

  RETURN QUERY
  SELECT
    m.id AS mechanic_id,
    m.profile_id,
    p.full_name,
    p.phone,
    p.avatar_url,
    m.rating_avg,
    m.total_jobs,
    m.workshop_address,
    m.service_radius_km,
    ROUND((ST_Distance(m.current_location, v_req.location) / 1000.0)::numeric, 2) AS distance_km
  FROM public.mechanics m
  JOIN public.profiles p ON m.profile_id = p.id
  JOIN public.mechanic_skills ms ON ms.mechanic_id = m.id AND ms.category_id = v_req.category_id
  WHERE m.status = 'approved'
    AND m.is_online = true
    AND m.current_location IS NOT NULL
    AND v_req.location IS NOT NULL
    AND ST_DWithin(m.current_location, v_req.location, m.service_radius_km * 1000)
  ORDER BY ST_Distance(m.current_location, v_req.location) ASC;
END;
$$;

-- -------------------------------------------------------------
-- 3. ATOMIC JOB ACCEPTANCE RPC
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

  -- 8. Add audit log entry
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    new_values
  ) VALUES (
    v_mechanic.profile_id,
    'job_assigned',
    'jobs',
    v_job_id,
    jsonb_build_object(
      'request_id', p_request_id,
      'customer_id', v_request.customer_id,
      'mechanic_id', p_mechanic_id,
      'assigned_at', now()
    )
  );

  -- 9. Create notifications
  IF v_customer_profile_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      body,
      data
    ) VALUES (
      v_customer_profile_id,
      'job_update',
      'Mechanic Assigned!',
      'A mechanic has accepted your repair request and will be heading your way.',
      jsonb_build_object('jobId', v_job_id, 'requestId', p_request_id, 'status', 'assigned')
    );
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data
  ) VALUES (
    v_mechanic.profile_id,
    'job_update',
    'Job Accepted',
    'You have successfully accepted the repair request.',
    jsonb_build_object('jobId', v_job_id, 'requestId', p_request_id, 'status', 'assigned')
  );

  RETURN jsonb_build_object(
    'job_id', v_job_id,
    'request_id', p_request_id,
    'customer_id', v_request.customer_id,
    'mechanic_id', p_mechanic_id,
    'status', 'assigned',
    'assigned_at', now()
  );
END;
$$;
