
-- 1. FIX app_config RLS
DROP POLICY IF EXISTS "Authenticated users can update app_config" ON public.app_config;

CREATE POLICY "Authenticated users can write app_config"
  ON public.app_config FOR ALL
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. USER ROLES TABLE
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read user_roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated write user_roles"
  ON public.user_roles FOR ALL
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. THEME CONFIG ROWS
INSERT INTO public.app_config (key, value, label, description, group_name) VALUES
  ('theme_primary_hsl',    '"160 84% 39%"', 'Primary Color (HSL)',      'Main brand color — HSL without wrapper e.g. 160 84% 39%',   'theme'),
  ('theme_primary_fg',     '"0 0% 100%"',   'Primary Foreground (HSL)', 'Text on primary buttons e.g. 0 0% 100%',                    'theme'),
  ('theme_background_hsl', '"220 20% 97%"', 'Page Background (HSL)',    'Overall page background',                                   'theme'),
  ('theme_card_hsl',       '"0 0% 100%"',   'Card Background (HSL)',    'Cards and sidebars',                                        'theme'),
  ('theme_muted_hsl',      '"210 20% 96%"', 'Muted Surface (HSL)',      'Subtle background areas',                                   'theme'),
  ('theme_border_hsl',     '"214 20% 90%"', 'Border Color (HSL)',       'Lines and dividers',                                        'theme'),
  ('theme_foreground_hsl', '"222 47% 11%"', 'Text Color (HSL)',         'Primary body text',                                         'theme')
ON CONFLICT (key) DO NOTHING;

-- 4. MAP CONFIG ROWS
INSERT INTO public.app_config (key, value, label, description, group_name) VALUES
  ('map_default_lat',   '55.1694',    'Default Latitude',    'Map center latitude on initial load (decimal degrees)',         'map'),
  ('map_default_lng',   '23.8813',    'Default Longitude',   'Map center longitude on initial load (decimal degrees)',        'map'),
  ('map_default_zoom',  '8',          'Default Zoom Level',  'Initial zoom 1=world · 8=country · 13=city · 18=street',       'map'),
  ('map_default_layer', '"standard"', 'Default Base Layer',  '"standard" (Geoportal topo) or "ortho" (satellite)',            'map')
ON CONFLICT (key) DO NOTHING;
