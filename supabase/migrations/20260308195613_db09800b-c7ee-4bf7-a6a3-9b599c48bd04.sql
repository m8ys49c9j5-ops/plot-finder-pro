
-- Fix search_path for the two new functions
CREATE OR REPLACE FUNCTION build_official_addresses() RETURNS void AS $$
BEGIN
  TRUNCATE TABLE official_addresses;
  INSERT INTO official_addresses (aob_kodas, full_address, geom)
  SELECT
    a.aob_kodas,
    s.vardas_k || ' ' || s.tipo_santrumpa || ' ' || a.nr AS full_address,
    ST_SetSRID(ST_MakePoint(p.x_koord, p.y_koord), 3346) as geom
  FROM raw_addresses a
  JOIN raw_streets s ON a.gat_kodas = s.gat_kodas
  JOIN raw_points p ON a.aob_kodas = p.aob_kodas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION find_exact_address_in_parcel(p_kadastro text)
RETURNS TABLE(full_address text) AS $$
BEGIN
  RETURN QUERY
  SELECT a.full_address
  FROM official_addresses a
  JOIN parcels p ON (p.kadastro_nr = p_kadastro OR p.unikalus_nr = p_kadastro)
  WHERE ST_Intersects(a.geom, ST_SetSRID(ST_GeomFromGeoJSON(p.feature->'geometry'), 3346))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
