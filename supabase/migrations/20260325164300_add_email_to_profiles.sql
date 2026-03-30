-- Add email column to profiles table for admin identification
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Create index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
