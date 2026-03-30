-- AI Cost Log table — tracks every AI request for cost monitoring
CREATE TABLE IF NOT EXISTS public.ai_cost_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  action text NOT NULL,
  model_used text NOT NULL,
  tier text NOT NULL,
  prompt_tokens integer,
  completion_tokens integer,
  max_tokens_set integer,
  latency_ms integer,
  credit_cost integer NOT NULL DEFAULT 1,
  cached boolean NOT NULL DEFAULT false,
  dataset_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for querying by user and time range
CREATE INDEX IF NOT EXISTS idx_ai_cost_log_user_created
  ON public.ai_cost_log (user_id, created_at DESC);

-- Index for action-level cost aggregation
CREATE INDEX IF NOT EXISTS idx_ai_cost_log_action
  ON public.ai_cost_log (action, created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_cost_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own cost logs
CREATE POLICY "Users can view own cost logs"
  ON public.ai_cost_log FOR SELECT
  USING (auth.uid()::text = user_id);

-- Edge function can insert (service role bypasses RLS)
