CREATE OR REPLACE FUNCTION public.find_nearest_savivaldybe(p_lat double precision, p_lon double precision)
RETURNS TABLE(savivaldybe text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT a.savivaldybe
  FROM public.lithuanian_addresses a
  WHERE a.savivaldybe IS NOT NULL
  ORDER BY a.geom <-> ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)
  LIMIT 1;
$$;