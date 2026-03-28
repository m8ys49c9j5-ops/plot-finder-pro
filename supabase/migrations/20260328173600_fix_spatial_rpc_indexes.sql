-- Migration to strictly force PostGIS to utilize GIST spatial indexes and correctly project WGS84 GeoJSON data into EPSG 3346 (LKS94)

-- 1. Redefine find_nearest_address to drop the geography cast and exclusively stick to GIST-indexed geometry bounding math
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
    a.geom,
    ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326),
    0.0005 -- Approximately 50 meters restriction using raw geometry to safely preserve GIST indexing
  )
  ORDER BY a.geom <-> ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)
  LIMIT 1;
$$;

-- 2. Redefine find_exact_address_in_parcel to mathematically curve the WGS84 GeoJSON plot coordinates into the localized LKS94 projection for exact address intersections
CREATE OR REPLACE FUNCTION public.find_exact_address_in_parcel(p_kadastro text)
RETURNS TABLE(full_address text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT a.full_address
  FROM public.official_addresses a
  JOIN public.parcels p ON (p.kadastro_nr = p_kadastro OR p.unikalus_nr = p_kadastro)
  WHERE ST_Intersects(
    a.geom, 
    ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(p.feature->'geometry'), 4326), 3346)
  )
  LIMIT 1;
END;
$$;
