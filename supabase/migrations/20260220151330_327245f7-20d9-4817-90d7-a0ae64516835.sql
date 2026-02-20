-- Add indexes for fast search on parcels table
CREATE INDEX IF NOT EXISTS idx_parcels_kadastro_nr ON public.parcels (kadastro_nr);
CREATE INDEX IF NOT EXISTS idx_parcels_unikalus_nr ON public.parcels (unikalus_nr);
CREATE INDEX IF NOT EXISTS idx_parcels_sav_kodas ON public.parcels (sav_kodas);
