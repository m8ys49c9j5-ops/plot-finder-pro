import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Raw row from DB ────────────────────────────────────────────────────────────
export interface AppConfigRow {
  key: string;
  value: any;
  label: string | null;
  description: string | null;
  group_name: string;
  updated_at: string;
}

// ── Button config shape ────────────────────────────────────────────────────────
export interface ButtonConfig {
  label: string;
  href: string;
  enabled: boolean;
}

// ── Pricing tier shape ─────────────────────────────────────────────────────────
export interface PricingTier {
  name: string;
  credits: number;
  price: string;
  perSearch: string;
  popular: boolean;
  save: string;
  enabled: boolean;
}

// ── Full typed config object ───────────────────────────────────────────────────
export interface AppConfig {
  // Field locks (true = requires credit)
  lock_cadastral_number: boolean;
  lock_unique_number: boolean;
  lock_address: boolean;
  lock_coordinates: boolean;
  lock_area: boolean;
  lock_purpose: boolean;
  lock_formation_date: boolean;
  lock_market_value: boolean;
  lock_valuation_date: boolean;
  lock_measurement_type: boolean;
  lock_productivity: boolean;
  lock_special_conditions: boolean;
  lock_cadastral_map: boolean;
  lock_ortho_map: boolean;
  lock_interactive_map: boolean;
  // Features
  feature_landing_page: boolean;
  feature_cadastral_search: boolean;
  feature_map_identify: boolean;
  feature_ortho_layer: boolean;
  feature_pricing_modal: boolean;
  feature_apple_signin: boolean;
  feature_sample_report: boolean;
  feature_report_page: boolean;
  feature_map_attribution: boolean;
  maintenance_mode: boolean;
  // Buttons (keyed by button id)
  buttons: Record<string, ButtonConfig>;
  // Content strings
  content: Record<string, string>;
  // Pricing tiers
  pricing: PricingTier[];
  // Pages
  page_home: string;
  pages_visible: Record<string, boolean>;
  // Settings
  free_credits_on_signup: number;
  credits_per_unlock: number;
  report_sections_order: string[];
  support_email: string;
}

// ── Defaults ───────────────────────────────────────────────────────────────────
const DEFAULT_BUTTONS: Record<string, ButtonConfig> = {
  btn_nav_signin:        { label: "Sign in",          href: "/auth",               enabled: true },
  btn_nav_try_free:      { label: "Try for free",     href: "/map",                enabled: true },
  btn_hero_search:       { label: "Search",           href: "/map",                enabled: true },
  btn_features_cta:      { label: "Try now →",        href: "/map",                enabled: true },
  btn_pricing_starter:   { label: "Get started",      href: "/map",                enabled: true },
  btn_pricing_popular:   { label: "Get started",      href: "/map",                enabled: true },
  btn_pricing_pro:       { label: "Get started",      href: "/map",                enabled: true },
  btn_final_cta:         { label: "Try for free →",   href: "/map",                enabled: true },
  btn_map_signin:        { label: "Sign in",          href: "/auth",               enabled: true },
  btn_report_unlock:     { label: "Unlock report (1 credit)", href: "action:unlock", enabled: true },
  btn_report_back:       { label: "← Back to map",   href: "/map",                enabled: true },
  btn_report_sample_cta: { label: "Unlock my real report", href: "action:scroll_cta", enabled: true },
};

const DEFAULT_CONTENT: Record<string, string> = {
  content_app_name:           "ŽemėPro",
  content_hero_title:         "ŽemėPro",
  content_hero_subtitle1:     "Fast and convenient information about any Lithuanian parcel.",
  content_hero_subtitle2:     "Check the location, basic data and key information in seconds.",
  content_hero_trust:         "Convenient  •  Fast  •  Accessible",
  content_why_title:          "Why use ŽemėPro?",
  content_why_1_title:        "Save time",
  content_why_1_desc:         "All the key information about a parcel in one place.",
  content_why_2_title:        "Get a primary parcel analysis",
  content_why_2_desc:         "Key data helps you quickly assess parcel potential.",
  content_why_3_title:        "See the exact parcel location",
  content_why_3_desc:         "Interactive map helps understand the surroundings.",
  content_report_section_title: "Everything in one report",
  content_pricing_title:      "Pay only when you use it",
  content_pricing_subtitle:   "No subscriptions · No monthly fees · Credits never expire",
  content_faq_title:          "Frequently asked questions",
  content_cta_title:          "Start for free today",
  content_cta_subtitle:       "Get your first report in 60 seconds. Registration is free.",
  content_footer_attribution: "Data: Geoportal.lt · Registry Centre · NLA",
  content_report_unlock_title:"Unlock the full parcel report",
  content_search_placeholder: "Enter address, cadastral number or click a parcel on the map",
  content_maintenance_title:  "We'll be right back",
  content_maintenance_msg:    "ŽemėPro is currently undergoing scheduled maintenance.",
};

