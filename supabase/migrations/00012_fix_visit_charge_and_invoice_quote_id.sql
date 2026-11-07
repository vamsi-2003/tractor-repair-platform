-- =============================================================
-- Migration: 00012_fix_visit_charge_and_invoice_quote_id.sql
-- Description: 
--   1. Allow quote_id in invoices to be NULL when only visit charge is collected
--   2. Fix payment_status enum in record_visit_charge_collected to 'captured'
--   3. Remove non-existent platform_fee column insert into payments table
-- =============================================================

ALTER TABLE public.invoices ALTER COLUMN quote_id DROP NOT NULL;

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

  -- Record payment in payments table
  INSERT INTO public.payments (
    invoice_id,
    method,
    amount,
    status,
    paid_at
  )
  SELECT id, 'cash', v_visit_charge, 'captured'::public.payment_status, now()
  FROM public.invoices
  WHERE job_id = p_job_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'quote_declined',
    'visit_charge', v_visit_charge,
    'platform_fee', v_platform_fee,
    'mechanic_payout', (v_visit_charge - v_platform_fee)
  );
END;
$$;
