
-- Allow authenticated users to INSERT and UPDATE on raw data tables
CREATE POLICY "Authenticated can insert raw_streets" ON public.raw_streets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update raw_streets" ON public.raw_streets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can insert raw_addresses" ON public.raw_addresses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update raw_addresses" ON public.raw_addresses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can insert raw_points" ON public.raw_points FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update raw_points" ON public.raw_points FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
