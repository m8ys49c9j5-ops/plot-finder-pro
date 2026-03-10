
-- ============================================================
-- ŽemėPro app_config table — full schema v2
-- ============================================================

-- Make group_name NOT NULL with default
ALTER TABLE public.app_config ALTER COLUMN group_name SET NOT NULL;
ALTER TABLE public.app_config ALTER COLUMN group_name SET DEFAULT 'settings';

-- Drop and recreate policies
DROP POLICY IF EXISTS "Public read app_config" ON public.app_config;
DROP POLICY IF EXISTS "Authenticated users can update app_config" ON public.app_config;

CREATE POLICY "Public read app_config"
  ON public.app_config FOR SELECT USING (true);

CREATE POLICY "Authenticated users can update app_config"
  ON public.app_config FOR ALL USING (auth.role() = 'authenticated');

-- Timestamp trigger
CREATE OR REPLACE FUNCTION update_app_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS app_config_updated_at ON public.app_config;
CREATE TRIGGER app_config_updated_at
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW EXECUTE FUNCTION update_app_config_timestamp();

-- ============================================================
-- GROUP: field_locks
-- ============================================================
INSERT INTO public.app_config (key, value, label, description, group_name) VALUES
  ('lock_cadastral_number',   'false', 'Cadastral Number',       'Require credit to view cadastral number',             'field_locks'),
  ('lock_unique_number',      'false', 'Unique Registry Number', 'Require credit to view unique NT registry number',    'field_locks'),
  ('lock_address',            'false', 'Exact Address',          'Require credit to view exact registered address',     'field_locks'),
  ('lock_coordinates',        'false', 'Coordinates',            'Require credit to view GPS coordinates',              'field_locks'),
  ('lock_area',               'false', 'Area (ha)',              'Require credit to view registered land area',         'field_locks'),
  ('lock_purpose',            'false', 'Land Purpose',           'Require credit to view official land use purpose',    'field_locks'),
  ('lock_formation_date',     'false', 'Formation Date',         'Require credit to view parcel formation date',        'field_locks'),
  ('lock_market_value',       'true',  'Market Value',           'Require credit to view average market value (€)',     'field_locks'),
  ('lock_valuation_date',     'true',  'Valuation Date',         'Require credit to view last valuation date',          'field_locks'),
  ('lock_measurement_type',   'false', 'Measurement Type',       'Require credit to view measurement type',             'field_locks'),
  ('lock_productivity',       'true',  'Productivity Score',     'Require credit to view land productivity score',      'field_locks'),
  ('lock_special_conditions', 'true',  'Special Conditions',     'Require credit to view special legal conditions',     'field_locks'),
  ('lock_cadastral_map',      'true',  'Cadastral Map Image',    'Require credit to view cadastral map preview',        'field_locks'),
  ('lock_ortho_map',          'true',  'Satellite Image',        'Require credit to view orthophoto/satellite view',    'field_locks'),
  ('lock_interactive_map',    'true',  'Interactive Map',        'Require credit to use the full interactive map',      'field_locks')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- GROUP: features
-- ============================================================
INSERT INTO public.app_config (key, value, label, description, group_name) VALUES
  ('feature_landing_page',     'true',  'Landing Page',          'Show marketing landing page at /',                                    'features'),
  ('feature_cadastral_search', 'true',  'Cadastral Search',      'Allow searching by cadastral number in the search bar',               'features'),
  ('feature_map_identify',     'true',  'Map Click Identify',    'Allow clicking on the map to identify parcels',                       'features'),
  ('feature_ortho_layer',      'true',  'Satellite Layer',       'Show satellite/orthophoto layer toggle button on map',                'features'),
  ('feature_pricing_modal',    'true',  'Pricing Modal',         'Show the credit purchase pricing modal',                              'features'),
  ('feature_apple_signin',     'true',  'Apple Sign-In',         'Show "Sign in with Apple" button on auth forms',                     'features'),
  ('feature_sample_report',    'true',  'Sample Report Preview', 'Show blurred sample report below the unlock CTA on locked reports',   'features'),
  ('feature_report_page',      'true',  'Report Page',           'Enable the full report page after unlocking a parcel',               'features'),
  ('feature_map_attribution',  'true',  'Map Attribution',       'Show attribution on the map',                                        'features'),
  ('maintenance_mode',         'false', 'Maintenance Mode',      'Show maintenance banner to all non-admin users',                      'features')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- GROUP: buttons
