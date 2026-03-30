-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Trigger to update profiles.updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name');
  RETURN new;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add user_id to datasets table
ALTER TABLE public.datasets 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing permissive policies on datasets
DROP POLICY IF EXISTS "Allow all operations on datasets" ON public.datasets;

-- Create user-specific policies for datasets
CREATE POLICY "Users can view their own datasets"
ON public.datasets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own datasets"
ON public.datasets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own datasets"
ON public.datasets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own datasets"
ON public.datasets
FOR DELETE
USING (auth.uid() = user_id);

-- Update analyses policies
DROP POLICY IF EXISTS "Allow all operations on analyses" ON public.analyses;

CREATE POLICY "Users can view their own analyses"
ON public.analyses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.datasets
    WHERE datasets.id = analyses.dataset_id
    AND datasets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create analyses for their datasets"
ON public.analyses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.datasets
    WHERE datasets.id = analyses.dataset_id
    AND datasets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own analyses"
ON public.analyses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.datasets
    WHERE datasets.id = analyses.dataset_id
    AND datasets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own analyses"
ON public.analyses
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.datasets
    WHERE datasets.id = analyses.dataset_id
    AND datasets.user_id = auth.uid()
  )
);

-- Update data_chats policies
DROP POLICY IF EXISTS "Allow all operations on data_chats" ON public.data_chats;

CREATE POLICY "Users can view their own chats"
ON public.data_chats
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.datasets
    WHERE datasets.id = data_chats.dataset_id
    AND datasets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create chats for their datasets"
ON public.data_chats
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.datasets
    WHERE datasets.id = data_chats.dataset_id
    AND datasets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own chats"
ON public.data_chats
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.datasets
    WHERE datasets.id = data_chats.dataset_id
    AND datasets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own chats"
ON public.data_chats
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.datasets
    WHERE datasets.id = data_chats.dataset_id
    AND datasets.user_id = auth.uid()
  )
);