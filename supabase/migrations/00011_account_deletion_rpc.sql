-- =============================================================
-- Migration: 00011_account_deletion_rpc.sql
-- Description: Google Play Policy compliant account deletion RPC
-- =============================================================

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_role TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;

  -- 1. Cancel any active pending / matching repair requests for this customer
  UPDATE public.repair_requests
  SET status = 'cancelled', updated_at = now()
  WHERE customer_id IN (SELECT id FROM public.customers WHERE profile_id = v_uid)
    AND status IN ('pending', 'matching');

  -- 2. If mechanic, set offline and suspend visibility
  IF v_role = 'mechanic' THEN
    UPDATE public.mechanics
    SET is_online = false,
        status = 'suspended',
        updated_at = now()
    WHERE profile_id = v_uid;
  END IF;

  -- 3. Anonymize personal profile data
  UPDATE public.profiles
  SET full_name = 'Deleted User',
      phone = NULL,
      preferred_language = 'en',
      updated_at = now()
  WHERE id = v_uid;

  -- 4. Mark customer record
  UPDATE public.customers
  SET updated_at = now()
  WHERE profile_id = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Your personal account data has been erased successfully.'
  );
END;
$$;
