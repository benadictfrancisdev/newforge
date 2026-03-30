
-- Drop ALL foreign keys from public tables to auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.datasets DROP CONSTRAINT IF EXISTS datasets_user_id_fkey;
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;
ALTER TABLE public.conversation_sessions DROP CONSTRAINT IF EXISTS conversation_sessions_user_id_fkey;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE public.scheduled_jobs DROP CONSTRAINT IF EXISTS scheduled_jobs_user_id_fkey;
ALTER TABLE public.user_session_state DROP CONSTRAINT IF EXISTS user_session_state_user_id_fkey;
ALTER TABLE public.user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;

-- Drop ALL RLS policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own datasets" ON public.datasets;
DROP POLICY IF EXISTS "Users can delete their own datasets" ON public.datasets;
DROP POLICY IF EXISTS "Users can update their own datasets" ON public.datasets;
DROP POLICY IF EXISTS "Users can view their own datasets" ON public.datasets;
DROP POLICY IF EXISTS "Users can delete their own state" ON public.user_session_state;
DROP POLICY IF EXISTS "Users can update their own state" ON public.user_session_state;
DROP POLICY IF EXISTS "Users can upsert their own state" ON public.user_session_state;
DROP POLICY IF EXISTS "Users can view their own state" ON public.user_session_state;
DROP POLICY IF EXISTS "Users can create their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can create their own sessions" ON public.conversation_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.conversation_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.conversation_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.conversation_sessions;
DROP POLICY IF EXISTS "Service role can manage usage" ON public.api_usage;
DROP POLICY IF EXISTS "Users can view their own usage" ON public.api_usage;
DROP POLICY IF EXISTS "Users can create their own database connections" ON public.database_connections;
DROP POLICY IF EXISTS "Users can delete their own database connections" ON public.database_connections;
DROP POLICY IF EXISTS "Users can update their own database connections" ON public.database_connections;
DROP POLICY IF EXISTS "Users can view their own database connections" ON public.database_connections;
DROP POLICY IF EXISTS "Users can create their own saved queries" ON public.saved_queries;
DROP POLICY IF EXISTS "Users can delete their own saved queries" ON public.saved_queries;
DROP POLICY IF EXISTS "Users can update their own saved queries" ON public.saved_queries;
DROP POLICY IF EXISTS "Users can view their own saved queries" ON public.saved_queries;
DROP POLICY IF EXISTS "Users can create their own scheduled jobs" ON public.scheduled_jobs;
DROP POLICY IF EXISTS "Users can delete their own scheduled jobs" ON public.scheduled_jobs;
DROP POLICY IF EXISTS "Users can update their own scheduled jobs" ON public.scheduled_jobs;
DROP POLICY IF EXISTS "Users can view their own scheduled jobs" ON public.scheduled_jobs;
DROP POLICY IF EXISTS "Service role can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Users can create their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Service role can insert webhook data" ON public.webhook_data;
DROP POLICY IF EXISTS "Users can delete their own webhook data" ON public.webhook_data;
DROP POLICY IF EXISTS "Users can view their own webhook data" ON public.webhook_data;
DROP POLICY IF EXISTS "Users can create analyses for their datasets" ON public.analyses;
DROP POLICY IF EXISTS "Users can delete their own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can update their own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can view their own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can create chats for their datasets" ON public.data_chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON public.data_chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON public.data_chats;
DROP POLICY IF EXISTS "Users can view their own chats" ON public.data_chats;
DROP POLICY IF EXISTS "Users can view their job history" ON public.job_history;

-- Alter columns to TEXT
ALTER TABLE public.profiles ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE public.datasets ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.user_session_state ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.chat_messages ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.conversation_sessions ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.api_usage ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.database_connections ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.saved_queries ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.scheduled_jobs ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.payments ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.user_subscriptions ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.webhook_data ALTER COLUMN user_id TYPE text USING user_id::text;

-- Disable RLS (Firebase handles auth)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_session_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_queries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_history DISABLE ROW LEVEL SECURITY;

-- Update function
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_user_id text, p_endpoint text, p_max_requests integer DEFAULT 100, p_window_minutes integer DEFAULT 60)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_window_start timestamp with time zone;
  v_current_count integer;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;
  SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
  FROM public.api_usage WHERE user_id = p_user_id AND endpoint = p_endpoint AND window_start >= v_window_start;
  IF v_current_count >= p_max_requests THEN RETURN false; END IF;
  INSERT INTO public.api_usage (user_id, endpoint, window_start) VALUES (p_user_id, p_endpoint, now());
  DELETE FROM public.api_usage WHERE window_start < now() - interval '24 hours';
  RETURN true;
END;
$function$;
