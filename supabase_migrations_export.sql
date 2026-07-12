-- Migration: Scheduled Reports
-- Run this inside the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  filters JSONB DEFAULT '{}'::jsonb,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
  recipient_emails TEXT[] NOT NULL,
  next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for scheduled report checks
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON public.scheduled_reports(next_run_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_user ON public.scheduled_reports(user_id);

-- Enable RLS
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

-- Allow insert, select, and delete for authenticated/ideation users
CREATE POLICY "Allow select scheduled_reports" ON public.scheduled_reports FOR SELECT USING (true);
CREATE POLICY "Allow insert scheduled_reports" ON public.scheduled_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete scheduled_reports" ON public.scheduled_reports FOR DELETE USING (true);
