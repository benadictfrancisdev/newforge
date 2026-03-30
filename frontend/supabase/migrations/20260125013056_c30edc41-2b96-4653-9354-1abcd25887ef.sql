-- Create table for database connections with encrypted credentials
CREATE TABLE public.database_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  db_type TEXT NOT NULL CHECK (db_type IN ('postgresql', 'mysql', 'sqlite', 'mongodb')),
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  database_name TEXT NOT NULL,
  username TEXT NOT NULL,
  -- Password is encrypted using pgcrypto
  encrypted_password TEXT NOT NULL,
  ssl_enabled BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_connected_at TIMESTAMP WITH TIME ZONE,
  connection_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.database_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own database connections" 
ON public.database_connections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own database connections" 
ON public.database_connections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own database connections" 
ON public.database_connections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own database connections" 
ON public.database_connections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create table for saved queries
CREATE TABLE public.saved_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID REFERENCES public.database_connections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  natural_language_query TEXT NOT NULL,
  generated_sql TEXT NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_queries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own saved queries" 
ON public.saved_queries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved queries" 
ON public.saved_queries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved queries" 
ON public.saved_queries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved queries" 
ON public.saved_queries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_database_connections_updated_at
BEFORE UPDATE ON public.database_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();