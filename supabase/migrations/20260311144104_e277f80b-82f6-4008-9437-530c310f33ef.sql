DROP POLICY IF EXISTS "Authenticated users can update app_config" ON public.app_config;
DROP POLICY IF EXISTS "Authenticated users can write app_config" ON public.app_config;

CREATE POLICY "Authenticated users can write app_config"
  ON public.app_config FOR ALL
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);