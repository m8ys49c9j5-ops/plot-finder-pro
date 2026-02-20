-- Enable RLS on parcels table
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read parcels (public cadastral data)
CREATE POLICY "Public read access for parcels"
  ON public.parcels
  FOR SELECT
  USING (true);

-- Only service role can insert/update/delete (used by edge functions)
CREATE POLICY "Service role can manage parcels"
  ON public.parcels
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
