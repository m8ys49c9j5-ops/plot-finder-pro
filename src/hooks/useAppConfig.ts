import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
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
  // Dynamic keys (buttons, content, pricing, pages)
  [key: string]: any;
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
  lock_market_value: true,
  lock_exact_address: false,
  lock_area: false,
  lock_purpose: false,
  lock_unique_number: false,
  lock_coordinates: false,
  lock_map: true,
  lock_ortho: true,
  feature_cadastral_search: true,
  feature_map_identify: true,
  feature_ortho_layer: true,
  feature_pricing_modal: true,
  feature_landing_page: true,
  maintenance_mode: false,
  free_credits_on_signup: 0,
  report_sections_order: ["found_banner", "map", "basic_info", "market_value", "technical", "address"],
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

// ── Parse raw rows into typed config ──────────────────────────────────────────
function parseRows(rows: AppConfigRow[]): AppConfig {
  const cfg: AppConfig = { ...DEFAULTS };
  for (const row of rows) {
    const k = row.key as keyof AppConfig;
    const v = row.value;
    if (typeof DEFAULTS[k] === "boolean") {
      (cfg as any)[k] = v === true || v === "true";
    } else if (typeof DEFAULTS[k] === "number") {
      (cfg as any)[k] = Number(v);
    } else if (Array.isArray(DEFAULTS[k])) {
      (cfg as any)[k] = Array.isArray(v) ? v : JSON.parse(String(v));
    }
  }
  return cfg;
}

// ── Provider ───────────────────────────────────────────────────────────────────
export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULTS);
  const [rows, setRows] = useState<AppConfigRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.from("app_config").select("*").order("group_name").order("key");

    if (!error && data) {
      setRows(data as AppConfigRow[]);
      setConfig(parseRows(data as AppConfigRow[]));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isLocked = useCallback((field: keyof AppConfig) => Boolean(config[field]), [config]);

  return React.createElement(
    AppConfigContext.Provider,
    { value: { config, rows, loading, refresh, isLocked } },
    children,
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useAppConfig() {
  return useContext(AppConfigContext);
}
