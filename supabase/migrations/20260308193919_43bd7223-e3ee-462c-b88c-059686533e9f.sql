DROP POLICY IF EXISTS "Service role manages credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can insert own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;

CREATE POLICY "Service role full access"
ON public.user_credits FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view own credits"
ON public.user_credits FOR SELECT
TO authenticated
USING ((auth.uid())::text = user_id);