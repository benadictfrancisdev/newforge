
-- Create business_context_memory table for persistent business context
CREATE TABLE public.business_context_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  context_type TEXT NOT NULL CHECK (context_type IN ('analysis', 'insight', 'preference', 'kpi', 'narrative', 'action')),
  dataset_name TEXT,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  tags TEXT[],
  importance TEXT DEFAULT 'medium' CHECK (importance IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.business_context_memory ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own context" ON public.business_context_memory
FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create their own context" ON public.business_context_memory
FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own context" ON public.business_context_memory
FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own context" ON public.business_context_memory
FOR DELETE USING (auth.uid()::text = user_id);

-- Indexes
CREATE INDEX idx_business_context_user ON public.business_context_memory(user_id);
CREATE INDEX idx_business_context_type ON public.business_context_memory(context_type);
CREATE INDEX idx_business_context_dataset ON public.business_context_memory(dataset_name);

-- Trigger for updated_at
CREATE TRIGGER update_business_context_updated_at
BEFORE UPDATE ON public.business_context_memory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create automation_actions table for cross-system actions
CREATE TABLE public.automation_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('webhook', 'email_alert', 'dashboard_update', 'slack_notification')),
  trigger_condition JSONB NOT NULL,
  action_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER DEFAULT 0,
  dataset_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own actions" ON public.automation_actions
FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create their own actions" ON public.automation_actions
FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own actions" ON public.automation_actions
FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own actions" ON public.automation_actions
FOR DELETE USING (auth.uid()::text = user_id);

CREATE INDEX idx_automation_actions_user ON public.automation_actions(user_id);

CREATE TRIGGER update_automation_actions_updated_at
BEFORE UPDATE ON public.automation_actions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
