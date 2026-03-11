import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppConfig, applyThemeToCss, type AppConfigRow, type ButtonConfig, type PricingTier } from "@/hooks/useAppConfig";
import { toast } from "sonner";

// ─── CHANGE THIS to your admin email ─────────────────────────────────────────
const ADMIN_EMAILS: string[] = ["aidasaleksonis@gmail.com"];

// ─── Inline SVG icons (no lucide dep issues) ──────────────────────────────────
type IcoProps = { d?: string; size?: number; children?: React.ReactNode };
const I = ({ d, size = 16, children }: IcoProps) =>
  React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
    d ? React.createElement("path", { d }) : children);

const icons = {
  dashboard:  () => React.createElement(I, { size: 18 }, React.createElement("rect", { x: 3, y: 3, width: 7, height: 7 }), React.createElement("rect", { x: 14, y: 3, width: 7, height: 7 }), React.createElement("rect", { x: 14, y: 14, width: 7, height: 7 }), React.createElement("rect", { x: 3, y: 14, width: 7, height: 7 })),
  pages:      () => React.createElement(I, { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8", size: 18 }),
  buttons:    () => React.createElement(I, { d: "M5 12h14M12 5l7 7-7 7", size: 18 }),
  content:    () => React.createElement(I, { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z", size: 18 }),
  lock:       () => React.createElement(I, { size: 18 }, React.createElement("rect", { x: 3, y: 11, width: 18, height: 11, rx: 2, ry: 2 }), React.createElement("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })),
  features:   () => React.createElement(I, { d: "M13 2 3 14h9l-1 8 10-12h-9z", size: 18 }),
  pricing:    () => React.createElement(I, { d: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM12 6v6l4 2", size: 18 }),
  settings:   () => React.createElement(I, { d: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm0-6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z", size: 18 }),
  chevDown:   () => React.createElement(I, { d: "M6 9l6 6 6-6", size: 16 }),
  chevRight:  () => React.createElement(I, { d: "M9 18l6-6-6-6", size: 16 }),
  up:         () => React.createElement(I, { d: "M18 15l-6-6-6 6", size: 14 }),
  down:       () => React.createElement(I, { d: "M6 9l6 6 6-6", size: 14 }),
  save:       () => React.createElement(I, { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8", size: 15 }),
  logout:     () => React.createElement(I, { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9", size: 15 }),
  link:       () => React.createElement(I, { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71", size: 14 }),
  eye:        () => React.createElement(I, { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 12m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0", size: 14 }),
  warning:    () => React.createElement(I, { d: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01", size: 16 }),
  home:       () => React.createElement(I, { d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", size: 14 }),
};

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function dbSet(key: string, value: any) {
  // upsert is safer than update — update silently affects 0 rows if RLS blocks it
  const { error, count } = await supabase
    .from("app_config")
    .upsert({ key, value }, { onConflict: "key" })
    .select();
  if (error) throw error;
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
interface ToggleProps { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; size?: "sm" | "md" }
function Toggle({ checked, onChange, disabled, size = "md" }: ToggleProps) {
  const w = size === "sm" ? 36 : 44;
  const h = size === "sm" ? 20 : 24;
  const dot = size === "sm" ? 14 : 18;
  const on_left = size === "sm" ? 19 : 23;
  return React.createElement("button", {
    type: "button",
    onClick: () => !disabled && onChange(!checked),
    role: "switch",
    "aria-checked": checked,
    style: {
      width: w, height: h, borderRadius: 999, border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      background: checked ? "hsl(var(--primary))" : "#d1d5db",
      position: "relative", transition: "background .18s",
      flexShrink: 0, opacity: disabled ? 0.5 : 1, outline: "none",
    },
  }, React.createElement("span", {
    style: {
      position: "absolute", top: (h - dot) / 2, left: checked ? on_left : (h - dot) / 2,
      width: dot, height: dot, borderRadius: "50%", background: "#fff",
      boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left .18s", display: "block",
    },
  }));
}

// ─── Inline editable text field ───────────────────────────────────────────────
function EditText({ initial, onSave, multiline = false, mono = false }: {
  initial: string; onSave: (v: string) => Promise<void>; multiline?: boolean; mono?: boolean;
}) {
  const [val, setVal] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = val !== initial;

  useEffect(() => { setVal(initial); }, [initial]);

  const doSave = async () => {
    setSaving(true);
    await onSave(val);
    setSaving(false);
  };

  const base: React.CSSProperties = {
    flex: 1, border: "1px solid hsl(var(--border))", borderRadius: 8,
    padding: "8px 12px", fontSize: "0.875rem",
    background: dirty ? "hsl(var(--primary) / 0.04)" : "hsl(var(--background))",
    color: "hsl(var(--foreground))", outline: "none", resize: "vertical",
    fontFamily: mono ? "monospace" : "inherit",
    borderColor: dirty ? "hsl(var(--primary) / 0.5)" : "hsl(var(--border))",
    transition: "border-color .15s, background .15s",
  };

  const input = multiline
    ? React.createElement("textarea", { value: val, onChange: (e: any) => setVal(e.target.value), rows: 2, style: { ...base, display: "block", width: "100%", boxSizing: "border-box" } })
    : React.createElement("input", { type: "text", value: val, onChange: (e: any) => setVal(e.target.value), style: base });

  return React.createElement("div", { style: { display: "flex", gap: 8, alignItems: multiline ? "flex-start" : "center" } },
    input,
    React.createElement("button", {
      onClick: doSave, disabled: !dirty || saving,
      className: "premium-gradient",
      style: {
        border: "none", color: "#fff", borderRadius: 8, padding: "8px 14px",
        fontSize: "0.78rem", fontWeight: 600, cursor: dirty ? "pointer" : "default",
        display: "flex", alignItems: "center", gap: 5,
        opacity: dirty ? 1 : 0.3, transition: "opacity .15s", flexShrink: 0,
        whiteSpace: "nowrap",
      },
    },
      React.createElement(icons.save, {}),
      saving ? "Saving…" : "Save",
    ),
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ title, subtitle, children, action }: {
  title: string; subtitle?: string; children?: React.ReactNode; action?: React.ReactNode;
}) {
  return React.createElement("div", {
    style: {
      background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
      borderRadius: 14, overflow: "hidden", marginBottom: "1.5rem",
      boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
    },
  },
    React.createElement("div", {
      style: {
        padding: "1rem 1.25rem", borderBottom: "1px solid hsl(var(--border))",
        background: "hsl(var(--muted) / 0.4)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      },
    },
      React.createElement("div", {},
        React.createElement("h3", { style: { fontWeight: 700, fontSize: "0.95rem", color: "hsl(var(--foreground))", margin: 0 } }, title),
        subtitle && React.createElement("p", { style: { fontSize: "0.78rem", color: "hsl(var(--muted-foreground))", margin: "2px 0 0" } }, subtitle),
      ),
      action,
    ),
    React.createElement("div", { style: { padding: "1rem 1.25rem" } }, children),
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function Row({ label, sublabel, right, separator = true }: {
  label: string; sublabel?: string; right: React.ReactNode; separator?: boolean;
}) {
  return React.createElement("div", {
    style: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 16, paddingBottom: separator ? "0.9rem" : 0, marginBottom: separator ? "0.9rem" : 0,
      borderBottom: separator ? "1px solid hsl(var(--border) / 0.6)" : "none",
    },
  },
    React.createElement("div", { style: { flex: 1, minWidth: 0 } },
      React.createElement("p", { style: { fontWeight: 600, fontSize: "0.875rem", color: "hsl(var(--foreground))", margin: 0 } }, label),
      sublabel && React.createElement("p", { style: { fontSize: "0.75rem", color: "hsl(var(--muted-foreground))", margin: "2px 0 0", lineHeight: 1.5 } }, sublabel),
    ),
    React.createElement("div", { style: { flexShrink: 0, display: "flex", alignItems: "center", gap: 8 } }, right),
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function Badge({ color, label }: { color: "green" | "amber" | "red" | "blue" | "gray"; label: string }) {
  const colors = {
    green: { bg: "hsl(142 76% 36% / 0.12)", text: "hsl(142 76% 30%)", border: "hsl(142 76% 36% / 0.3)" },
    amber: { bg: "hsl(38 92% 50% / 0.12)",  text: "hsl(38 80% 35%)",  border: "hsl(38 92% 50% / 0.3)" },
    red:   { bg: "hsl(0 84% 60% / 0.12)",   text: "hsl(0 72% 45%)",   border: "hsl(0 84% 60% / 0.3)" },
    blue:  { bg: "hsl(217 91% 60% / 0.12)", text: "hsl(217 91% 40%)", border: "hsl(217 91% 60% / 0.3)" },
    gray:  { bg: "hsl(var(--muted))",        text: "hsl(var(--muted-foreground))", border: "hsl(var(--border))" },
  }[color];
  return React.createElement("span", {
    style: {
      fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em",
      textTransform: "uppercase", padding: "2px 9px", borderRadius: 999,
      background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
      whiteSpace: "nowrap",
    },
  }, label);
}

// ─── Lock/Unlock visual tile ───────────────────────────────────────────────────
function LockTile({ label, sublabel, locked, saving, onToggle }: {
  label: string; sublabel: string; locked: boolean; saving: boolean; onToggle: () => void;
}) {
  return React.createElement("div", {
    onClick: !saving ? onToggle : undefined,
    style: {
      border: `2px solid ${locked ? "hsl(38 92% 50% / 0.5)" : "hsl(142 76% 36% / 0.4)"}`,
      borderRadius: 12, padding: "1rem", cursor: saving ? "wait" : "pointer",
      background: locked ? "hsl(38 92% 50% / 0.05)" : "hsl(142 76% 36% / 0.05)",
      transition: "all .18s", display: "flex", flexDirection: "column" as const,
      gap: 8, position: "relative" as const,
    },
  },
    // Icon row
    React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
      React.createElement("span", { style: { fontSize: "1.3rem" } }, locked ? "🔒" : "🔓"),
      React.createElement(Badge, { color: locked ? "amber" : "green", label: locked ? "Paid" : "Free" }),
    ),
    // Label
    React.createElement("p", { style: { fontWeight: 700, fontSize: "0.875rem", color: "hsl(var(--foreground))", margin: 0, lineHeight: 1.3 } }, label),
    React.createElement("p", { style: { fontSize: "0.72rem", color: "hsl(var(--muted-foreground))", margin: 0, lineHeight: 1.4 } }, sublabel),
    // Toggle
    React.createElement("div", { style: { marginTop: 4 } },
      React.createElement(Toggle, { checked: locked, onChange: onToggle, disabled: saving, size: "sm" }),
    ),
    saving && React.createElement("div", {
      style: { position: "absolute", inset: 0, borderRadius: 10, background: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center" },
    }, React.createElement("span", { style: { fontSize: "0.75rem", fontWeight: 600, color: "hsl(var(--primary))" } }, "Saving…")),
  );
}

// ─── Pages flow diagram ───────────────────────────────────────────────────────
const PAGE_DEFS = [
  { key: "landing",  route: "/",       title: "Landing Page",     desc: "Marketing homepage",           icon: "🏠" },
  { key: "map",      route: "/map",    title: "Map App",          desc: "Interactive parcel map",       icon: "🗺️" },
  { key: "report",   route: "(inline)", title: "Report Page",     desc: "Full parcel report",           icon: "📋" },
  { key: "auth",     route: "/auth",   title: "Auth Page",        desc: "Sign in / Register",           icon: "🔑" },
  { key: "auditas",  route: "/auditas", title: "Audit Page",      desc: "Parcel audit (legacy)",        icon: "📊" },
  { key: "admin",    route: "/admin",  title: "Admin Panel",      desc: "This page",                   icon: "⚙️" },
];

const FLOW_ARROWS = [
  { from: "landing", to: "map",    label: "CTA buttons" },
  { from: "landing", to: "auth",   label: "Sign in button" },
  { from: "map",     to: "report", label: "Click parcel" },
  { from: "map",     to: "auth",   label: "Sign in button" },
  { from: "report",  to: "map",    label: "Back button" },
  { from: "report",  to: "auth",   label: "Needs login" },
];

const REPORT_FIELDS = [
  { key: "lock_cadastral_number",   label: "Cadastral Number",    sublabel: "Unique cadastral ID (e.g. 0101/0001:123)" },
  { key: "lock_unique_number",      label: "Unique Registry Nr.", sublabel: "NT registry unique identifier" },
  { key: "lock_address",            label: "Exact Address",       sublabel: "Official registered address" },
  { key: "lock_coordinates",        label: "GPS Coordinates",     sublabel: "Centroid lat/lng coordinates" },
  { key: "lock_area",               label: "Area (ha)",           sublabel: "Registered land area in hectares" },
  { key: "lock_purpose",            label: "Land Purpose",        sublabel: "Official land use category" },
  { key: "lock_formation_date",     label: "Formation Date",      sublabel: "Date parcel was registered" },
  { key: "lock_market_value",       label: "Market Value (€)",    sublabel: "Average mass valuation from Registry" },
  { key: "lock_valuation_date",     label: "Valuation Date",      sublabel: "Date of last valuation" },
  { key: "lock_measurement_type",   label: "Measurement Type",    sublabel: "Preliminary / final measurements" },
  { key: "lock_productivity",       label: "Productivity Score",  sublabel: "Agricultural productivity rating" },
  { key: "lock_special_conditions", label: "Special Conditions",  sublabel: "Legal constraints or easements" },
  { key: "lock_cadastral_map",      label: "Cadastral Map",       sublabel: "Map preview showing parcel boundaries" },
  { key: "lock_ortho_map",          label: "Satellite Image",     sublabel: "Orthophoto aerial view" },
  { key: "lock_interactive_map",    label: "Interactive Map",     sublabel: "Full interactive Leaflet map" },
];

const BUTTON_GROUPS = [
  {
    label: "Landing Page — Navigation",
    keys: ["btn_nav_signin", "btn_nav_try_free", "btn_why_scroll", "btn_pricing_scroll"],
  },
  {
    label: "Landing Page — Hero & Sections",
    keys: ["btn_hero_search", "btn_features_cta", "btn_final_cta"],
  },
  {
    label: "Landing Page — Pricing Cards",
    keys: ["btn_pricing_starter", "btn_pricing_popular", "btn_pricing_pro"],
  },
  {
    label: "Map Page",
    keys: ["btn_map_signin"],
  },
  {
    label: "Report Page",
    keys: ["btn_report_back", "btn_report_unlock", "btn_report_sample_cta"],
  },
];

const CONTENT_GROUPS = [
  {
    label: "Hero Section",
    keys: ["content_hero_title", "content_hero_subtitle1", "content_hero_subtitle2", "content_hero_trust"],
  },
  {
    label: "Why Section (3 cards)",
    keys: ["content_why_title", "content_why_1_title", "content_why_1_desc", "content_why_2_title", "content_why_2_desc", "content_why_3_title", "content_why_3_desc"],
  },
  {
    label: "Pricing & CTA",
    keys: ["content_report_section_title", "content_pricing_title", "content_pricing_subtitle", "content_cta_title", "content_cta_subtitle"],
  },
  {
    label: "Report & Search",
    keys: ["content_search_placeholder", "content_report_unlock_title", "content_app_name", "content_footer_attribution"],
  },
  {
    label: "Maintenance Mode",
    keys: ["content_maintenance_title", "content_maintenance_msg"],
  },
];

const FEATURE_GROUPS = [
  {
    label: "Core App",
    items: [
      { key: "feature_landing_page",  label: "Show Landing Page at /", desc: "If off, / redirects to the map app" },
      { key: "feature_report_page",   label: "Report Page",            desc: "Enable parcel report after unlocking" },
      { key: "maintenance_mode",      label: "⚠️ Maintenance Mode",    desc: "Block all non-admin users with a maintenance screen", danger: true },
    ],
  },
  {
    label: "Map Features",
    items: [
      { key: "feature_cadastral_search", label: "Search by Cadastral Number", desc: "Allow text search in the search bar" },
      { key: "feature_map_identify",     label: "Map Click Identification",   desc: "Click anywhere on map to identify a parcel" },
      { key: "feature_ortho_layer",      label: "Satellite Layer Toggle",     desc: "Show satellite/ortho view toggle on map" },
      { key: "feature_map_attribution",  label: "Map Attribution",            desc: 'Show "Geoportal.lt · RC Kadastras" watermark' },
    ],
  },
  {
    label: "Monetisation",
    items: [
      { key: "feature_pricing_modal",  label: "Pricing / Credits Modal",    desc: "Show the credit purchase modal when clicking credits" },
      { key: "feature_sample_report",  label: "Blurred Sample Report",      desc: "Show sample report preview below unlock CTA" },
    ],
  },
  {
    label: "Authentication",
    items: [
      { key: "feature_apple_signin",   label: "Apple Sign-In Button",       desc: "Show Sign in with Apple on login forms" },
    ],
  },
];

const SECTION_LABELS: Record<string, string> = {
  found_banner: "✅ Found Banner (green success banner)",
  map:          "🗺️  Map images (cadastral + satellite)",
  basic_info:   "📋 Basic Info (numbers, address, area)",
  market_value: "💶 Market Value & Valuation",
  technical:    "📐 Technical (measurements, productivity)",
  address:      "📍 Address & Coordinates",
};

// ─── Main ─────────────────────────────────────────────────────────────────────
type PageId = "dashboard" | "pages" | "buttons" | "content" | "fields" | "features" | "pricing" | "settings" | "theme" | "map" | "users";

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { rows, config, loading, refresh } = useAppConfig();
  const [page, setPage] = useState<PageId>("dashboard");
  const [saving, setSaving] = useState<string | null>(null);
  const [pricingLocal, setPricingLocal] = useState(config.pricing);
  const [sectionOrder, setSectionOrder] = useState(config.report_sections_order);

  // Theme local state (live preview before save)
  const [themeLocal, setThemeLocal] = useState({
    theme_primary_hsl:    config.theme_primary_hsl,
    theme_primary_fg:     config.theme_primary_fg,
    theme_background_hsl: config.theme_background_hsl,
    theme_card_hsl:       config.theme_card_hsl,
    theme_muted_hsl:      config.theme_muted_hsl,
    theme_border_hsl:     config.theme_border_hsl,
    theme_foreground_hsl: config.theme_foreground_hsl,
  });

  // Map local state
  const [mapLocal, setMapLocal] = useState({
    map_default_lat:   config.map_default_lat,
    map_default_lng:   config.map_default_lng,
    map_default_zoom:  config.map_default_zoom,
    map_default_layer: config.map_default_layer,
  });

  // Users list for user management tab
  const [users, setUsers] = useState<{ id: string; email: string; credits: number; role: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [creditEdits, setCreditEdits] = useState<Record<string, number>>({});

  useEffect(() => { setPricingLocal(config.pricing); }, [config.pricing]);
  useEffect(() => { setSectionOrder(config.report_sections_order); }, [config.report_sections_order]);
  useEffect(() => {
    setThemeLocal({
      theme_primary_hsl:    config.theme_primary_hsl,
      theme_primary_fg:     config.theme_primary_fg,
      theme_background_hsl: config.theme_background_hsl,
      theme_card_hsl:       config.theme_card_hsl,
      theme_muted_hsl:      config.theme_muted_hsl,
      theme_border_hsl:     config.theme_border_hsl,
      theme_foreground_hsl: config.theme_foreground_hsl,
    });
  }, [config.theme_primary_hsl, config.theme_primary_fg, config.theme_background_hsl, config.theme_card_hsl, config.theme_muted_hsl, config.theme_border_hsl, config.theme_foreground_hsl]);
  useEffect(() => {
    setMapLocal({
      map_default_lat:   config.map_default_lat,
      map_default_lng:   config.map_default_lng,
      map_default_zoom:  config.map_default_zoom,
      map_default_layer: config.map_default_layer,
    });
  }, [config.map_default_lat, config.map_default_lng, config.map_default_zoom, config.map_default_layer]);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email ?? "");

  // ── Helpers ──
  const save = useCallback(async (key: string, value: any, label?: string) => {
    setSaving(key);
    try {
      await dbSet(key, value);
      await refresh();
      toast.success(label ? `"${label}" saved` : "Saved");
    } catch (e: any) {
      toast.error(e.message ?? "Error saving");
    }
    setSaving(null);
  }, [refresh]);

  const toggleBool = useCallback((key: string, cur: boolean, label: string) => {
    save(key, !cur, label);
  }, [save]);

  const getRow = (key: string): AppConfigRow | undefined => rows.find(r => r.key === key);

  const getBool = (key: string): boolean => {
    const r = getRow(key);
    if (!r) return false;
    return r.value === true || r.value === "true";
  };

  const getBtn = (key: string): ButtonConfig => {
    const r = getRow(key);
    if (!r) return config.buttons[key] ?? { label: "", href: "", enabled: true };
    return typeof r.value === "object" ? r.value : JSON.parse(r.value);
  };

  const getContent = (key: string): string => {
    const r = getRow(key);
    if (!r) return config.content[key] ?? "";
    return typeof r.value === "string" ? r.value : String(r.value);
  };

  // ── Derived stats ──
  const lockedCount  = REPORT_FIELDS.filter(f => getBool(f.key)).length;
  const freeCount    = REPORT_FIELDS.length - lockedCount;
  const featEnabled  = FEATURE_GROUPS.flatMap(g => g.items).filter(f => getBool(f.key)).length;
  const maintOn      = getBool("maintenance_mode");

  // ── Guards ──
  if (loading) return React.createElement("div", {
    style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(var(--background))" },
  }, React.createElement("div", { style: { textAlign: "center" } },
    React.createElement("div", {
      style: { width: 36, height: 36, borderRadius: "50%", border: "3px solid hsl(var(--border))", borderTop: "3px solid hsl(var(--primary))", animation: "spin .8s linear infinite", margin: "0 auto 12px" },
    }),
    React.createElement("style", {}, "@keyframes spin{to{transform:rotate(360deg)}}"),
  ));

  if (!user || !isAdmin) return React.createElement("div", {
    style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(var(--background))", padding: 24 },
  }, React.createElement("div", {
    style: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 14, padding: "2rem", maxWidth: 380, textAlign: "center" },
  },
    React.createElement("div", { style: { fontSize: "2.5rem", marginBottom: 12 } }, user ? "🚫" : "🔐"),
    React.createElement("h2", { style: { fontWeight: 700, marginBottom: 8 } }, user ? "Access Denied" : "Sign In Required"),
    React.createElement("p", { style: { color: "hsl(var(--muted-foreground))", fontSize: "0.875rem", marginBottom: 20 } },
      user ? `${user.email} does not have admin privileges.` : "You need to be signed in as an admin.",
    ),
    React.createElement("button", {
      onClick: () => navigate(user ? "/" : "/auth"),
      style: { border: "1px solid hsl(var(--border))", background: "transparent", borderRadius: 10, padding: "10px 28px", fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" },
    }, user ? "Go Home" : "Sign In"),
  ));

  // ── NAV items ──
  const navItems: { id: PageId; label: string; icon: () => React.ReactElement }[] = [
    { id: "dashboard", label: "Dashboard",      icon: icons.dashboard },
    { id: "pages",     label: "Pages & Flow",   icon: icons.pages },
    { id: "buttons",   label: "Buttons & Links", icon: icons.buttons },
    { id: "content",   label: "Content & Text", icon: icons.content },
    { id: "fields",    label: "Report Fields",  icon: icons.lock },
    { id: "features",  label: "Features",       icon: icons.features },
    { id: "pricing",   label: "Pricing Tiers",  icon: icons.pricing },
    { id: "theme",     label: "Theme & Colors", icon: icons.settings },
    { id: "map",       label: "Map Defaults",   icon: icons.pages },
    { id: "users",     label: "Users",          icon: icons.dashboard },
    { id: "settings",  label: "Settings",       icon: icons.settings },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE RENDERERS
  // ─────────────────────────────────────────────────────────────────────────────

  // ── DASHBOARD ──
  const renderDashboard = () => [
    // Stat cards row
    React.createElement("div", {
      key: "stats",
      style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" },
    },
      // Paid fields
      React.createElement("div", {
        style: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 14, padding: "1.25rem", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", cursor: "pointer" },
        onClick: () => setPage("fields"),
      },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 } },
          React.createElement("div", { style: { background: "hsl(38 92% 50% / 0.12)", borderRadius: 8, padding: 8, color: "hsl(38 80% 40%)", display: "flex" } }, React.createElement(icons.lock, {})),
          React.createElement("span", { style: { fontWeight: 600, fontSize: "0.85rem" } }, "Paid Fields"),
        ),
        React.createElement("div", { className: "font-display", style: { fontSize: "2rem", fontWeight: 800, color: "hsl(38 80% 40%)" } }, lockedCount),
        React.createElement("p", { style: { fontSize: "0.75rem", color: "hsl(var(--muted-foreground))", margin: "4px 0 0" } }, `${freeCount} fields free`),
      ),
      // Active features
      React.createElement("div", {
        style: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 14, padding: "1.25rem", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", cursor: "pointer" },
        onClick: () => setPage("features"),
      },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 } },
          React.createElement("div", { style: { background: "hsl(var(--primary) / 0.12)", borderRadius: 8, padding: 8, color: "hsl(var(--primary))", display: "flex" } }, React.createElement(icons.features, {})),
          React.createElement("span", { style: { fontWeight: 600, fontSize: "0.85rem" } }, "Active Features"),
        ),
        React.createElement("div", { className: "font-display", style: { fontSize: "2rem", fontWeight: 800, color: "hsl(var(--primary))" } }, featEnabled),
        React.createElement("p", { style: { fontSize: "0.75rem", color: "hsl(var(--muted-foreground))", margin: "4px 0 0" } }, `of ${FEATURE_GROUPS.flatMap(g => g.items).length} total`),
      ),
      // Maintenance
      React.createElement("div", {
        style: {
          borderRadius: 14, padding: "1.25rem",
          border: maintOn ? "1.5px solid hsl(0 84% 60% / 0.5)" : "1px solid hsl(var(--border))",
          background: maintOn ? "hsl(0 84% 60% / 0.04)" : "hsl(var(--card))",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
        },
      },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 } },
          React.createElement("span", { style: { fontWeight: 600, fontSize: "0.85rem" } }, "Maintenance"),
          React.createElement(Toggle, { checked: maintOn, onChange: v => toggleBool("maintenance_mode", !v, "Maintenance Mode"), disabled: saving === "maintenance_mode" }),
        ),
        React.createElement(Badge, { color: maintOn ? "red" : "green", label: maintOn ? "ON — Users blocked" : "Off — App live" }),
        React.createElement("p", { style: { fontSize: "0.72rem", color: "hsl(var(--muted-foreground))", margin: "8px 0 0", lineHeight: 1.5 } },
          maintOn ? "⚠️ All non-admin users see maintenance screen" : "App is accessible to everyone",
        ),
      ),
      // Free credits
      React.createElement("div", {
        style: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 14, padding: "1.25rem", boxShadow: "0 1px 6px rgba(0,0,0,0.04)", cursor: "pointer" },
        onClick: () => setPage("settings"),
      },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 } },
          React.createElement("div", { style: { background: "hsl(var(--primary) / 0.12)", borderRadius: 8, padding: 8, color: "hsl(var(--primary))", display: "flex" } }, React.createElement(icons.settings, {})),
          React.createElement("span", { style: { fontWeight: 600, fontSize: "0.85rem" } }, "Free Credits"),
        ),
        React.createElement("div", { className: "font-display", style: { fontSize: "2rem", fontWeight: 800, color: "hsl(var(--primary))" } }, config.free_credits_on_signup),
        React.createElement("p", { style: { fontSize: "0.75rem", color: "hsl(var(--muted-foreground))", margin: "4px 0 0" } }, "given on signup"),
      ),
    ),

    // Quick toggles
    React.createElement(Section, { key: "quick", title: "Quick Toggles", subtitle: "Most commonly changed settings" },
      React.createElement("div", {
        style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.6rem" },
      },
        [
          { key: "feature_landing_page",  label: "Show Landing Page at /" },
          { key: "feature_map_identify",  label: "Map Click Identification" },
          { key: "feature_ortho_layer",   label: "Satellite Layer" },
          { key: "feature_pricing_modal", label: "Pricing Modal" },
          { key: "feature_sample_report", label: "Sample Report Preview" },
          { key: "lock_market_value",     label: "🔒 Market Value (paid)" },
          { key: "lock_interactive_map",  label: "🔒 Interactive Map (paid)" },
          { key: "lock_ortho_map",        label: "🔒 Satellite Image (paid)" },
        ].map(item =>
          React.createElement("div", {
            key: item.key,
            style: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "hsl(var(--muted) / 0.5)", border: "1px solid hsl(var(--border))", borderRadius: 10, padding: "10px 14px", gap: 10 },
          },
            React.createElement("span", { style: { fontSize: "0.85rem", fontWeight: 500 } }, item.label),
            React.createElement(Toggle, {
              checked: getBool(item.key),
              onChange: v => toggleBool(item.key, !v, item.label),
              disabled: saving === item.key,
              size: "sm",
            }),
          )
        ),
      ),
    ),
  ];

  // ── PAGES ──
  const renderPages = () => [
    // Flow diagram
    React.createElement(Section, {
      key: "flow",
      title: "Page Flow Diagram",
      subtitle: "How users navigate between pages",
    },
      React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" } },
        FLOW_ARROWS.map(({ from, to, label }) => {
          const fromDef = PAGE_DEFS.find(p => p.key === from)!;
          const toDef   = PAGE_DEFS.find(p => p.key === to)!;
          return React.createElement("div", {
            key: `${from}-${to}`,
            style: { display: "flex", alignItems: "center", gap: 6, background: "hsl(var(--muted) / 0.5)", border: "1px solid hsl(var(--border))", borderRadius: 10, padding: "6px 12px" },
          },
            React.createElement("span", { style: { fontSize: "0.85rem" } }, fromDef.icon),
            React.createElement("span", { style: { fontWeight: 600, fontSize: "0.8rem" } }, fromDef.title),
            React.createElement("span", { style: { color: "hsl(var(--primary))", fontSize: "0.8rem", margin: "0 2px" } }, "→"),
            React.createElement("span", { style: { fontSize: "0.85rem" } }, toDef.icon),
            React.createElement("span", { style: { fontWeight: 600, fontSize: "0.8rem" } }, toDef.title),
            React.createElement("span", { style: { fontSize: "0.72rem", color: "hsl(var(--muted-foreground))", marginLeft: 4 } }, `(${label})`),
          );
        }),
      ),
    ),

    // Page cards
    React.createElement(Section, {
      key: "pages-list",
      title: "All Pages",
      subtitle: "Toggle visibility and set the home page",
    },
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" } },
        PAGE_DEFS.map(p => {
          const visKey = `page_visible_${p.key}`;
          const visRow = getRow(visKey);
          const visible = visRow ? (visRow.value === true || visRow.value === "true") : true;
          const isHome  = (getRow("page_home")?.value ?? "landing") === p.key;
          const hasVis  = !!visRow;

          return React.createElement("div", {
            key: p.key,
            style: {
              border: isHome ? "2px solid hsl(var(--primary) / 0.5)" : "1px solid hsl(var(--border))",
              borderRadius: 12, padding: "1rem",
              background: isHome ? "hsl(var(--primary) / 0.04)" : "hsl(var(--card))",
              opacity: visible ? 1 : 0.55,
            },
          },
            React.createElement("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 } },
              React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                React.createElement("span", { style: { fontSize: "1.4rem" } }, p.icon),
                React.createElement("div", {},
                  React.createElement("p", { style: { fontWeight: 700, fontSize: "0.9rem", margin: 0 } }, p.title),
                  React.createElement("p", { style: { fontSize: "0.72rem", fontFamily: "monospace", color: "hsl(var(--primary))", margin: "2px 0 0" } }, p.route),
                ),
              ),
              isHome && React.createElement(Badge, { color: "green", label: "Home" }),
            ),
            React.createElement("p", { style: { fontSize: "0.78rem", color: "hsl(var(--muted-foreground))", margin: "0 0 12px" } }, p.desc),
            React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" } },
              // Visibility toggle
              React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 7 } },
                React.createElement(Toggle, {
                  checked: visible,
                  onChange: v => hasVis ? save(visKey, v, `${p.title} visibility`) : undefined,
                  disabled: !hasVis || saving === visKey,
                  size: "sm",
                }),
                React.createElement("span", { style: { fontSize: "0.78rem", color: "hsl(var(--muted-foreground))" } }, visible ? "Visible" : "Hidden"),
              ),
              // Set as home
              !isHome && p.key !== "report" && p.key !== "admin" && React.createElement("button", {
                onClick: () => save("page_home", p.key, "Home page"),
                disabled: saving === "page_home",
                style: {
                  border: "1px solid hsl(var(--border))", background: "hsl(var(--muted))",
                  borderRadius: 8, padding: "4px 12px", fontSize: "0.75rem",
                  fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                },
              },
                React.createElement(icons.home, {}),
                "Set as home",
              ),
            ),
          );
        }),
      ),
    ),
  ];

  // ── BUTTONS ──
  const renderButtons = () =>
    BUTTON_GROUPS.map(group =>
      React.createElement(Section, {
        key: group.label,
        title: group.label,
        subtitle: `${group.keys.length} buttons`,
      },
        group.keys.map((key, i) => {
          const btn = getBtn(key);
          const rowDef = rows.find(r => r.key === key);
          const label  = rowDef?.label ?? key;
          return React.createElement("div", {
            key,
            style: {
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: 8,
              alignItems: "center",
              paddingBottom: i < group.keys.length - 1 ? "0.9rem" : 0,
              marginBottom: i < group.keys.length - 1 ? "0.9rem" : 0,
              borderBottom: i < group.keys.length - 1 ? "1px solid hsl(var(--border) / 0.6)" : "none",
            },
          },
            // Label column
            React.createElement("div", {},
              React.createElement("p", { style: { fontWeight: 600, fontSize: "0.85rem", margin: "0 0 6px" } }, label),
              React.createElement(EditText, {
                initial: btn.label,
                onSave: async v => {
                  const updated = { ...btn, label: v };
                  await save(key, updated, label + " label");
                },
              }),
            ),
            // Destination column
            React.createElement("div", {},
              React.createElement("p", { style: { fontWeight: 600, fontSize: "0.85rem", margin: "0 0 6px", display: "flex", alignItems: "center", gap: 5 } },
                React.createElement(icons.link, {}), "Destination",
              ),
              React.createElement(EditText, {
                initial: btn.href,
                onSave: async v => {
                  const updated = { ...btn, href: v };
                  await save(key, updated, label + " destination");
                },
                mono: true,
              }),
            ),
            // Enabled toggle
            React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 } },
              React.createElement("span", { style: { fontSize: "0.72rem", color: "hsl(var(--muted-foreground))", fontWeight: 600 } }, "On"),
              React.createElement(Toggle, {
                checked: btn.enabled,
                onChange: v => save(key, { ...btn, enabled: v }, label),
                disabled: saving === key,
                size: "sm",
              }),
            ),
          );
        }),
      )
    );

  // ── CONTENT ──
  const renderContent = () =>
    CONTENT_GROUPS.map(group =>
      React.createElement(Section, {
        key: group.label,
        title: group.label,
      },
        group.keys.map((key, i) => {
          const rowDef = rows.find(r => r.key === key);
          const label  = rowDef?.label ?? key;
          const desc   = rowDef?.description;
          return React.createElement(Row, {
            key,
            label,
            sublabel: desc ?? undefined,
            separator: i < group.keys.length - 1,
            right: React.createElement("div", { style: { minWidth: 320 } },
              React.createElement(EditText, {
                initial: getContent(key),
                onSave: async v => save(key, v, label),
                multiline: getContent(key).length > 60,
              }),
            ),
          });
        }),
      )
    );

  // ── REPORT FIELDS ──
  const renderFields = () => [
    // Summary banner
    React.createElement("div", {
      key: "banner",
      style: {
        display: "flex", gap: 12, marginBottom: "1.5rem", flexWrap: "wrap",
      },
    },
      React.createElement("div", {
        style: { flex: 1, minWidth: 180, background: "hsl(142 76% 36% / 0.08)", border: "1px solid hsl(142 76% 36% / 0.25)", borderRadius: 12, padding: "1rem", display: "flex", alignItems: "center", gap: 10 },
      },
        React.createElement("span", { style: { fontSize: "1.5rem" } }, "🔓"),
        React.createElement("div", {},
          React.createElement("div", { style: { fontSize: "1.5rem", fontWeight: 800, color: "hsl(142 76% 30%)" } }, freeCount),
          React.createElement("div", { style: { fontSize: "0.8rem", color: "hsl(142 76% 30%)" } }, "Free fields — visible to everyone"),
        ),
      ),
      React.createElement("div", {
        style: { flex: 1, minWidth: 180, background: "hsl(38 92% 50% / 0.08)", border: "1px solid hsl(38 92% 50% / 0.25)", borderRadius: 12, padding: "1rem", display: "flex", alignItems: "center", gap: 10 },
      },
        React.createElement("span", { style: { fontSize: "1.5rem" } }, "🔒"),
        React.createElement("div", {},
          React.createElement("div", { style: { fontSize: "1.5rem", fontWeight: 800, color: "hsl(38 80% 35%)" } }, lockedCount),
          React.createElement("div", { style: { fontSize: "0.8rem", color: "hsl(38 80% 35%)" } }, "Paid fields — require 1 credit"),
        ),
      ),
    ),

    // Grid of lock tiles
    React.createElement(Section, {
      key: "tiles",
      title: "Report Field Lock Settings",
      subtitle: "Click any field tile to toggle paid / free",
    },
      React.createElement("div", {
        style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.85rem" },
      },
        REPORT_FIELDS.map(f =>
          React.createElement(LockTile, {
            key: f.key,
            label: f.label,
            sublabel: f.sublabel,
            locked: getBool(f.key),
            saving: saving === f.key,
            onToggle: () => toggleBool(f.key, getBool(f.key), f.label),
          })
        ),
      ),
    ),

    // Lock-all / Unlock-all shortcuts
    React.createElement(Section, {
      key: "bulk",
      title: "Bulk Actions",
      subtitle: "Change all fields at once",
    },
      React.createElement("div", { style: { display: "flex", gap: 12, flexWrap: "wrap" } },
        React.createElement("button", {
          onClick: async () => {
            for (const f of REPORT_FIELDS) await dbSet(f.key, false);
            await refresh();
            toast.success("All fields set to Free");
          },
          style: { border: "1.5px solid hsl(142 76% 36% / 0.5)", background: "hsl(142 76% 36% / 0.07)", color: "hsl(142 76% 28%)", borderRadius: 10, padding: "10px 22px", fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" },
        }, "🔓 Unlock All Fields (Free)"),
        React.createElement("button", {
          onClick: async () => {
            for (const f of REPORT_FIELDS) await dbSet(f.key, true);
            await refresh();
            toast.success("All fields set to Paid");
          },
          style: { border: "1.5px solid hsl(38 92% 50% / 0.5)", background: "hsl(38 92% 50% / 0.07)", color: "hsl(38 80% 32%)", borderRadius: 10, padding: "10px 22px", fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" },
        }, "🔒 Lock All Fields (Paid)"),
      ),
    ),
  ];

  // ── FEATURES ──
  const renderFeatures = () =>
    FEATURE_GROUPS.map(group =>
      React.createElement(Section, {
        key: group.label,
        title: group.label,
      },
        group.items.map((item: any, i: number) =>
          React.createElement(Row, {
            key: item.key,
            label: item.label,
            sublabel: item.desc,
            separator: i < group.items.length - 1,
            right: React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
              React.createElement(Badge, {
                color: getBool(item.key) ? (item.danger ? "red" : "green") : "gray",
                label: getBool(item.key) ? (item.danger ? "ON ⚠️" : "Enabled") : "Disabled",
              }),
              React.createElement(Toggle, {
                checked: getBool(item.key),
                onChange: v => toggleBool(item.key, !v, item.label),
                disabled: saving === item.key,
              }),
            ),
          })
        ),
      )
    );

  // ── PRICING ──
  const renderPricing = () => {
    const tiers: Array<[string, number]> = [["pricing_tier_1", 0], ["pricing_tier_2", 1], ["pricing_tier_3", 2]];
    return [
      React.createElement("div", {
        key: "tiers",
        style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" },
      },
        tiers.map(([dbKey, idx]) => {
          const tier: PricingTier = pricingLocal[idx] ?? { name: "", credits: 1, price: "", perSearch: "", popular: false, save: "", enabled: true };
          const setField = (field: keyof PricingTier, val: any) => {
            setPricingLocal(prev => {
              const next = [...prev];
              next[idx] = { ...next[idx], [field]: val };
              return next;
            });
          };
          const hasChanges = JSON.stringify(tier) !== JSON.stringify(config.pricing[idx]);

          return React.createElement("div", {
            key: dbKey,
            style: {
              background: "hsl(var(--card))",
              border: tier.popular ? "2px solid hsl(var(--primary) / 0.5)" : "1px solid hsl(var(--border))",
              borderRadius: 14, padding: "1.5rem",
              boxShadow: tier.popular ? "0 4px 20px rgba(0,0,0,0.08)" : "0 1px 6px rgba(0,0,0,0.04)",
              position: "relative",
            },
          },
            tier.popular && React.createElement("div", {
              className: "premium-gradient",
              style: { position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", color: "#fff", fontSize: "0.68rem", fontWeight: 700, padding: "3px 14px", borderRadius: 999, whiteSpace: "nowrap", letterSpacing: "0.06em", textTransform: "uppercase" },
            }, "Most Popular"),

            // Tier name
            React.createElement("div", { style: { marginBottom: 16 } },
              React.createElement("label", { style: { fontSize: "0.75rem", fontWeight: 700, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4 } }, "Tier Name"),
              React.createElement("input", {
                value: tier.name,
                onChange: (e: any) => setField("name", e.target.value),
                style: { width: "100%", border: "1px solid hsl(var(--border))", borderRadius: 8, padding: "7px 12px", fontSize: "0.9rem", fontWeight: 700, boxSizing: "border-box", background: "hsl(var(--background))", color: "hsl(var(--foreground))", outline: "none" },
              }),
            ),

            // Credits + Price
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 } },
              ...(["credits", "price", "perSearch", "save"] as const).map(field => React.createElement("div", { key: field },
                React.createElement("label", { style: { fontSize: "0.72rem", fontWeight: 700, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", display: "block", marginBottom: 4 } },
                  field === "credits" ? "Credits" : field === "price" ? "Total Price" : field === "perSearch" ? "Per Search" : "Save Badge",
                ),
                React.createElement("input", {
                  value: String(tier[field] ?? ""),
                  onChange: (e: any) => setField(field, field === "credits" ? Number(e.target.value) : e.target.value),
                  type: field === "credits" ? "number" : "text",
                  style: { width: "100%", border: "1px solid hsl(var(--border))", borderRadius: 8, padding: "7px 10px", fontSize: "0.875rem", boxSizing: "border-box", background: "hsl(var(--background))", color: "hsl(var(--foreground))", outline: "none" },
                }),
              )),
            ),

            // Popular + Enabled toggles
            React.createElement("div", { style: { display: "flex", gap: 16, marginBottom: 16 } },
              React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 } },
                React.createElement(Toggle, { checked: tier.popular, onChange: v => setField("popular", v), size: "sm" }),
                "Mark as Popular",
              ),
              React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 } },
                React.createElement(Toggle, { checked: tier.enabled, onChange: v => setField("enabled", v), size: "sm" }),
                "Enabled",
              ),
            ),

            // Save button
            React.createElement("button", {
              onClick: () => save(dbKey, tier, tier.name),
              disabled: !hasChanges || saving === dbKey,
              className: hasChanges ? "premium-gradient" : "",
              style: {
                width: "100%", border: hasChanges ? "none" : "1px solid hsl(var(--border))",
                background: hasChanges ? undefined : "hsl(var(--muted))",
                color: hasChanges ? "#fff" : "hsl(var(--muted-foreground))",
                borderRadius: 10, padding: "9px", fontWeight: 600, cursor: hasChanges ? "pointer" : "default",
                fontSize: "0.875rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                opacity: saving === dbKey ? 0.7 : 1, transition: "opacity .15s",
              },
            },
              React.createElement(icons.save, {}),
              saving === dbKey ? "Saving…" : hasChanges ? "Save Changes" : "No Changes",
            ),
          );
        }),
      ),
    ];
  };

  // ── SETTINGS ──
  const renderSettings = () => [
    React.createElement(Section, {
      key: "misc",
      title: "General Settings",
    },
      React.createElement(Row, {
        label: "Free Credits on Signup",
        sublabel: "Credits automatically given to new users when they register",
        right: React.createElement(EditText, {
          initial: String(config.free_credits_on_signup),
          onSave: async v => save("free_credits_on_signup", Number(v), "Free credits on signup"),
          mono: true,
        }),
      }),
      React.createElement(Row, {
        label: "Credits Per Unlock",
        sublabel: "How many credits are deducted when a user unlocks a report",
        right: React.createElement(EditText, {
          initial: String(config.credits_per_unlock),
          onSave: async v => save("credits_per_unlock", Number(v), "Credits per unlock"),
          mono: true,
        }),
      }),
      React.createElement(Row, {
        label: "Support Email",
        sublabel: "Contact email shown to users needing help",
        separator: false,
        right: React.createElement(EditText, {
          initial: config.support_email,
          onSave: async v => save("support_email", v, "Support email"),
        }),
      }),
    ),

    // Report section order
    React.createElement(Section, {
      key: "order",
      title: "Report Section Order",
      subtitle: "Drag with arrow buttons to change the order sections appear in the full report",
    },
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 } },
        sectionOrder.map((id, i) =>
          React.createElement("div", {
            key: id,
            style: { display: "flex", alignItems: "center", gap: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, padding: "10px 14px" },
          },
            React.createElement("span", { style: { fontWeight: 700, fontSize: "0.8rem", color: "hsl(var(--muted-foreground))", minWidth: 20 } }, `${i + 1}.`),
            React.createElement("span", { style: { flex: 1, fontSize: "0.875rem", fontWeight: 500 } }, SECTION_LABELS[id] ?? id),
            React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3 } },
              React.createElement("button", {
                onClick: () => {
                  if (i === 0) return;
                  const next = [...sectionOrder];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  setSectionOrder(next);
                },
                disabled: i === 0,
                style: { background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", borderRadius: 5, padding: "3px 7px", cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.3 : 1, display: "flex" },
              }, React.createElement(icons.up, {})),
              React.createElement("button", {
                onClick: () => {
                  if (i === sectionOrder.length - 1) return;
                  const next = [...sectionOrder];
                  [next[i], next[i + 1]] = [next[i + 1], next[i]];
                  setSectionOrder(next);
                },
                disabled: i === sectionOrder.length - 1,
                style: { background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", borderRadius: 5, padding: "3px 7px", cursor: i === sectionOrder.length - 1 ? "default" : "pointer", opacity: i === sectionOrder.length - 1 ? 0.3 : 1, display: "flex" },
              }, React.createElement(icons.down, {})),
            ),
          )
        ),
      ),
      React.createElement("button", {
        onClick: () => save("report_sections_order", sectionOrder, "Report section order"),
        disabled: JSON.stringify(sectionOrder) === JSON.stringify(config.report_sections_order) || saving === "report_sections_order",
        className: "premium-gradient",
        style: {
          border: "none", color: "#fff", borderRadius: 10, padding: "10px 24px",
          fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 7,
          opacity: JSON.stringify(sectionOrder) === JSON.stringify(config.report_sections_order) ? 0.4 : 1,
        },
      },
        React.createElement(icons.save, {}),
        saving === "report_sections_order" ? "Saving…" : "Save Order",
      ),
    ),
  ];

  const pageContent: Record<PageId, () => React.ReactNode[]> = {
    dashboard: renderDashboard,
    pages:     renderPages,
    buttons:   renderButtons,
    content:   renderContent,
    fields:    renderFields,
    features:  renderFeatures,
    pricing:   renderPricing,
    settings:  renderSettings,
    theme:     renderTheme,
    map:       renderMap,
    users:     renderUsers,
  };

  // ─── THEME RENDERER ───────────────────────────────────────────────────────────
  function renderTheme(): React.ReactNode[] {
    const THEME_FIELDS: { key: keyof typeof themeLocal; label: string; hint: string }[] = [
      { key: "theme_primary_hsl",    label: "Primary Color",        hint: "Main brand color. HSL without wrapper e.g. 160 84% 39%" },
      { key: "theme_primary_fg",     label: "Primary Foreground",   hint: "Text on primary buttons. HSL e.g. 0 0% 100%" },
      { key: "theme_background_hsl", label: "Page Background",      hint: "Overall page background. HSL e.g. 220 20% 97%" },
      { key: "theme_card_hsl",       label: "Card Background",      hint: "Cards and sidebars. HSL e.g. 0 0% 100%" },
      { key: "theme_muted_hsl",      label: "Muted Surface",        hint: "Subtle background areas. HSL e.g. 210 20% 96%" },
      { key: "theme_border_hsl",     label: "Border Color",         hint: "Lines and dividers. HSL e.g. 214 20% 90%" },
      { key: "theme_foreground_hsl", label: "Text (Foreground)",    hint: "Primary body text. HSL e.g. 222 47% 11%" },
    ];

    const hslToHex = (hsl: string): string => {
      const parts = hsl.trim().split(/\s+/);
      if (parts.length < 3) return "#888888";
      const h = parseFloat(parts[0]) / 360;
      const s = parseFloat(parts[1]) / 100;
      const l = parseFloat(parts[2]) / 100;
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p + (q-p)*6*t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q-p)*(2/3-t)*6;
        return p;
      };
      let r, g, b;
      if (s === 0) { r = g = b = l; } else {
        const q2 = l < 0.5 ? l*(1+s) : l+s-l*s;
        const p2 = 2*l-q2;
        r = hue2rgb(p2,q2,h+1/3); g = hue2rgb(p2,q2,h); b = hue2rgb(p2,q2,h-1/3);
      }
      return `#${Math.round(r*255).toString(16).padStart(2,'0')}${Math.round(g*255).toString(16).padStart(2,'0')}${Math.round(b*255).toString(16).padStart(2,'0')}`;
    };

    const hexToHsl = (hex: string): string => {
      let r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
      const max = Math.max(r,g,b), min = Math.min(r,g,b);
      let h=0, s=0; const l=(max+min)/2;
      if (max!==min) {
        const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min);
        switch(max){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;case b:h=((r-g)/d+4)/6;break;}
      }
      return `${Math.round(h*360)} ${Math.round(s*100)}% ${Math.round(l*100)}%`;
    };

    const setThemeField = (key: keyof typeof themeLocal, value: string) => {
      const next = { ...themeLocal, [key]: value };
      setThemeLocal(next);
      // Live preview
      applyThemeToCss({ ...config, ...next });
    };

    const saveAllTheme = async () => {
      setSaving("theme_all");
      try {
        for (const [k, v] of Object.entries(themeLocal)) {
          await dbSet(k, v);
        }
        await refresh();
        toast.success("Theme saved — all users will see the new colors");
      } catch (e: any) { toast.error(e.message ?? "Error saving theme"); }
      setSaving(null);
    };

    const themeChanged = JSON.stringify(themeLocal) !== JSON.stringify({
      theme_primary_hsl: config.theme_primary_hsl, theme_primary_fg: config.theme_primary_fg,
      theme_background_hsl: config.theme_background_hsl, theme_card_hsl: config.theme_card_hsl,
      theme_muted_hsl: config.theme_muted_hsl, theme_border_hsl: config.theme_border_hsl,
      theme_foreground_hsl: config.theme_foreground_hsl,
    });

    return [
      React.createElement(Section, {
        key: "theme-info",
        title: "Theme & Brand Colors",
        subtitle: "Enter values as HSL without the hsl() wrapper — e.g. 160 84% 39%. Changes preview live in this tab before saving.",
      },
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" } },
          THEME_FIELDS.map(field =>
            React.createElement("div", { key: field.key },
              React.createElement("label", { style: { display: "block", fontWeight: 600, fontSize: "0.85rem", marginBottom: 4 } }, field.label),
              React.createElement("p", { style: { fontSize: "0.72rem", color: "hsl(var(--muted-foreground))", marginBottom: 8 } }, field.hint),
              React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } },
                React.createElement("input", {
                  type: "color",
                  value: hslToHex(themeLocal[field.key]),
                  onChange: (e: any) => setThemeField(field.key, hexToHsl(e.target.value)),
                  style: { width: 40, height: 40, borderRadius: 8, border: "1px solid hsl(var(--border))", cursor: "pointer", padding: 2 },
                }),
                React.createElement("input", {
                  type: "text",
                  value: themeLocal[field.key],
                  onChange: (e: any) => setThemeField(field.key, e.target.value),
                  placeholder: "e.g. 160 84% 39%",
                  style: {
                    flex: 1, border: "1px solid hsl(var(--border))", borderRadius: 8,
                    padding: "9px 12px", fontSize: "0.875rem", fontFamily: "monospace",
                    background: "hsl(var(--background))", color: "hsl(var(--foreground))", outline: "none",
                  },
                }),
                React.createElement("div", {
                  style: { width: 36, height: 36, borderRadius: 8, border: "1px solid hsl(var(--border))", background: `hsl(${themeLocal[field.key]})`, flexShrink: 0 },
                }),
              ),
            )
          ),
        ),

        React.createElement("div", { style: { marginTop: "1.5rem", display: "flex", gap: 12, alignItems: "center" } },
          React.createElement("button", {
            onClick: saveAllTheme,
            disabled: !themeChanged || saving === "theme_all",
            className: themeChanged ? "premium-gradient" : "",
            style: {
              border: themeChanged ? "none" : "1px solid hsl(var(--border))",
              background: themeChanged ? undefined : "hsl(var(--muted))",
              color: themeChanged ? "#fff" : "hsl(var(--muted-foreground))",
              borderRadius: 10, padding: "10px 28px", fontWeight: 600, cursor: themeChanged ? "pointer" : "default",
              fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 7,
              opacity: saving === "theme_all" ? 0.7 : themeChanged ? 1 : 0.4,
            },
          },
            React.createElement(icons.save, {}),
            saving === "theme_all" ? "Saving…" : themeChanged ? "Save Theme" : "No Changes",
          ),
          themeChanged && React.createElement("button", {
            onClick: () => {
              setThemeLocal({
                theme_primary_hsl: config.theme_primary_hsl, theme_primary_fg: config.theme_primary_fg,
                theme_background_hsl: config.theme_background_hsl, theme_card_hsl: config.theme_card_hsl,
                theme_muted_hsl: config.theme_muted_hsl, theme_border_hsl: config.theme_border_hsl,
                theme_foreground_hsl: config.theme_foreground_hsl,
              });
              applyThemeToCss(config);
            },
            style: { border: "1px solid hsl(var(--border))", background: "transparent", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" },
          }, "Reset Preview"),
        ),
      ),

      React.createElement(Section, {
        key: "theme-tip",
        title: "💡 How colors work",
        subtitle: "All CSS variables are injected into :root — every Tailwind class using text-primary, bg-card etc. updates automatically",
      },
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 } },
          THEME_FIELDS.map(f =>
            React.createElement("div", {
              key: f.key,
              style: {
                borderRadius: 10, padding: "12px", border: "1px solid hsl(var(--border))",
                background: `hsl(${themeLocal[f.key]})`,
                display: "flex", alignItems: "center", justifyContent: "center",
              },
            },
              React.createElement("span", {
                style: {
                  fontSize: "0.75rem", fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                  background: "rgba(255,255,255,0.7)", color: "#111",
                },
              }, f.label),
            )
          ),
        ),
      ),
    ];
  }

  // ─── MAP RENDERER ─────────────────────────────────────────────────────────────
  function renderMap(): React.ReactNode[] {
    const mapChanged = JSON.stringify(mapLocal) !== JSON.stringify({
      map_default_lat:   config.map_default_lat,
      map_default_lng:   config.map_default_lng,
      map_default_zoom:  config.map_default_zoom,
      map_default_layer: config.map_default_layer,
    });

    const saveAllMap = async () => {
      setSaving("map_all");
      try {
        await dbSet("map_default_lat",   mapLocal.map_default_lat);
        await dbSet("map_default_lng",   mapLocal.map_default_lng);
        await dbSet("map_default_zoom",  mapLocal.map_default_zoom);
        await dbSet("map_default_layer", mapLocal.map_default_layer);
        await refresh();
        toast.success("Map defaults saved — new users will see the updated view");
      } catch (e: any) { toast.error(e.message ?? "Error saving map config"); }
      setSaving(null);
    };

    return [
      React.createElement(Section, {
        key: "map-center",
        title: "Default Map View",
        subtitle: "These values set the initial center and zoom when users first open the map app.",
      },
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.25rem" } },

          // Latitude
          React.createElement("div", { key: "lat" },
            React.createElement("label", { style: { display: "block", fontWeight: 600, fontSize: "0.85rem", marginBottom: 4 } }, "Default Latitude"),
            React.createElement("p", { style: { fontSize: "0.72rem", color: "hsl(var(--muted-foreground))", marginBottom: 8 } }, "Decimal degrees. Lithuania: ~54–57°N"),
            React.createElement("input", {
              type: "number", step: "0.0001", min: "-90", max: "90",
              value: mapLocal.map_default_lat,
              onChange: (e: any) => setMapLocal(m => ({ ...m, map_default_lat: parseFloat(e.target.value) || 0 })),
              style: { width: "100%", border: "1px solid hsl(var(--border))", borderRadius: 8, padding: "9px 12px", fontSize: "0.875rem", background: "hsl(var(--background))", color: "hsl(var(--foreground))", outline: "none", boxSizing: "border-box" as const },
            }),
          ),

          // Longitude
          React.createElement("div", { key: "lng" },
            React.createElement("label", { style: { display: "block", fontWeight: 600, fontSize: "0.85rem", marginBottom: 4 } }, "Default Longitude"),
            React.createElement("p", { style: { fontSize: "0.72rem", color: "hsl(var(--muted-foreground))", marginBottom: 8 } }, "Decimal degrees. Lithuania: ~21–27°E"),
            React.createElement("input", {
              type: "number", step: "0.0001", min: "-180", max: "180",
              value: mapLocal.map_default_lng,
              onChange: (e: any) => setMapLocal(m => ({ ...m, map_default_lng: parseFloat(e.target.value) || 0 })),
              style: { width: "100%", border: "1px solid hsl(var(--border))", borderRadius: 8, padding: "9px 12px", fontSize: "0.875rem", background: "hsl(var(--background))", color: "hsl(var(--foreground))", outline: "none", boxSizing: "border-box" as const },
            }),
          ),

          // Zoom
          React.createElement("div", { key: "zoom" },
            React.createElement("label", { style: { display: "block", fontWeight: 600, fontSize: "0.85rem", marginBottom: 4 } }, `Default Zoom: ${mapLocal.map_default_zoom}`),
            React.createElement("p", { style: { fontSize: "0.72rem", color: "hsl(var(--muted-foreground))", marginBottom: 8 } }, "1 = world · 8 = country · 13 = city · 18 = street"),
            React.createElement("input", {
              type: "range", min: "1", max: "18", step: "1",
              value: mapLocal.map_default_zoom,
              onChange: (e: any) => setMapLocal(m => ({ ...m, map_default_zoom: parseInt(e.target.value, 10) })),
              style: { width: "100%", accentColor: "hsl(var(--primary))", marginBottom: 6 },
            }),
            React.createElement("input", {
              type: "number", min: "1", max: "18",
              value: mapLocal.map_default_zoom,
              onChange: (e: any) => setMapLocal(m => ({ ...m, map_default_zoom: parseInt(e.target.value, 10) || 8 })),
              style: { width: "80px", border: "1px solid hsl(var(--border))", borderRadius: 8, padding: "7px 10px", fontSize: "0.875rem", background: "hsl(var(--background))", color: "hsl(var(--foreground))", outline: "none" },
            }),
          ),

          // Default layer
          React.createElement("div", { key: "layer" },
            React.createElement("label", { style: { display: "block", fontWeight: 600, fontSize: "0.85rem", marginBottom: 4 } }, "Default Base Layer"),
            React.createElement("p", { style: { fontSize: "0.72rem", color: "hsl(var(--muted-foreground))", marginBottom: 8 } }, "Layer shown when map first loads"),
            React.createElement("div", { style: { display: "flex", gap: 8 } },
              ["standard", "ortho"].map(opt =>
                React.createElement("button", {
                  key: opt,
                  onClick: () => setMapLocal(m => ({ ...m, map_default_layer: opt as "standard" | "ortho" })),
                  style: {
                    flex: 1, borderRadius: 8, padding: "9px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
                    border: mapLocal.map_default_layer === opt ? "2px solid hsl(var(--primary))" : "1px solid hsl(var(--border))",
                    background: mapLocal.map_default_layer === opt ? "hsl(var(--primary) / 0.08)" : "hsl(var(--background))",
                    color: mapLocal.map_default_layer === opt ? "hsl(var(--primary))" : "hsl(var(--foreground))",
                  },
                }, opt === "standard" ? "🗺️ Standard" : "🛰️ Ortho/Satellite")
              ),
            ),
          ),
        ),

        // Preview + Save
        React.createElement("div", { style: { marginTop: "1.5rem", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" } },
          React.createElement("button", {
            onClick: saveAllMap,
            disabled: !mapChanged || saving === "map_all",
            className: mapChanged ? "premium-gradient" : "",
            style: {
              border: mapChanged ? "none" : "1px solid hsl(var(--border))",
              background: mapChanged ? undefined : "hsl(var(--muted))",
              color: mapChanged ? "#fff" : "hsl(var(--muted-foreground))",
              borderRadius: 10, padding: "10px 28px", fontWeight: 600, cursor: mapChanged ? "pointer" : "default",
              fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 7,
              opacity: saving === "map_all" ? 0.7 : mapChanged ? 1 : 0.4,
            },
          },
            React.createElement(icons.save, {}),
            saving === "map_all" ? "Saving…" : mapChanged ? "Save Map Defaults" : "No Changes",
          ),
          React.createElement("a", {
            href: `https://www.openstreetmap.org/#map=${mapLocal.map_default_zoom}/${mapLocal.map_default_lat}/${mapLocal.map_default_lng}`,
            target: "_blank", rel: "noreferrer",
            style: { fontSize: "0.82rem", color: "hsl(var(--primary))", textDecoration: "underline", cursor: "pointer" },
          }, `Preview on OSM → ${mapLocal.map_default_lat.toFixed(4)}, ${mapLocal.map_default_lng.toFixed(4)} z${mapLocal.map_default_zoom}`),
        ),
      ),
    ];
  }

  // ─── USERS RENDERER ───────────────────────────────────────────────────────────
  function renderUsers(): React.ReactNode[] {
    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const { data: creditsData } = await supabase.from("user_credits").select("user_id, credits");
        const { data: rolesData }   = await supabase.from("user_roles").select("user_id, role");

        const creditsMap: Record<string, number> = {};
        creditsData?.forEach(c => { creditsMap[c.user_id] = c.credits; });
        const rolesMap: Record<string, string> = {};
        rolesData?.forEach(r => { rolesMap[r.user_id] = r.role; });

        const allIds = Array.from(new Set([
          ...(creditsData?.map(c => c.user_id) ?? []),
          ...(rolesData?.map(r => r.user_id) ?? []),
        ]));

        const list = allIds.map(id => ({
          id,
          email: id.slice(0, 8) + "…" + id.slice(-4),
          credits: creditsMap[id] ?? 0,
          role: rolesMap[id] ?? "user",
        }));
        setUsers(list);

        const edits: Record<string, number> = {};
        allIds.forEach(id => { edits[id] = creditsMap[id] ?? 0; });
        setCreditEdits(edits);
      } finally { setUsersLoading(false); }
    };

    const saveCredits = async (userId: string) => {
      const { error } = await supabase.from("user_credits")
        .upsert({ user_id: userId, credits: creditEdits[userId] }, { onConflict: "user_id" });
      if (error) { toast.error("Error updating credits"); return; }
      toast.success("Credits updated");
      setUsers(us => us.map(u => u.id === userId ? { ...u, credits: creditEdits[userId] } : u));
    };

    const toggleRole = async (userId: string, currentRole: string) => {
      const newRole = currentRole === "admin" ? "user" : "admin";
      const { error } = await supabase.from("user_roles")
        .upsert({ user_id: userId, role: newRole }, { onConflict: "user_id" });
      if (error) { toast.error("Error changing role"); return; }
      toast.success(`Role changed to "${newRole}"`);
      setUsers(us => us.map(u => u.id === userId ? { ...u, role: newRole } : u));
    };

    if (users.length === 0 && !usersLoading) {
      return [React.createElement(Section, { key: "users-empty", title: "User Management", subtitle: "View users, adjust credits, grant admin access" },
        React.createElement("div", { style: { textAlign: "center", padding: "2rem 0" } },
          React.createElement("button", {
            onClick: loadUsers,
            className: "premium-gradient",
            style: { border: "none", color: "#fff", borderRadius: 10, padding: "10px 28px", fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" },
          }, "Load Users"),
          React.createElement("p", { style: { marginTop: 10, fontSize: "0.78rem", color: "hsl(var(--muted-foreground))" } },
            "Queries user_credits and user_roles tables. Only loads on demand.",
          ),
        ),
      )];
    }

    return [
      React.createElement(Section, {
        key: "users-table",
        title: `User Management — ${users.length} users`,
        subtitle: "Adjust credits and admin roles. Use the Supabase dashboard for full user details.",
        action: React.createElement("button", {
          onClick: loadUsers, disabled: usersLoading,
          style: { border: "1px solid hsl(var(--border))", background: "transparent", borderRadius: 8, padding: "5px 12px", fontSize: "0.78rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 },
        }, usersLoading ? "Loading…" : "↻ Refresh"),
      },
        usersLoading
          ? React.createElement("div", { style: { textAlign: "center", padding: "2rem", color: "hsl(var(--muted-foreground))" } }, "Loading…")
          : React.createElement("div", { style: { overflowX: "auto" } },
              React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" } },
                React.createElement("thead", {},
                  React.createElement("tr", { style: { borderBottom: "1px solid hsl(var(--border))" } },
                    ["User ID", "Role", "Credits", "Actions"].map(h =>
                      React.createElement("th", { key: h, style: { textAlign: "left", padding: "8px 12px", fontWeight: 700, color: "hsl(var(--muted-foreground))", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" } }, h)
                    )
                  )
                ),
                React.createElement("tbody", {},
                  users.map((u, i) =>
                    React.createElement("tr", {
                      key: u.id,
                      style: { borderBottom: "1px solid hsl(var(--border) / 0.5)", background: i % 2 === 0 ? "transparent" : "hsl(var(--muted) / 0.3)" },
                    },
                      // ID
                      React.createElement("td", { style: { padding: "10px 12px", fontFamily: "monospace", fontSize: "0.78rem", color: "hsl(var(--muted-foreground))" } },
                        u.id.slice(0,8), "…", u.id.slice(-4),
                      ),
                      // Role
                      React.createElement("td", { style: { padding: "10px 12px" } },
                        React.createElement(Badge, {
                          color: u.role === "admin" ? "blue" : "gray",
                          label: u.role,
                        }),
                      ),
                      // Credits
                      React.createElement("td", { style: { padding: "10px 12px" } },
                        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                          React.createElement("input", {
                            type: "number", min: "0",
                            value: creditEdits[u.id] ?? u.credits,
                            onChange: (e: any) => setCreditEdits(prev => ({ ...prev, [u.id]: parseInt(e.target.value,10) || 0 })),
                            style: { width: 72, border: "1px solid hsl(var(--border))", borderRadius: 7, padding: "5px 8px", fontSize: "0.85rem", background: "hsl(var(--background))", color: "hsl(var(--foreground))", outline: "none" },
                          }),
                          (creditEdits[u.id] ?? u.credits) !== u.credits &&
                            React.createElement("button", {
                              onClick: () => saveCredits(u.id),
                              className: "premium-gradient",
                              style: { border: "none", color: "#fff", borderRadius: 7, padding: "5px 12px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" },
                            }, "Save"),
                        ),
                      ),
                      // Actions
                      React.createElement("td", { style: { padding: "10px 12px" } },
                        React.createElement("button", {
                          onClick: () => toggleRole(u.id, u.role),
                          style: {
                            border: `1px solid ${u.role === "admin" ? "hsl(0 84% 60% / 0.4)" : "hsl(217 91% 60% / 0.4)"}`,
                            background: u.role === "admin" ? "hsl(0 84% 60% / 0.06)" : "hsl(217 91% 60% / 0.06)",
                            color: u.role === "admin" ? "hsl(0 72% 45%)" : "hsl(217 91% 40%)",
                            borderRadius: 8, padding: "5px 12px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                          },
                        }, u.role === "admin" ? "Revoke Admin" : "Make Admin"),
                      ),
                    )
                  )
                ),
              ),
            ),
      ),
    ];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return React.createElement("div", {
    style: { minHeight: "100vh", background: "hsl(var(--background))", display: "flex", flexDirection: "column" },
  },
    React.createElement("style", {}, `
      @keyframes spin { to { transform: rotate(360deg); } }
      .admin-nav-btn:hover { background: hsl(var(--muted)); }
    `),

    // ── Top nav ──
    React.createElement("div", {
      style: {
        borderBottom: "1px solid hsl(var(--border))", background: "hsl(var(--card))",
        padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 56, position: "sticky", top: 0, zIndex: 100, flexShrink: 0,
      },
    },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
        React.createElement("button", {
          onClick: () => navigate("/map"),
          style: { background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, padding: 0 },
        },
          React.createElement("span", { className: "text-primary" }, React.createElement(icons.pages, {})),
          React.createElement("span", { className: "font-display font-bold text-foreground", style: { fontSize: "1rem" } },
            "Žemė", React.createElement("span", { className: "text-gradient" }, "Pro"),
          ),
        ),
        React.createElement("span", {
          style: {
            background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))",
            fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
            padding: "2px 9px", borderRadius: 999, border: "1px solid hsl(var(--primary) / 0.2)",
          },
        }, "Admin"),
        maintOn && React.createElement(Badge, { color: "red", label: "⚠️ Maintenance ON" }),
      ),
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
        React.createElement("span", { style: { fontSize: "0.8rem", color: "hsl(var(--muted-foreground))" } }, user.email),
        React.createElement("button", {
          onClick: () => signOut().then(() => navigate("/")),
          style: {
            background: "none", border: "1px solid hsl(var(--border))", borderRadius: 8,
            padding: "5px 12px", fontSize: "0.78rem", color: "hsl(var(--muted-foreground))",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
          },
        }, React.createElement(icons.logout, {}), "Sign out"),
      ),
    ),

    // ── Body ──
    React.createElement("div", { style: { display: "flex", flex: 1, minHeight: 0 } },

      // Sidebar
      React.createElement("aside", {
        style: {
          width: 220, borderRight: "1px solid hsl(var(--border))", background: "hsl(var(--card))",
          padding: "1rem 0.75rem", flexShrink: 0, position: "sticky", top: 56, height: "calc(100vh - 56px)",
          overflowY: "auto",
        },
      },
        navItems.map(item =>
          React.createElement("button", {
            key: item.id,
            className: "admin-nav-btn",
            onClick: () => setPage(item.id),
            style: {
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 10, border: "none", cursor: "pointer",
              fontWeight: page === item.id ? 700 : 500, fontSize: "0.875rem",
              background: page === item.id ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: page === item.id ? "hsl(var(--primary))" : "hsl(var(--foreground))",
              marginBottom: 2, textAlign: "left", transition: "background .15s",
            },
          },
            React.createElement(item.icon, {}),
            item.label,
          )
        ),
      ),

      // Main content
      React.createElement("main", {
        style: { flex: 1, overflowY: "auto", padding: "1.75rem clamp(1rem, 3vw, 2rem)" },
      },
        // Page header
        React.createElement("div", { style: { marginBottom: "1.5rem" } },
          React.createElement("h1", {
            className: "font-display font-bold text-foreground",
            style: { fontSize: "1.5rem", letterSpacing: "-0.02em", margin: "0 0 4px" },
          }, navItems.find(n => n.id === page)?.label ?? ""),
        ),

        // Page content
        ...pageContent[page](),
      ),
    ),
  );
}
