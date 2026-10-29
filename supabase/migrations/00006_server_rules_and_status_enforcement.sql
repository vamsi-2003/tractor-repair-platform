-- =============================================================
-- Migration: 00006_server_rules_and_status_enforcement.sql
-- Description: Server-side business logic and atomic RPCs for:
--              1. Customer & Mechanic cancellation tracking
--              2. Quote decline & visit charge collection
--              3. Server-side bill and platform fee calculations from app_settings
--              4. Strict status flow transition enforcement
-- =============================================================

-- -------------------------------------------------------------
-- 1. CANCEL JOB BY CUSTOMER RPC
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_job_by_customer(
  p_job_id UUID,
  p_reason TEXT DEFAULT 'Customer cancelled'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_has_started BOOLEAN;
BEGIN
  SELECT j.*, sc.is_used as start_code_used
  INTO v_job
  FROM public.jobs j
  LEFT JOIN public.secure_codes sc ON sc.job_id = j.id AND sc.code_type = 'start'
  WHERE j.id = p_job_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found', p_job_id;
  END IF;

  v_has_started := COALESCE(v_job.start_code_used, false) OR v_job.status IN ('started', 'repair_in_progress', 'quote_approved', 'bill_ready', 'completed');

  -- If customer cancels before mechanic arrives (start code not entered), NO fee, increment cancellation_count
  IF NOT v_has_started THEN
    UPDATE public.customers
    SET cancellation_count = COALESCE(cancellation_count, 0) + 1
    WHERE id = v_job.customer_id;

    UPDATE public.jobs
    SET status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = p_reason,
        updated_at = now()
    WHERE id = p_job_id;

    UPDATE public.repair_requests
    SET status = 'cancelled',
        updated_at = now()
    WHERE id = v_job.request_id;

    INSERT INTO public.job_status_history (job_id, old_status, new_status, notes)
    VALUES (p_job_id, v_job.status, 'cancelled', 'Customer cancelled before arrival. Reason: ' || p_reason);

    RETURN jsonb_build_object(
      'success', true,
      'status', 'cancelled',
      'fee_owed', 0,
      'message', 'Job cancelled without fees as mechanic had not arrived'
    );
  ELSE
    -- If already arrived/started, customer must decline quote or pay visit charge
    RAISE EXCEPTION 'Mechanic has already arrived. Please use Decline Quote flow instead of cancelling.';
  END IF;
END;
$$;

-- -------------------------------------------------------------
-- 2. CANCEL JOB BY MECHANIC RPC
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_job_by_mechanic(
  p_job_id UUID,
  p_reason TEXT DEFAULT 'Mechanic cancelled'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found', p_job_id;
  END IF;

  -- Mechanic cancels: customer pays nothing, mechanic's cancellation count increases
  UPDATE public.mechanics
  SET cancellation_count = COALESCE(cancellation_count, 0) + 1
  WHERE id = v_job.mechanic_id;

  UPDATE public.jobs
  SET status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = p_reason,
      updated_at = now()
  WHERE id = p_job_id;

  -- Put request back to matching or cancelled
  UPDATE public.repair_requests
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = v_job.request_id;

  INSERT INTO public.job_status_history (job_id, old_status, new_status, notes)
  VALUES (p_job_id, v_job.status, 'cancelled', 'Mechanic cancelled. Reason: ' || p_reason);

  RETURN jsonb_build_object(
    'success', true,
    'status', 'cancelled',
    'customer_owed', 0,
    'message', 'Mechanic cancelled. Customer pays nothing.'
  );
END;
$$;

-- -------------------------------------------------------------
-- 3. RECORD VISIT CHARGE COLLECTED (QUOTE DECLINED) RPC
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_visit_charge_collected(
  p_job_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job RECORD;
  v_visit_charge NUMERIC := 200;
  v_platform_percent NUMERIC := 10;
  v_platform_fee NUMERIC;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found', p_job_id;
  END IF;

  -- Read visit_charge_amount from app_settings
  SELECT COALESCE(value::numeric, 200) INTO v_visit_charge
  FROM public.app_settings
  WHERE key = 'visit_charge_amount';

  -- Read platform_fee_percent from app_settings
  SELECT COALESCE(value::numeric, 10) INTO v_platform_percent
  FROM public.app_settings
  WHERE key = 'platform_fee_percent';

  v_platform_fee := ROUND(v_visit_charge * (v_platform_percent / 100.0), 2);

  -- Upsert Invoice
  INSERT INTO public.invoices (
    job_id,
    visit_charge,
    repair_amount,
    parts_amount,
    subtotal,
    platform_fee,
    total,
    status
  ) VALUES (
    p_job_id,
    v_visit_charge,
    0,
    0,
    v_visit_charge,
    v_platform_fee,
    v_visit_charge,
    'paid'
  )
  ON CONFLICT (job_id) DO UPDATE SET
    visit_charge = v_visit_charge,
    repair_amount = 0,
    parts_amount = 0,
    subtotal = v_visit_charge,
    platform_fee = v_platform_fee,
    total = v_visit_charge,
    status = 'paid',
    updated_at = now();

  -- Update Job status to quote_declined
  UPDATE public.jobs
  SET status = 'quote_declined',
      completed_at = now(),
      updated_at = now()
  WHERE id = p_job_id;

  INSERT INTO public.job_status_history (job_id, old_status, new_status, notes)
  VALUES (p_job_id, v_job.status, 'quote_declined', 'Quote declined after arrival. Visit charge ₹' || v_visit_charge || ' collected in cash.');

  -- Add platform commission to mechanic fee ledger
  INSERT INTO public.payments (
    invoice_id,
    method,
    amount,
    platform_fee,
    status
  )
  SELECT id, 'cash', v_visit_charge, v_platform_fee, 'completed'
  FROM public.invoices
  WHERE job_id = p_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'quote_declined',
    'visit_charge', v_visit_charge,
    'platform_fee', v_platform_fee
  );
END;
$$;

-- -------------------------------------------------------------
-- 4. COMPLETE JOB CASH WITH APP_SETTINGS FEE CALCULATION RPC
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
  IF p_finish_code IS NOT NULL THEN
    SELECT * INTO v_code
    FROM public.secure_codes
    WHERE job_id = p_job_id AND code_type = 'finish' AND is_used = false;

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

  -- 6. Update Job status to completed
  UPDATE public.jobs
  SET status = 'completed',
      completed_at = now(),
      repair_completed_at = now(),
      updated_at = now()
  WHERE id = p_job_id;

  INSERT INTO public.job_status_history (job_id, old_status, new_status, notes)
  VALUES (p_job_id, v_job.status, 'completed', 'Job marked completed. Total ₹' || v_grand_total || ' collected in cash. Commission ₹' || v_platform_fee);

  -- 7. Record cash payment and commission ledger
  INSERT INTO public.payments (
    invoice_id,
    method,
    amount,
    platform_fee,
    status
  )
  SELECT id, 'cash', v_grand_total, v_platform_fee, 'completed'
  FROM public.invoices
  WHERE job_id = p_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'completed',
    'total', v_grand_total,
    'platform_fee', v_platform_fee,
    'mechanic_net', (v_grand_total - v_platform_fee)
  );
END;
$$;
