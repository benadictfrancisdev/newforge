
-- agent_jobs: user-configured autonomous agent jobs
CREATE TABLE public.agent_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  dataset_source TEXT NOT NULL DEFAULT 'storage',
  dataset_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  analysis_config JSONB NOT NULL DEFAULT '{"insights":true,"anomalies":true,"forecasts":true}'::jsonb,
  schedule_interval_hours INTEGER NOT NULL DEFAULT 24,
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_run_at TIMESTAMPTZ DEFAULT now(),
  last_run_at TIMESTAMPTZ,
  last_status TEXT NOT NULL DEFAULT 'pending',
  last_error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON public.agent_jobs FOR SELECT USING ((auth.uid())::text = user_id);
CREATE POLICY "Users can create own jobs" ON public.agent_jobs FOR INSERT WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "Users can update own jobs" ON public.agent_jobs FOR UPDATE USING ((auth.uid())::text = user_id);
CREATE POLICY "Users can delete own jobs" ON public.agent_jobs FOR DELETE USING ((auth.uid())::text = user_id);
CREATE POLICY "Service role manages jobs" ON public.agent_jobs FOR ALL USING (true) WITH CHECK (true);

-- agent_reports: AI-generated report output per run
CREATE TABLE public.agent_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.agent_jobs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  insights JSONB DEFAULT '[]'::jsonb,
  anomalies JSONB DEFAULT '[]'::jsonb,
  forecasts JSONB DEFAULT '[]'::jsonb,
  visualisation_config JSONB DEFAULT '{}'::jsonb,
  ai_narrative TEXT,
  confidence_score INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_inr NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON public.agent_reports FOR SELECT USING ((auth.uid())::text = user_id);
CREATE POLICY "Service role manages reports" ON public.agent_reports FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for agent_reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_reports;

-- agent_run_logs: step-by-step execution log
CREATE TABLE public.agent_run_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.agent_jobs(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_run_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own run logs" ON public.agent_run_logs FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.agent_jobs WHERE agent_jobs.id = agent_run_logs.job_id AND agent_jobs.user_id = (auth.uid())::text));
CREATE POLICY "Service role manages run logs" ON public.agent_run_logs FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger for agent_jobs
CREATE TRIGGER update_agent_jobs_updated_at BEFORE UPDATE ON public.agent_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
