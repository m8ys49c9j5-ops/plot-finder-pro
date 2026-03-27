-- Drop the overly permissive write policy
DROP POLICY IF EXISTS "Authenticated users can write app_config" ON app_config;

-- Create admin-only write policy using user_roles table
CREATE POLICY "Admin can write app_config" ON app_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );