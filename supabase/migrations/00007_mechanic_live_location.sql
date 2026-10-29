-- Migration: 00007_mechanic_live_location.sql
-- Enables dynamic mechanic GPS location updates and auto-generates PostGIS geography point

ALTER TABLE public.mechanics 
ADD COLUMN IF NOT EXISTS current_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS current_longitude NUMERIC;

CREATE OR REPLACE FUNCTION public.generate_mechanic_current_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_latitude IS NOT NULL AND NEW.current_longitude IS NOT NULL THEN
    NEW.current_location := ST_SetSRID(ST_MakePoint(NEW.current_longitude::double precision, NEW.current_latitude::double precision), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mechanics_current_location ON public.mechanics;
CREATE TRIGGER trg_mechanics_current_location
  BEFORE INSERT OR UPDATE OF current_latitude, current_longitude ON public.mechanics
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_mechanic_current_location();

-- Atomic RPC function for updating mechanic location & online status
CREATE OR REPLACE FUNCTION public.update_mechanic_location(
  p_mechanic_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_is_online BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.mechanics
  SET
    current_latitude = p_latitude,
    current_longitude = p_longitude,
    current_location = ST_SetSRID(ST_MakePoint(p_longitude::double precision, p_latitude::double precision), 4326)::geography,
    is_online = p_is_online,
    updated_at = now()
  WHERE id = p_mechanic_id;

  RETURN jsonb_build_object('success', true, 'latitude', p_latitude, 'longitude', p_longitude, 'is_online', p_is_online);
END;
$$;
