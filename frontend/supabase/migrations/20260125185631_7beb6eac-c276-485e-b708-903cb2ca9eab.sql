-- Create table for storing webhook data
CREATE TABLE public.webhook_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB,
  source_ip TEXT,
  received_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN DEFAULT false
);

-- Create indexes for efficient querying
CREATE INDEX idx_webhook_data_webhook_id ON public.webhook_data(webhook_id);
CREATE INDEX idx_webhook_data_user_id ON public.webhook_data(user_id);
CREATE INDEX idx_webhook_data_received_at ON public.webhook_data(received_at DESC);

-- Enable Row Level Security
ALTER TABLE public.webhook_data ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own webhook data
CREATE POLICY "Users can view their own webhook data"
  ON public.webhook_data
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own webhook data
CREATE POLICY "Users can delete their own webhook data"
  ON public.webhook_data
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Service role can insert webhook data (for the edge function)
CREATE POLICY "Service role can insert webhook data"
  ON public.webhook_data
  FOR INSERT
  WITH CHECK (true);