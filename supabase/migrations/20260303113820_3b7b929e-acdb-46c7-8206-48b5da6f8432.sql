-- Add bounding box columns for fast spatial lookups
ALTER TABLE public.parcels
  ADD COLUMN IF NOT EXISTS bbox_min_x double precision,
  ADD COLUMN IF NOT EXISTS bbox_min_y double precision,
  ADD COLUMN IF NOT EXISTS bbox_max_x double precision,
  ADD COLUMN IF NOT EXISTS bbox_max_y double precision;

-- Create index for spatial queries
CREATE INDEX IF NOT EXISTS idx_parcels_bbox ON public.parcels (bbox_min_x, bbox_max_x, bbox_min_y, bbox_max_y)
  WHERE bbox_min_x IS NOT NULL;