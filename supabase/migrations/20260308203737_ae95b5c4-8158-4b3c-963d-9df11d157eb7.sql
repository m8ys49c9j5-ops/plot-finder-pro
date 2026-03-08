
CREATE OR REPLACE FUNCTION build_official_addresses() RETURNS void AS $$
BEGIN
  -- Set a longer timeout for this heavy operation
  SET LOCAL statement_timeout = '300s';
  
  TRUNCATE TABLE official_addresses;
  INSERT INTO official_addresses (aob_kodas, full_address, geom)
  SELECT a.aob_kodas,
         s.vardas_k || ' ' || s.tipo_santrumpa || ' ' || a.nr AS full_address,
         ST_SetSRID(ST_MakePoint(p.x_koord, p.y_koord), 3346) as geom
  FROM raw_addresses a
  JOIN raw_streets s ON a.gat_kodas = s.gat_kodas
  JOIN raw_points p ON a.aob_kodas = p.aob_kodas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
