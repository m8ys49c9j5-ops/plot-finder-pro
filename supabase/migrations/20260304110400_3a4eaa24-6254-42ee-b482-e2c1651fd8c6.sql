
-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create the lithuanian_addresses table
CREATE TABLE public.lithuanian_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aob_kodas integer,
  savivaldybe text,
  gyvenviete text,
  gatve text,
  namo_nr text,
  pasto_kodas text,
  geom geometry(Point, 4326)
);

-- Create GIST spatial index for fast nearest-neighbor lookups
CREATE INDEX idx_lithuanian_addresses_geom ON public.lithuanian_addresses USING GIST (geom);

-- Create a regular index on aob_kodas for deduplication
CREATE UNIQUE INDEX idx_lithuanian_addresses_aob_kodas ON public.lithuanian_addresses (aob_kodas);

-- Enable RLS
ALTER TABLE public.lithuanian_addresses ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for addresses"
  ON public.lithuanian_addresses
  FOR SELECT
  USING (true);

-- Service role can manage
CREATE POLICY "Service role can manage addresses"
  ON public.lithuanian_addresses
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- RPC function: find nearest address within 50m of a WGS84 point
CREATE OR REPLACE FUNCTION public.find_nearest_address(p_lat double precision, p_lon double precision)
RETURNS TABLE(full_address text, distance_m double precision)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(
      NULLIF(CONCAT_WS(' ', a.gatve, a.namo_nr), ''),
      a.gyvenviete,
      a.savivaldybe,
      'Adresas nežinomas'
    ) || COALESCE(', ' || a.gyvenviete, '') AS full_address,
    ST_DistanceSphere(a.geom, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)) AS distance_m
  FROM public.lithuanian_addresses a
  WHERE ST_DWithin(
    a.geom::geography,
    ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
    50
  )
  ORDER BY a.geom <-> ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)
  LIMIT 1;
$$;
