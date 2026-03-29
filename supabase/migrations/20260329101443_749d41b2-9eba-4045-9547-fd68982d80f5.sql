
-- Fix 1: Prevent authenticated users from inserting/updating user_credits
-- Only service_role (via edge functions) should modify credits
CREATE POLICY "Deny authenticated insert on user_credits"
ON public.user_credits
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Deny authenticated update on user_credits"
ON public.user_credits
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny authenticated delete on user_credits"
ON public.user_credits
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

-- Fix 2: Prevent authenticated users from inserting/updating/deleting user_roles
-- Only service_role (via SQL editor) should modify roles
CREATE POLICY "Deny authenticated insert on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Deny authenticated update on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny authenticated delete on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);
