-- =============================================================
-- Migration: 00010_app_crash_telemetry.sql
-- Description: Telemetry and crash reporting table for mobile client
-- =============================================================

CREATE TABLE IF NOT EXISTS public.app_crash_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'anonymous',
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  component_stack TEXT,
  screen_name TEXT,
  app_version TEXT DEFAULT '1.2.0',
  device_info JSONB DEFAULT '{}'::jsonb,
  severity TEXT DEFAULT 'error', -- 'fatal', 'error', 'warning'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.app_crash_logs ENABLE ROW LEVEL SECURITY;

-- Allow any client (even unauthenticated) to insert crash logs
DROP POLICY IF EXISTS "Anyone can insert crash logs" ON public.app_crash_logs;
CREATE POLICY "Anyone can insert crash logs"
  ON public.app_crash_logs
  FOR INSERT
  WITH CHECK (true);

-- Allow admins to read all crash logs
DROP POLICY IF EXISTS "Admins can view crash logs" ON public.app_crash_logs;
CREATE POLICY "Admins can view crash logs"
  ON public.app_crash_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Indexes for performant filtering
CREATE INDEX IF NOT EXISTS idx_crash_logs_created_at ON public.app_crash_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crash_logs_severity ON public.app_crash_logs (severity);
CREATE INDEX IF NOT EXISTS idx_crash_logs_role ON public.app_crash_logs (role);
