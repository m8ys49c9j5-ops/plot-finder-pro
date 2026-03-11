import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface AppConfig {
  // Field locks
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
  // Feature flags
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
  // Settings
  free_credits_on_signup: number;
  report_sections_order: string[];
  support_email: string;
  credits_per_unlock: number;
  // Theme (HSL strings without hsl() wrapper, e.g. "160 84% 39%")
  theme_primary_hsl: string;
  theme_primary_fg: string;
  theme_background_hsl: string;
  theme_card_hsl: string;
  theme_muted_hsl: string;
  theme_border_hsl: string;
  theme_foreground_hsl: string;
  // Map
  map_default_lat: number;
  map_default_lng: number;
  map_default_zoom: number;
  map_default_layer: "standard" | "ortho";
  // Dynamic keys (buttons, content, pricing, pages)
  [key: string]: any;
}

export interface ButtonConfig {
  label: string;
  href: string;
  enabled: boolean;
}

export interface PricingTier {
  name: string;
  credits: number;
  price: string;
  perSearch: string;
  popular: boolean;
  save: string;
  enabled: boolean;
}

export interface AppConfigRow {
  key: string;
  value: any;
  label: string | null;
  description: string | null;
  group_name: string | null;
  updated_at: string;
}

const DEFAULTS: AppConfig = {
  lock_cadastral_number: false,
  lock_unique_number: false,
  lock_address: false,
  lock_coordinates: false,
  lock_area: false,
  lock_purpose: false,
  lock_formation_date: false,
  lock_market_value: true,
  lock_valuation_date: true,
  lock_measurement_type: false,
  lock_productivity: true,
  lock_special_conditions: true,
  lock_cadastral_map: true,
  lock_ortho_map: true,
  lock_interactive_map: true,
  feature_landing_page: true,
  feature_cadastral_search: true,
  feature_map_identify: true,
  feature_ortho_layer: true,
  feature_pricing_modal: true,
  feature_apple_signin: true,
  feature_sample_report: true,
  feature_report_page: true,
  feature_map_attribution: true,
  maintenance_mode: false,
  free_credits_on_signup: 0,
  report_sections_order: ["found_banner", "map", "basic_info", "market_value", "technical", "address"],
  support_email: "support@zemepro.lt",
  credits_per_unlock: 1,
  // Theme defaults (match index.css :root)
  theme_primary_hsl:    "160 84% 39%",
  theme_primary_fg:     "0 0% 100%",
  theme_background_hsl: "220 20% 97%",
  theme_card_hsl:       "0 0% 100%",
  theme_muted_hsl:      "210 20% 96%",
  theme_border_hsl:     "214 20% 90%",
  theme_foreground_hsl: "222 47% 11%",
  // Map defaults
  map_default_lat:   55.1694,
  map_default_lng:   23.8813,
  map_default_zoom:  8,
  map_default_layer: "standard",
};

// ── Context ────────────────────────────────────────────────────────────────────
interface AppConfigContextType {
  config: AppConfig;
  rows: AppConfigRow[];
  loading: boolean;
  refresh: () => Promise<void>;
  isLocked: (field: keyof AppConfig) => boolean;
}

const AppConfigContext = createContext<AppConfigContextType>({
  config: DEFAULTS,
  rows: [],
  loading: true,
  refresh: async () => {},
  isLocked: () => true,
});

// ── Parse raw rows ─────────────────────────────────────────────────────────────
function parseRows(rows: AppConfigRow[]): AppConfig {
  const cfg: AppConfig = { ...DEFAULTS };
  for (const row of rows) {
    const k = row.key;
    const v = row.value;
    const def = DEFAULTS[k];
    if (typeof def === "boolean") {
      cfg[k] = v === true || v === "true";
    } else if (typeof def === "number") {
      cfg[k] = Number(v);
    } else if (Array.isArray(def)) {
      cfg[k] = Array.isArray(v) ? v : JSON.parse(String(v));
    } else if (typeof def === "string") {
      cfg[k] = typeof v === "string" ? v : String(v);
    } else {
      cfg[k] = v;
    }
  }
  return cfg;
}

// ── Apply theme to CSS variables ───────────────────────────────────────────────
export function applyThemeToCss(cfg: AppConfig) {
  const root = document.documentElement;
  root.style.setProperty("--primary",            cfg.theme_primary_hsl);
  root.style.setProperty("--primary-foreground", cfg.theme_primary_fg);
  root.style.setProperty("--background",         cfg.theme_background_hsl);
  root.style.setProperty("--card",               cfg.theme_card_hsl);
  root.style.setProperty("--muted",              cfg.theme_muted_hsl);
  root.style.setProperty("--border",             cfg.theme_border_hsl);
  root.style.setProperty("--foreground",         cfg.theme_foreground_hsl);
}

// ── Provider ───────────────────────────────────────────────────────────────────
export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULTS);
  const [rows, setRows] = useState<AppConfigRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("app_config")
      .select("*")
      .order("group_name")
      .order("key");

    if (!error && data) {
      const parsed = parseRows(data as AppConfigRow[]);
      setRows(data as AppConfigRow[]);
      setConfig(parsed);
      applyThemeToCss(parsed);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    // Realtime: any change to app_config refreshes all open tabs instantly
    const channel = supabase
      .channel("app_config_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_config" }, () => {
        refresh();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  const isLocked = useCallback(
    (field: keyof AppConfig) => Boolean(config[field]),
    [config]
  );

  return React.createElement(
    AppConfigContext.Provider,
    { value: { config, rows, loading, refresh, isLocked } },
    children
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useAppConfig() {
  return useContext(AppConfigContext);
}
