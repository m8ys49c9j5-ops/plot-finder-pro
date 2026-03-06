
-- Fix user_credits SELECT policy to be permissive
DROP POLICY IF EXISTS "Users can read own credits" ON public.user_credits;
CREATE POLICY "Users can read own credits"
ON public.user_credits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
