
-- Update all button labels to Lithuanian
UPDATE app_config SET value = '{"enabled":true,"href":"/map","label":"Išbandyti dabar →"}'::jsonb WHERE key = 'btn_features_cta';
UPDATE app_config SET value = '{"enabled":true,"href":"/map","label":"Išbandyti nemokamai →"}'::jsonb WHERE key = 'btn_final_cta';
UPDATE app_config SET value = '{"enabled":true,"href":"/map","label":"Ieškoti"}'::jsonb WHERE key = 'btn_hero_search';
UPDATE app_config SET value = '{"enabled":true,"href":"/login","label":"Prisijungti"}'::jsonb WHERE key = 'btn_map_signin';
UPDATE app_config SET value = '{"enabled":true,"href":"/login","label":"Prisijungti"}'::jsonb WHERE key = 'btn_nav_signin';
UPDATE app_config SET value = '{"enabled":true,"href":"/map","label":"Išbandyti nemokamai"}'::jsonb WHERE key = 'btn_nav_try_free';
UPDATE app_config SET value = '{"enabled":true,"href":"/map","label":"Pradėti"}'::jsonb WHERE key = 'btn_pricing_popular';
UPDATE app_config SET value = '{"enabled":true,"href":"/map","label":"Pradėti"}'::jsonb WHERE key = 'btn_pricing_pro';
UPDATE app_config SET value = '{"enabled":true,"href":"#pricing","label":"Kainos"}'::jsonb WHERE key = 'btn_pricing_scroll';
UPDATE app_config SET value = '{"enabled":true,"href":"/map","label":"Pradėti"}'::jsonb WHERE key = 'btn_pricing_starter';
UPDATE app_config SET value = '{"enabled":true,"href":"/map","label":"← Grįžti į žemėlapį"}'::jsonb WHERE key = 'btn_report_back';
UPDATE app_config SET value = '{"enabled":true,"href":"action:scroll_cta","label":"Atrakinti savo tikrą ataskaitą"}'::jsonb WHERE key = 'btn_report_sample_cta';
UPDATE app_config SET value = '{"enabled":true,"href":"action:unlock","label":"Atrakinti ataskaitą (1 kreditas)"}'::jsonb WHERE key = 'btn_report_unlock';
UPDATE app_config SET value = '{"enabled":true,"href":"#why","label":"Kodėl ŽemėPro?"}'::jsonb WHERE key = 'btn_why_scroll';

-- Update all content texts to Lithuanian
UPDATE app_config SET value = '"Gaukite pirmąją ataskaitą per 60 sekundžių. Registracija nemokama."'::jsonb WHERE key = 'content_cta_subtitle';
UPDATE app_config SET value = '"Pradėkite nemokamai jau šiandien"'::jsonb WHERE key = 'content_cta_title';
UPDATE app_config SET value = '"Dažniausiai užduodami klausimai"'::jsonb WHERE key = 'content_faq_title';
UPDATE app_config SET value = '"Duomenys: ©OpenStreetMap · Geoportal.lt · Registrų centras · NŽT"'::jsonb WHERE key = 'content_footer_attribution';
UPDATE app_config SET value = '"Greita ir patogi informacija apie bet kurį Lietuvos sklypą."'::jsonb WHERE key = 'content_hero_subtitle1';
UPDATE app_config SET value = '"Patikrinkite vietą, pagrindinius duomenis ir svarbiausią informaciją per kelias sekundes."'::jsonb WHERE key = 'content_hero_subtitle2';
UPDATE app_config SET value = '"Patogu  •  Greita  •  Prieinama"'::jsonb WHERE key = 'content_hero_trust';
UPDATE app_config SET value = '"ŽemėPro šiuo metu atliekama planinė priežiūra."'::jsonb WHERE key = 'content_maintenance_msg';
UPDATE app_config SET value = '"Greitai grįšime"'::jsonb WHERE key = 'content_maintenance_title';
UPDATE app_config SET value = '"Jokių prenumeratų · Jokių mėnesinių mokesčių · Kreditai negalioja"'::jsonb WHERE key = 'content_pricing_subtitle';
UPDATE app_config SET value = '"Mokate tik kai naudojate"'::jsonb WHERE key = 'content_pricing_title';
UPDATE app_config SET value = '"Viskas vienoje ataskaitoje"'::jsonb WHERE key = 'content_report_section_title';
UPDATE app_config SET value = '"Atrakinti pilną sklypo ataskaitą"'::jsonb WHERE key = 'content_report_unlock_title';
UPDATE app_config SET value = '"Įveskite sklypo kadastrinį arba unikalų numerį"'::jsonb WHERE key = 'content_search_placeholder';
UPDATE app_config SET value = '"Visa svarbiausia informacija apie sklypą vienoje vietoje."'::jsonb WHERE key = 'content_why_1_desc';
UPDATE app_config SET value = '"Taupote laiką"'::jsonb WHERE key = 'content_why_1_title';
UPDATE app_config SET value = '"Pagrindiniai duomenys padeda greitai įvertinti sklypo potencialą."'::jsonb WHERE key = 'content_why_2_desc';
UPDATE app_config SET value = '"Gaunate pirminę sklypo analizę"'::jsonb WHERE key = 'content_why_2_title';
UPDATE app_config SET value = '"Interaktyvus žemėlapis leidžia lengvai suprasti aplinką ir kaimynystę."'::jsonb WHERE key = 'content_why_3_desc';
UPDATE app_config SET value = '"Matote tikslią sklypo vietą"'::jsonb WHERE key = 'content_why_3_title';
UPDATE app_config SET value = '"Kodėl verta naudoti ŽemėPro?"'::jsonb WHERE key = 'content_why_title';
