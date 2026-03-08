
-- Create raw tables for address import
CREATE TABLE IF NOT EXISTS raw_streets (
  gat_kodas TEXT PRIMARY KEY,
  tipas TEXT,
  tipo_santrumpa TEXT,
  vardas_k TEXT
);

CREATE TABLE IF NOT EXISTS raw_addresses (
  aob_kodas TEXT PRIMARY KEY,
  gat_kodas TEXT,
  nr TEXT
);

CREATE TABLE IF NOT EXISTS raw_points (
  aob_kodas TEXT PRIMARY KEY,
  x_koord FLOAT,
  y_koord FLOAT
);

-- Create the final combined spatial table
CREATE TABLE IF NOT EXISTS official_addresses (
  aob_kodas TEXT PRIMARY KEY,
  full_address TEXT,
  geom geometry(Point, 3346)
);

CREATE INDEX IF NOT EXISTS idx_official_addresses_geom ON official_addresses USING GIST(geom);

-- Disable RLS on raw tables (admin-only import)
ALTER TABLE raw_streets ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE official_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages raw_streets" ON raw_streets FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role manages raw_addresses" ON raw_addresses FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role manages raw_points" ON raw_points FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role manages official_addresses" ON official_addresses FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Public read official_addresses" ON official_addresses FOR SELECT USING (true);

-- RPC to merge the 3 raw tables into the official table
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to find the exact address inside a parcel's geometry
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
