-- Create a function that finds a parcel containing a given LKS94 point
-- by checking if the point falls within the bounding box of each parcel's geometry
CREATE OR REPLACE FUNCTION public.find_parcel_by_lks94_point(p_x double precision, p_y double precision)
RETURNS SETOF parcels
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.*
  FROM parcels p
  WHERE p.feature IS NOT NULL
    AND p.feature->'geometry' IS NOT NULL
    -- Check the point is roughly within the parcel's bounding extent
    -- We extract min/max coords from the first ring of the first polygon
    AND p_x BETWEEN 
      (SELECT MIN((coord->>0)::double precision) FROM jsonb_array_elements(
        CASE 
          WHEN p.feature->'geometry'->>'type' = 'MultiPolygon' THEN p.feature->'geometry'->'coordinates'->0->0
          WHEN p.feature->'geometry'->>'type' = 'Polygon' THEN p.feature->'geometry'->'coordinates'->0
          ELSE '[]'::jsonb
        END
      ) AS coord)
      AND
      (SELECT MAX((coord->>0)::double precision) FROM jsonb_array_elements(
        CASE 
          WHEN p.feature->'geometry'->>'type' = 'MultiPolygon' THEN p.feature->'geometry'->'coordinates'->0->0
          WHEN p.feature->'geometry'->>'type' = 'Polygon' THEN p.feature->'geometry'->'coordinates'->0
          ELSE '[]'::jsonb
        END
      ) AS coord)
    AND p_y BETWEEN
      (SELECT MIN((coord->>1)::double precision) FROM jsonb_array_elements(
        CASE 
          WHEN p.feature->'geometry'->>'type' = 'MultiPolygon' THEN p.feature->'geometry'->'coordinates'->0->0
          WHEN p.feature->'geometry'->>'type' = 'Polygon' THEN p.feature->'geometry'->'coordinates'->0
          ELSE '[]'::jsonb
        END
      ) AS coord)
      AND
      (SELECT MAX((coord->>1)::double precision) FROM jsonb_array_elements(
        CASE 
          WHEN p.feature->'geometry'->>'type' = 'MultiPolygon' THEN p.feature->'geometry'->'coordinates'->0->0
          WHEN p.feature->'geometry'->>'type' = 'Polygon' THEN p.feature->'geometry'->'coordinates'->0
          ELSE '[]'::jsonb
        END
      ) AS coord)
  LIMIT 5;
$$;