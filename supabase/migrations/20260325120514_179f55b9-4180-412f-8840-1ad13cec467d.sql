DROP FUNCTION IF EXISTS public.find_nearest_address(double precision, double precision);

CREATE OR REPLACE FUNCTION public.find_nearest_address(p_lat double precision, p_lon double precision)
RETURNS TABLE(full_address text, distance_m double precision, gyvenviete text, pasto_kodas text, savivaldybe text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    CONCAT_WS(', ',
      NULLIF(CONCAT_WS(' ', a.gatve, a.namo_nr), ''),
      CASE WHEN a.gyvenviete IS NOT NULL THEN a.gyvenviete || ' k.' END,
      a.savivaldybe
    ) AS full_address,
    ST_DistanceSphere(a.geom, ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)) AS distance_m,
    a.gyvenviete,
    a.pasto_kodas,
    a.savivaldybe
  FROM public.lithuanian_addresses a
  WHERE ST_DWithin(
    a.geom::geography,
    ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
    50
  )
  ORDER BY a.geom <-> ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)
  LIMIT 1;
$$;