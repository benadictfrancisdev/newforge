
-- AI response cache table for cost reduction
CREATE TABLE public.ai_response_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  action text NOT NULL,
  response jsonb NOT NULL,
  model_used text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  hit_count integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_ai_cache_key ON public.ai_response_cache (cache_key);
CREATE INDEX idx_ai_cache_expires ON public.ai_response_cache (expires_at);

ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on cache"
ON public.ai_response_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