-- ============================================================
INSERT INTO public.app_config (key, value, label, description, group_name) VALUES
  ('btn_nav_signin',        '{"label":"Sign in","href":"/auth","enabled":true}',              'Nav → Sign In',              'Landing page navbar sign in button',                         'buttons'),
  ('btn_nav_try_free',      '{"label":"Try for free","href":"/map","enabled":true}',          'Nav → Try For Free',         'Landing page navbar primary CTA button',                     'buttons'),
  ('btn_hero_search',       '{"label":"Search","href":"/map","enabled":true}',                'Hero → Search Button',       'Search button inside the hero search bar',                   'buttons'),
  ('btn_why_scroll',        '{"label":"Why ŽemėPro?","href":"#why","enabled":true}',         'Nav → Why ŽemėPro link',     'Landing navbar scroll link to Why section',                  'buttons'),
  ('btn_pricing_scroll',    '{"label":"Pricing","href":"#pricing","enabled":true}',           'Nav → Pricing link',         'Landing navbar scroll link to Pricing section',              'buttons'),
  ('btn_features_cta',      '{"label":"Try now →","href":"/map","enabled":true}',             'Features → Try Now CTA',     'CTA button inside the report features section',              'buttons'),
  ('btn_pricing_starter',   '{"label":"Get started","href":"/map","enabled":true}',           'Pricing → Starter button',   'Action button on the Starter pricing card',                  'buttons'),
  ('btn_pricing_popular',   '{"label":"Get started","href":"/map","enabled":true}',           'Pricing → Popular button',   'Action button on the Popular pricing card',                  'buttons'),
  ('btn_pricing_pro',       '{"label":"Get started","href":"/map","enabled":true}',           'Pricing → Pro button',       'Action button on the Professional pricing card',             'buttons'),
  ('btn_final_cta',         '{"label":"Try for free →","href":"/map","enabled":true}',        'Final CTA button',           'Big CTA button at the bottom of the landing page',           'buttons'),
  ('btn_map_signin',        '{"label":"Sign in","href":"/auth","enabled":true}',              'Map → Sign In',              'Sign in button on the map page when not logged in',          'buttons'),
  ('btn_report_unlock',     '{"label":"Unlock report (1 credit)","href":"action:unlock","enabled":true}', 'Report → Unlock Button', 'Main unlock button on the locked report page',       'buttons'),
  ('btn_report_back',       '{"label":"← Back to map","href":"/map","enabled":true}',         'Report → Back to Map',       'Back navigation button at top of report page',               'buttons'),
  ('btn_report_sample_cta', '{"label":"Unlock my real report","href":"action:scroll_cta","enabled":true}', 'Report → Sample CTA', 'Unlock button inside the blurred sample report',       'buttons')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- GROUP: content
