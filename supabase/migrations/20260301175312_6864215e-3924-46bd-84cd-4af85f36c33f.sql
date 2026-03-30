
CREATE TABLE public.decision_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  dataset_name TEXT,
  tile_id TEXT,
  tile_title TEXT,
  decision TEXT NOT NULL,
  reasoning TEXT,
  expected_outcome TEXT,
  actual_outcome TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.decision_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own decisions"
ON public.decision_log FOR SELECT
USING ((auth.uid())::text = user_id);

CREATE POLICY "Users can create their own decisions"
ON public.decision_log FOR INSERT
WITH CHECK ((auth.uid())::text = user_id);

CREATE POLICY "Users can update their own decisions"
ON public.decision_log FOR UPDATE
USING ((auth.uid())::text = user_id);

CREATE POLICY "Users can delete their own decisions"
ON public.decision_log FOR DELETE
USING ((auth.uid())::text = user_id);
