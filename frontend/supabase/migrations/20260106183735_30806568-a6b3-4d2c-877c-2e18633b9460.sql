-- Create scheduled_jobs table for managing connector sync schedules
CREATE TABLE public.scheduled_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  name TEXT NOT NULL,
  connector_type TEXT NOT NULL,
  connector_config JSONB NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('manual', 'hourly', 'daily', 'weekly', 'custom')),
  cron_expression TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  last_run_status TEXT DEFAULT 'pending',
  last_run_message TEXT,
  records_synced INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create job_history table for tracking sync history
CREATE TABLE public.job_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.scheduled_jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  execution_time_ms INTEGER
);

-- Enable Row Level Security
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_history ENABLE ROW LEVEL SECURITY;

-- Create policies for scheduled_jobs
CREATE POLICY "Users can view their own scheduled jobs" 
ON public.scheduled_jobs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled jobs" 
ON public.scheduled_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled jobs" 
ON public.scheduled_jobs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled jobs" 
ON public.scheduled_jobs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for job_history
CREATE POLICY "Users can view their job history" 
ON public.job_history 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.scheduled_jobs 
  WHERE scheduled_jobs.id = job_history.job_id 
  AND scheduled_jobs.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates on scheduled_jobs
CREATE TRIGGER update_scheduled_jobs_updated_at
BEFORE UPDATE ON public.scheduled_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient queries
CREATE INDEX idx_scheduled_jobs_user_id ON public.scheduled_jobs(user_id);
CREATE INDEX idx_scheduled_jobs_next_run ON public.scheduled_jobs(next_run_at) WHERE is_active = true;
CREATE INDEX idx_job_history_job_id ON public.job_history(job_id);