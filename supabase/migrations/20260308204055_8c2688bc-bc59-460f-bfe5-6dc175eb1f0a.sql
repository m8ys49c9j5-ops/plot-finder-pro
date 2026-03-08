CREATE INDEX IF NOT EXISTS idx_raw_addresses_gat_kodas ON public.raw_addresses (gat_kodas);

CREATE OR REPLACE FUNCTION public.build_official_addresses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '0'
AS $$
BEGIN
  TRUNCATE TABLE official_addresses;

  INSERT INTO official_addresses (aob_kodas, full_address, geom)
  SELECT
    a.aob_kodas,
    concat_ws(' ', s.vardas_k, s.tipo_santrumpa, a.nr) AS full_address,
    ST_SetSRID(ST_MakePoint(p.x_koord, p.y_koord), 3346) AS geom
  FROM raw_addresses a
  JOIN raw_streets s ON a.gat_kodas = s.gat_kodas
  JOIN raw_points p ON a.aob_kodas = p.aob_kodas;
END;
$$;