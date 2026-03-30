-- Allow user_id to be nullable for public webhook data
ALTER TABLE public.webhook_data ALTER COLUMN user_id DROP NOT NULL;