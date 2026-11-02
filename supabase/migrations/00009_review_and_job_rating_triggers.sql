-- 00009_review_and_job_rating_triggers.sql
-- Automatically recalculates mechanic rating_avg and total_jobs on reviews and job completions.

CREATE OR REPLACE FUNCTION public.handle_review_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_mech_id UUID;
  v_avg NUMERIC(3,2);
  v_count INTEGER;
BEGIN
  target_mech_id := COALESCE(NEW.mechanic_id, OLD.mechanic_id);
  
  IF target_mech_id IS NOT NULL THEN
    SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0.00), COUNT(*)
    INTO v_avg, v_count
    FROM public.reviews WHERE mechanic_id = target_mech_id;

    UPDATE public.mechanics
    SET rating_avg = v_avg,
        total_jobs = (SELECT COUNT(*) FROM public.jobs WHERE mechanic_id = target_mech_id AND status = 'completed'),
        updated_at = now()
    WHERE id = target_mech_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_created_update_stats ON public.reviews;
CREATE TRIGGER on_review_created_update_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_review_stats();

CREATE OR REPLACE FUNCTION public.handle_job_completed_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_mech_id UUID;
BEGIN
  target_mech_id := COALESCE(NEW.mechanic_id, OLD.mechanic_id);
  
  IF target_mech_id IS NOT NULL THEN
    UPDATE public.mechanics
    SET total_jobs = (SELECT COUNT(*) FROM public.jobs WHERE mechanic_id = target_mech_id AND status = 'completed'),
        updated_at = now()
    WHERE id = target_mech_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_job_completed_update_stats ON public.jobs;
CREATE TRIGGER on_job_completed_update_stats
  AFTER INSERT OR UPDATE OF status, mechanic_id ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_job_completed_stats();
