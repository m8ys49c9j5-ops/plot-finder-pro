
-- Drop the restrictive SELECT policy and recreate as permissive
DROP POLICY IF EXISTS "Users can read own search history" ON public.search_history;
CREATE POLICY "Users can read own search history"
ON public.search_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
