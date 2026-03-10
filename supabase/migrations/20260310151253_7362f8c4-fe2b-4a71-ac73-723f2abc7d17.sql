-- Create app_config table for admin-controlled settings
CREATE TABLE IF NOT EXISTS public.app_config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  label       TEXT,
  description TEXT,
  group_name  TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read app_config"
  ON public.app_config FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can update app_config"
  ON public.app_config FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION update_app_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_config_updated_at
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW EXECUTE FUNCTION update_app_config_timestamp();