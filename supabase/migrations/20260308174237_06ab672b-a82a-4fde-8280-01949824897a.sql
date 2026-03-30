
CREATE TABLE public.forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  dataset_name text NOT NULL,
  target_column text NOT NULL,
  forecast_horizon text NOT NULL DEFAULT 'next_period',
  method text NOT NULL DEFAULT 'auto',
  current_value numeric,
  predicted_values jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_intervals jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_score integer NOT NULL DEFAULT 0,
  trend text NOT NULL DEFAULT 'stable',
  change_percent numeric DEFAULT 0,
  ai_narrative text,
  ai_recommendations jsonb DEFAULT '[]'::jsonb,
  decomposition jsonb DEFAULT '{}'::jsonb,
  anomalies_detected jsonb DEFAULT '[]'::jsonb,
  patterns jsonb DEFAULT '[]'::jsonb,
  tokens_used integer DEFAULT 0,
  cost_inr numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own forecasts"
  ON public.forecasts FOR SELECT
  TO authenticated
  USING ((auth.uid())::text = user_id);

CREATE POLICY "Users can create own forecasts"
  ON public.forecasts FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid())::text = user_id);

CREATE POLICY "Users can delete own forecasts"
  ON public.forecasts FOR DELETE
  TO authenticated
  USING ((auth.uid())::text = user_id);

CREATE INDEX idx_forecasts_user_dataset ON public.forecasts(user_id, dataset_name);