const DEFAULT_PRICING: PricingTier[] = [
  { name: "Starter",      credits: 1,  price: "€1.99",  perSearch: "€1.99 / search", popular: false, save: "",     enabled: true },
  { name: "Popular",      credits: 10, price: "€9.99",  perSearch: "€1.00 / search", popular: true,  save: "−50%", enabled: true },
  { name: "Professional", credits: 30, price: "€19.99", perSearch: "€0.67 / search", popular: false, save: "−66%", enabled: true },
];

const DEFAULTS: AppConfig = {
  lock_cadastral_number: false, lock_unique_number: false,
  lock_address: false, lock_coordinates: false, lock_area: false,
  lock_purpose: false, lock_formation_date: false, lock_market_value: true,
  lock_valuation_date: true, lock_measurement_type: false, lock_productivity: true,
  lock_special_conditions: true, lock_cadastral_map: true, lock_ortho_map: true,
  lock_interactive_map: true,
  feature_landing_page: true, feature_cadastral_search: true, feature_map_identify: true,
  feature_ortho_layer: true, feature_pricing_modal: true, feature_apple_signin: true,
  feature_sample_report: true, feature_report_page: true, feature_map_attribution: true,
  maintenance_mode: false,
  buttons: DEFAULT_BUTTONS,
  content: DEFAULT_CONTENT,
  pricing: DEFAULT_PRICING,
  page_home: "landing",
  pages_visible: { landing: true, map: true, auth: true, auditas: false, admin: true },
  free_credits_on_signup: 0,
  credits_per_unlock: 1,
  report_sections_order: ["found_banner", "map", "basic_info", "market_value", "technical", "address"],
  support_email: "support@zemepro.lt",
};

// ── Parse raw rows ─────────────────────────────────────────────────────────────
function parseRows(rows: AppConfigRow[]): AppConfig {
  const cfg: AppConfig = JSON.parse(JSON.stringify(DEFAULTS));

  for (const row of rows) {
    const k = row.key;
    const v = row.value;

    // Boolean fields
    if (k.startsWith("lock_") || k.startsWith("feature_") || k === "maintenance_mode") {
      (cfg as any)[k] = v === true || v === "true";
      continue;
    }
    // Buttons
    if (k.startsWith("btn_")) {
      try { cfg.buttons[k] = typeof v === "object" ? v : JSON.parse(v); } catch {}
      continue;
    }
    // Content
    if (k.startsWith("content_")) {
      cfg.content[k] = typeof v === "string" ? v : String(v);
      continue;
    }
    // Pricing tiers
    if (k === "pricing_tier_1") { try { cfg.pricing[0] = typeof v === "object" ? v : JSON.parse(v); } catch {} continue; }
    if (k === "pricing_tier_2") { try { cfg.pricing[1] = typeof v === "object" ? v : JSON.parse(v); } catch {} continue; }
    if (k === "pricing_tier_3") { try { cfg.pricing[2] = typeof v === "object" ? v : JSON.parse(v); } catch {} continue; }
    // Pages
    if (k === "page_home") { cfg.page_home = typeof v === "string" ? v : String(v); continue; }
    if (k.startsWith("page_visible_")) {
      const pageName = k.replace("page_visible_", "");
      cfg.pages_visible[pageName] = v === true || v === "true";
      continue;
    }
    // Settings
    if (k === "free_credits_on_signup") { cfg.free_credits_on_signup = Number(v); continue; }
    if (k === "credits_per_unlock")     { cfg.credits_per_unlock = Number(v); continue; }
    if (k === "support_email")          { cfg.support_email = typeof v === "string" ? v : String(v); continue; }
    if (k === "report_sections_order") {
      try { cfg.report_sections_order = Array.isArray(v) ? v : JSON.parse(v); } catch {}
    }
  }

  return cfg;
}

// ── Context ────────────────────────────────────────────────────────────────────
interface AppConfigContextType {
  config: AppConfig;
  rows: AppConfigRow[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const AppConfigContext = createContext<AppConfigContextType>({
  config: DEFAULTS,
  rows: [],
  loading: true,
  refresh: async () => {},
});

// ── Provider (no JSX — uses React.createElement so this file stays .ts) ────────
export function AppConfigProvider(props: { children: React.ReactNode }) {
  const [config, setConfig]   = useState<AppConfig>(DEFAULTS);
  const [rows, setRows]       = useState<AppConfigRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("app_config")
      .select("*")
      .order("group_name")
      .order("key");
    if (!error && data) {
      setRows(data as AppConfigRow[]);
      setConfig(parseRows(data as AppConfigRow[]));
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return React.createElement(
    AppConfigContext.Provider,
    { value: { config, rows, loading, refresh } },
    props.children
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useAppConfig() {
  return useContext(AppConfigContext);
}
