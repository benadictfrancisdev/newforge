
-- Add annual_price_usd column to subscription_plans
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS annual_price_usd numeric(10,2) NOT NULL DEFAULT 0;

-- Delete existing plans
DELETE FROM public.subscription_plans;

-- Insert correct 5 plans
INSERT INTO public.subscription_plans (name, slug, price_inr, price_usd, annual_price_usd, duration_hours, features, limits) VALUES
('Free', 'free', 0, 0, 0, -1,
  '["5 datasets", "10,000 rows per dataset", "20 columns", "5 AI reports/month", "50 AI credits/month", "1 seat"]'::jsonb,
  '{"max_datasets": 5, "max_rows": 10000, "max_columns": 20, "ai_reports": 5, "ai_credits": 50, "seats": 1}'::jsonb
),
('Standard', 'standard', 1699, 19.99, 15.99, 720,
  '["10 datasets", "50,000 rows per dataset", "40 columns", "25 AI reports/month", "500 AI credits/month", "1 seat", "Priority support"]'::jsonb,
  '{"max_datasets": 10, "max_rows": 50000, "max_columns": 40, "ai_reports": 25, "ai_credits": 500, "seats": 1}'::jsonb
),
('Pro', 'pro', 4249, 49.99, 39.99, 720,
  '["30 datasets", "250,000 rows per dataset", "75 columns", "60 AI reports/month", "1,500 AI credits/month", "1 seat", "Advanced analytics", "Priority support"]'::jsonb,
  '{"max_datasets": 30, "max_rows": 250000, "max_columns": 75, "ai_reports": 60, "ai_credits": 1500, "seats": 1}'::jsonb
),
('Team', 'team', 7649, 89.99, 71.99, 720,
  '["60 datasets", "500,000 rows per dataset", "100 columns", "150 AI reports/month", "4,000 AI credits/month", "2 seats", "Team collaboration", "Priority support"]'::jsonb,
  '{"max_datasets": 60, "max_rows": 500000, "max_columns": 100, "ai_reports": 150, "ai_credits": 4000, "seats": 2}'::jsonb
),
('Enterprise', 'enterprise', 0, 0, 0, -1,
  '["Unlimited datasets", "Unlimited rows", "Unlimited columns", "Unlimited AI reports", "Unlimited AI credits", "Unlimited seats", "Dedicated support", "Custom integrations", "SLA guarantee"]'::jsonb,
  '{"max_datasets": -1, "max_rows": -1, "max_columns": -1, "ai_reports": -1, "ai_credits": -1, "seats": -1}'::jsonb
);

-- Create user_credits table
CREATE TABLE public.user_credits (
  user_id text PRIMARY KEY,
  balance integer NOT NULL DEFAULT 0,
  plan_slug text NOT NULL DEFAULT 'free',
  monthly_credits integer NOT NULL DEFAULT 50,
  credits_reset_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits" ON public.user_credits FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "Users can insert own credits" ON public.user_credits FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "Users can update own credits" ON public.user_credits FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "Service role manages credits" ON public.user_credits FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create credit_transactions table
CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  amount integer NOT NULL,
  action text NOT NULL,
  feature text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.credit_transactions FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "Users can insert own transactions" ON public.credit_transactions FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "Service role manages transactions" ON public.credit_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Create credit_topups reference table
CREATE TABLE public.credit_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  price_usd numeric(10,2) NOT NULL,
  credits integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.credit_topups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active topups" ON public.credit_topups FOR SELECT USING (is_active = true);

INSERT INTO public.credit_topups (name, slug, price_usd, credits) VALUES
('Micro', 'micro', 10, 100),
('Power', 'power', 45, 500),
('Hyper', 'hyper', 160, 2000),
('Stellar', 'stellar', 700, 10000);
