
CREATE POLICY "Authenticated can select raw_streets" ON public.raw_streets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can select raw_addresses" ON public.raw_addresses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can select raw_points" ON public.raw_points FOR SELECT TO authenticated USING (true);