-- ============================================================
INSERT INTO public.app_config (key, value, label, description, group_name) VALUES
  ('content_app_name',         '"ŽemėPro"',                                                       'App Name',              'The brand name shown in logos and titles',                               'content'),
  ('content_hero_title',       '"ŽemėPro"',                                                       'Hero Title',            'Main headline shown on the landing page hero',                           'content'),
  ('content_hero_subtitle1',   '"Fast and convenient information about any Lithuanian parcel."',   'Hero Subtitle 1',       'First subtitle line below the hero title',                               'content'),
  ('content_hero_subtitle2',   '"Check the location, basic data and key information in seconds."','Hero Subtitle 2',       'Second subtitle / bold description line in hero',                        'content'),
  ('content_hero_trust',       '"Convenient  •  Fast  •  Accessible"',                            'Hero Trust Line',       'Short trust line shown below the search bar',                            'content'),
  ('content_why_title',        '"Why use ŽemėPro?"',                                             'Why Section Title',     'Heading for the Why section',                                            'content'),
  ('content_why_1_title',      '"Save time"',                                                     'Why #1 Title',          '',                                                                       'content'),
  ('content_why_1_desc',       '"All the key information about a parcel in one place."',          'Why #1 Description',    '',                                                                       'content'),
  ('content_why_2_title',      '"Get a primary parcel analysis"',                                 'Why #2 Title',          '',                                                                       'content'),
  ('content_why_2_desc',       '"Key data helps you quickly assess parcel potential."',           'Why #2 Description',    '',                                                                       'content'),
  ('content_why_3_title',      '"See the exact parcel location"',                                 'Why #3 Title',          '',                                                                       'content'),
  ('content_why_3_desc',       '"Interactive map helps understand the surroundings."',            'Why #3 Description',    '',                                                                       'content'),
  ('content_report_section_title', '"Everything in one report"',                                  'Report Section Title',  'Heading for the report features section on landing page',                'content'),
  ('content_pricing_title',    '"Pay only when you use it"',                                      'Pricing Title',         'Heading for the pricing section',                                        'content'),
  ('content_pricing_subtitle', '"No subscriptions · No monthly fees · Credits never expire"',    'Pricing Subtitle',      'Subtitle line below pricing title',                                      'content'),
  ('content_faq_title',        '"Frequently asked questions"',                                    'FAQ Title',             'Heading for the FAQ section',                                            'content'),
  ('content_cta_title',        '"Start for free today"',                                          'Final CTA Title',       'Headline in the final CTA section',                                      'content'),
  ('content_cta_subtitle',     '"Get your first report in 60 seconds. Registration is free."',   'Final CTA Subtitle',     'Subtitle in the final CTA section',                                      'content'),
  ('content_footer_attribution','"Data: Geoportal.lt · Registry Centre · NLA"',                  'Footer Attribution',    'Attribution text shown in the footer',                                   'content'),
  ('content_report_unlock_title', '"Unlock the full parcel report"',                             'Report Unlock Title',   'Heading shown on the locked report CTA card',                            'content'),
  ('content_search_placeholder', '"Enter address, cadastral number or click a parcel on the map"', 'Search Placeholder',  'Placeholder text in the search bar',                                    'content'),
  ('content_maintenance_title','"We''ll be right back"',                                          'Maintenance Title',     'Title shown during maintenance mode',                                    'content'),
  ('content_maintenance_msg',  '"ŽemėPro is currently undergoing scheduled maintenance."',       'Maintenance Message',   'Message shown to users during maintenance',                              'content')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- GROUP: pricing
-- ============================================================
INSERT INTO public.app_config (key, value, label, description, group_name) VALUES
  ('pricing_tier_1', '{"name":"Starter","credits":1,"price":"€1.99","perSearch":"€1.99 / search","popular":false,"save":"","enabled":true}',         'Pricing Tier 1 — Starter',      'Starter pricing tier config', 'pricing'),
  ('pricing_tier_2', '{"name":"Popular","credits":10,"price":"€9.99","perSearch":"€1.00 / search","popular":true,"save":"−50%","enabled":true}',       'Pricing Tier 2 — Popular',      'Popular pricing tier config', 'pricing'),
  ('pricing_tier_3', '{"name":"Professional","credits":30,"price":"€19.99","perSearch":"€0.67 / search","popular":false,"save":"−66%","enabled":true}','Pricing Tier 3 — Professional', 'Pro pricing tier config',     'pricing')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- GROUP: pages
-- ============================================================
INSERT INTO public.app_config (key, value, label, description, group_name) VALUES
  ('page_home',              '"landing"',                                                    'Home Page',             'Which page shows at /',                              'pages'),
  ('page_order',             '["landing","map","auth","admin"]',                             'Page Order',            'Display order of pages in admin overview',            'pages'),
  ('page_visible_landing',   'true',  'Landing Page Visible',   'Show the marketing landing page at /',           'pages'),
  ('page_visible_map',       'true',  'Map Page Visible',       'Show the map app at /map',                       'pages'),
  ('page_visible_auth',      'true',  'Auth Page Visible',      'Show login/register at /auth',                   'pages'),
  ('page_visible_auditas',   'false', 'Audit Page Visible',     'Show parcel audit page at /auditas',             'pages'),
  ('page_visible_admin',     'true',  'Admin Page Visible',     'Show admin panel at /admin',                     'pages')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- GROUP: settings
-- ============================================================
INSERT INTO public.app_config (key, value, label, description, group_name) VALUES
  ('free_credits_on_signup', '0',                                                              'Free Credits on Signup',     'Credits automatically given to new users on registration',  'settings'),
  ('report_sections_order',  '["found_banner","map","basic_info","market_value","technical","address"]', 'Report Section Order', 'Order in which sections appear in the full report',   'settings'),
  ('support_email',          '"support@zemepro.lt"',                                          'Support Email',              'Support contact email shown to users',                      'settings'),
  ('credits_per_unlock',     '1',                                                             'Credits Per Unlock',         'How many credits are deducted per report unlock',           'settings')
ON CONFLICT (key) DO NOTHING;
