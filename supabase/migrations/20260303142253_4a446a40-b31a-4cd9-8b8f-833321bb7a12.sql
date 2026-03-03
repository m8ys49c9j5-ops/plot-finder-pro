
CREATE OR REPLACE FUNCTION public.find_parcel_by_bbox(p_x double precision, p_y double precision)
RETURNS TABLE(feature jsonb, kadastro_nr text, unikalus_nr text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.feature, p.kadastro_nr, p.unikalus_nr
  FROM parcels p
  WHERE p.bbox_min_x <= p_x
    AND p.bbox_max_x >= p_x
    AND p.bbox_min_y <= p_y
    AND p.bbox_max_y >= p_y
  LIMIT 5;
$$;
