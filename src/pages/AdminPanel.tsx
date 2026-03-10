import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppConfig, type AppConfigRow } from "@/hooks/useAppConfig";
import { toast } from "sonner";

const ADMIN_EMAILS = ["aidasaleksonis@gmail.com"];

const Ico = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const IcoLayers   = () => <Ico d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />;
const IcoLock     = () => <Ico d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4" />;
const IcoZap      = () => <Ico d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />;
const IcoSettings = () => <Ico d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />;
const IcoOrder    = () => <Ico d="M3 6h18M3 12h18M3 18h18" />;
const IcoUp       = () => <Ico d="M18 15l-6-6-6 6" />;
const IcoDown     = () => <Ico d="M6 9l6 6 6-6" />;
const IcoSave     = () => <Ico d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8" />;
const IcoLogout   = () => <Ico d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />;
const IcoShield   = () => <Ico d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const IcoMap      = () => <Ico d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const GROUP_META: Record<string, { label: string; icon: React.ReactNode; desc: string }> = {
  field_locks: {
    label: "Laukų užrakinimas",
    icon: <IcoLock />,
    desc: "Valdykite, kurie ataskaitos laukai yra mokami (reikalauja kredito) ir kurie rodomi nemokamai.",
  },
  features: {
    label: "Funkcijų vėliavos",
    icon: <IcoZap />,
    desc: "Įjunkite arba išjunkite programos funkcijas realiu laiku be kodo pakeitimų.",
  },
  settings: {
    label: "Bendrieji nustatymai",
    icon: <IcoSettings />,
    desc: "Skaitiniai ir konfigūraciniai nustatymai.",
  },
};

const SECTION_LABELS: Record<string, { label: string; icon: string }> = {
  found_banner:  { label: "Rastas sklypas (žalias baneris)", icon: "✅" },
  map:           { label: "Interaktyvus žemėlapis",          icon: "🗺️" },
  basic_info:    { label: "Pagrindinė informacija",           icon: "📋" },
  market_value:  { label: "Rinkos vertė",                    icon: "💶" },
  technical:     { label: "Techniniai duomenys",             icon: "📐" },
  address:       { label: "Adresas ir koordinatės",          icon: "📍" },
};

// ─── Toggle component ─────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        border: "none",
        cursor: disabled ? "default" : "pointer",
        background: checked ? "hsl(var(--primary))" : "hsl(var(--muted))",
        position: "relative",
        transition: "background .2s",
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
      aria-checked={checked}
      role="switch"
    >
      <span style={{
        position: "absolute",
        top: 3,
        left: checked ? 23 : 3,
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        transition: "left .2s",
        display: "block",
      }} />
    </button>
  );
}

// ─── Section row with label + toggle ─────────────────────────────────────────
function ConfigRow({
  row,
  onToggle,
  saving,
}: {
  row: AppConfigRow;
  onToggle: (key: string, val: boolean) => void;
  saving: string | null;
}) {
  const isBoolean = typeof row.value === "boolean" || row.value === "true" || row.value === "false";
  const boolVal   = row.value === true || row.value === "true";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 0",
      borderBottom: "1px solid hsl(var(--border))",
      gap: 16,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "hsl(var(--foreground))", margin: 0 }}>
          {row.label || row.key}
        </p>
        {row.description && (
          <p style={{ fontSize: "0.78rem", color: "hsl(var(--muted-foreground))", margin: "2px 0 0", lineHeight: 1.5 }}>
            {row.description}
          </p>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {saving === row.key && (
          <span style={{ fontSize: "0.7rem", color: "hsl(var(--primary))", fontWeight: 600 }}>Saugoma…</span>
        )}
        {isBoolean ? (
          <>
            <span style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: boolVal ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
              minWidth: 30,
            }}>
              {boolVal ? "Įjungta" : "Išjungta"}
            </span>
            <Toggle
              checked={boolVal}
              onChange={(v) => onToggle(row.key, v)}
              disabled={saving === row.key}
            />
          </>
        ) : (
          <span style={{ fontSize: "0.85rem", fontFamily: "monospace", color: "hsl(var(--muted-foreground))" }}>
            {String(row.value)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Settings number/text editor ─────────────────────────────────────────────
function SettingsEditor({ rows, onSave }: { rows: AppConfigRow[]; onSave: (key: string, val: any) => Promise<void> }) {
  const [localVals, setLocalVals] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const init: Record<string, string> = {};
    rows.forEach(r => { init[r.key] = String(r.value); });
    setLocalVals(init);
  }, [rows]);

  const handleSave = async (key: string) => {
    setSaving(key);
    await onSave(key, localVals[key]);
    setSaving(null);
  };

  return (
    <div>
      {rows.map(row => (
        <div key={row.key} style={{ padding: "14px 0", borderBottom: "1px solid hsl(var(--border))" }}>
          <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "hsl(var(--foreground))", margin: "0 0 4px" }}>
            {row.label || row.key}
          </p>
          {row.description && (
            <p style={{ fontSize: "0.78rem", color: "hsl(var(--muted-foreground))", margin: "0 0 8px", lineHeight: 1.5 }}>
              {row.description}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={localVals[row.key] ?? ""}
              onChange={e => setLocalVals(prev => ({ ...prev, [row.key]: e.target.value }))}
              style={{
                flex: 1,
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: "0.875rem",
                background: "hsl(var(--background))",
                color: "hsl(var(--foreground))",
                outline: "none",
                fontFamily: row.key.includes("order") ? "monospace" : "inherit",
              }}
            />
            <button
              onClick={() => handleSave(row.key)}
              disabled={saving === row.key}
              className="premium-gradient"
              style={{
                border: "none",
                color: "#fff",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                opacity: saving === row.key ? 0.7 : 1,
              }}
            >
              <IcoSave />
              {saving === row.key ? "…" : "Išsaugoti"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Section order editor ─────────────────────────────────────────────────────
function SectionOrderEditor({ initialOrder, onSave }: { initialOrder: string[]; onSave: (order: string[]) => Promise<void> }) {
  const [order, setOrder] = useState<string[]>(initialOrder);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setOrder(initialOrder); }, [initialOrder]);

  const move = (i: number, dir: -1 | 1) => {
    const next = [...order];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(order);
    setSaving(false);
  };

  return (
    <div>
      <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-foreground))", marginBottom: 16, lineHeight: 1.6 }}>
        Vilkite arba naudokite rodykles, kad pakeistumėte sekcijų tvarką pilnoje ataskaitoje.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {order.map((id, i) => {
          const meta = SECTION_LABELS[id] ?? { label: id, icon: "📄" };
          return (
            <div key={id} style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 10,
              padding: "10px 14px",
              userSelect: "none",
            }}>
              <span style={{ fontSize: "1.2rem", width: 28, textAlign: "center" }}>{meta.icon}</span>
              <span style={{ flex: 1, fontWeight: 500, fontSize: "0.9rem", color: "hsl(var(--foreground))" }}>{meta.label}</span>
              <span style={{ fontSize: "0.72rem", color: "hsl(var(--muted-foreground))", fontFamily: "monospace", marginRight: 4 }}>
                {i + 1}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  style={{
                    background: "none", border: "1px solid hsl(var(--border))",
                    borderRadius: 6, padding: "3px 6px", cursor: i === 0 ? "default" : "pointer",
                    opacity: i === 0 ? 0.3 : 1, color: "hsl(var(--foreground))", display: "flex",
                  }}
                >
                  <IcoUp />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1}
                  style={{
                    background: "none", border: "1px solid hsl(var(--border))",
                    borderRadius: 6, padding: "3px 6px", cursor: i === order.length - 1 ? "default" : "pointer",
                    opacity: i === order.length - 1 ? 0.3 : 1, color: "hsl(var(--foreground))", display: "flex",
                  }}
                >
                  <IcoDown />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="premium-gradient"
        style={{
          border: "none", color: "#fff", borderRadius: 10,
          padding: "10px 24px", fontSize: "0.875rem", fontWeight: 600,
          cursor: "pointer", display: "flex", alignItems: "center",
          gap: 8, opacity: saving ? 0.7 : 1,
        }}
      >
        <IcoSave />
        {saving ? "Saugoma…" : "Išsaugoti tvarką"}
      </button>
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function Tab({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 18px",
        borderRadius: 10,
        border: "none",
        cursor: "pointer",
        fontWeight: active ? 700 : 500,
        fontSize: "0.875rem",
        background: active ? "hsl(var(--primary) / 0.1)" : "transparent",
        color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
        transition: "all .18s",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      borderRadius: 14,
      padding: "1.5rem",
      boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Main admin page ──────────────────────────────────────────────────────────
type TabId = "overview" | "field_locks" | "features" | "section_order" | "settings";

export default function AdminPanel() {
  const navigate    = useNavigate();
  const { user, signOut } = useAuth();
  const { rows, config, loading, refresh } = useAppConfig();
  const [tab, setTab]   = useState<TabId>("overview");
  const [saving, setSaving] = useState<string | null>(null);

  // ── Access guard ──
  const isAdmin = user && ADMIN_EMAILS.includes(user.email ?? "");

  // ── Save a single boolean toggle ──
  const handleToggle = useCallback(async (key: string, val: boolean) => {
    setSaving(key);
    const { error } = await supabase
      .from("app_config")
      .update({ value: val })
      .eq("key", key);
    if (error) {
      toast.error(`Klaida: ${error.message}`);
    } else {
      toast.success(`"${key}" atnaujinta`);
      await refresh();
    }
    setSaving(null);
  }, [refresh]);

  // ── Save arbitrary value ──
  const handleSaveValue = useCallback(async (key: string, val: any) => {
    let parsedVal = val;
    if (key === "report_sections_order") {
      try { parsedVal = JSON.parse(val); } catch { toast.error("Neteisingas JSON formatas"); return; }
    } else if (!isNaN(Number(val)) && val !== "") {
      parsedVal = Number(val);
    }
    const { error } = await supabase
      .from("app_config")
      .update({ value: parsedVal })
      .eq("key", key);
    if (error) {
      toast.error(`Klaida: ${error.message}`);
    } else {
      toast.success("Išsaugota");
      await refresh();
    }
  }, [refresh]);

  // ── Save section order ──
  const handleSaveOrder = useCallback(async (order: string[]) => {
    await handleSaveValue("report_sections_order", JSON.stringify(order));
  }, [handleSaveValue]);

  // ── Derived row groups ──
  const fieldLockRows = rows.filter(r => r.group_name === "field_locks");
  const featureRows   = rows.filter(r => r.group_name === "features");
  const settingRows   = rows.filter(r => r.group_name === "settings" && r.key !== "report_sections_order");
  const lockedCount   = fieldLockRows.filter(r => r.value === true || r.value === "true").length;
  const enabledCount  = featureRows.filter(r => r.value === true || r.value === "true").length;

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "hsl(var(--background))" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            border: "3px solid hsl(var(--border))",
            borderTop: "3px solid hsl(var(--primary))",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 12px",
          }} />
          <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.875rem" }}>Kraunama…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Access denied ──
  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "hsl(var(--background))", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Card style={{ maxWidth: 400, textAlign: "center" }}>
          <div style={{ color: "hsl(var(--muted-foreground))", marginBottom: 16, display: "flex", justifyContent: "center" }}><IcoShield /></div>
          <h2 style={{ fontWeight: 700, marginBottom: 8, color: "hsl(var(--foreground))" }}>Prisijunkite</h2>
          <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.875rem", marginBottom: 20 }}>
            Jums reikia prisijungti, kad pasiektumėte admin skydelį.
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="premium-gradient"
            style={{ border: "none", color: "#fff", borderRadius: 10, padding: "10px 28px", fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" }}
          >
            Prisijungti
          </button>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ minHeight: "100vh", background: "hsl(var(--background))", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Card style={{ maxWidth: 400, textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🚫</div>
          <h2 style={{ fontWeight: 700, marginBottom: 8, color: "hsl(var(--foreground))" }}>Prieiga uždrausta</h2>
          <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.875rem", marginBottom: 20 }}>
            Jūsų paskyra ({user.email}) neturi administratoriaus teisių.
          </p>
          <button
            onClick={() => navigate("/")}
            style={{ border: "1px solid hsl(var(--border))", background: "transparent", color: "hsl(var(--foreground))", borderRadius: 10, padding: "10px 28px", fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" }}
          >
            Grįžti
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "hsl(var(--background))", fontFamily: "'Inter', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Top nav ── */}
      <div style={{
        borderBottom: "1px solid hsl(var(--border))",
        background: "hsl(var(--card))",
        padding: "0 clamp(1rem, 4vw, 2.5rem)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 58,
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => navigate("/map")}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, color: "hsl(var(--foreground))", padding: 0 }}
          >
            <span className="text-primary"><IcoLayers /></span>
            <span className="font-display font-bold" style={{ fontSize: "1rem" }}>
              Žemė<span className="text-gradient">Pro</span>
            </span>
          </button>
          <span style={{
            background: "hsl(var(--primary) / 0.12)",
            color: "hsl(var(--primary))",
            fontSize: "0.68rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "3px 10px",
            borderRadius: 999,
            border: "1px solid hsl(var(--primary) / 0.2)",
          }}>
            Admin
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "0.8rem", color: "hsl(var(--muted-foreground))" }}>{user.email}</span>
          <button
            onClick={() => signOut().then(() => navigate("/"))}
            style={{
              background: "none", border: "1px solid hsl(var(--border))",
              borderRadius: 8, padding: "6px 14px",
              fontSize: "0.8rem", color: "hsl(var(--muted-foreground))",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <IcoLogout />
            Atsijungti
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem clamp(1rem, 4vw, 2rem)" }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 className="font-display font-bold text-foreground" style={{ fontSize: "1.7rem", letterSpacing: "-0.02em", margin: "0 0 6px" }}>
            Admin skydelis
          </h1>
          <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.875rem" }}>
            Valdykite laukų užrakinimą, funkcijų vėliavas ir ataskaitos struktūrą realiu laiku.
          </p>
        </div>

        {/* ── Tabs ── */}
        <div style={{
          display: "flex",
          gap: 4,
          background: "hsl(var(--muted))",
          borderRadius: 12,
          padding: 4,
          marginBottom: "1.75rem",
          overflowX: "auto",
        }}>
          <Tab label="Apžvalga"     icon={<IcoMap />}      active={tab === "overview"}      onClick={() => setTab("overview")} />
          <Tab label="Laukų užraktas" icon={<IcoLock />}   active={tab === "field_locks"}   onClick={() => setTab("field_locks")} />
          <Tab label="Funkcijos"    icon={<IcoZap />}      active={tab === "features"}      onClick={() => setTab("features")} />
          <Tab label="Sekcijų tvarka" icon={<IcoOrder />}  active={tab === "section_order"} onClick={() => setTab("section_order")} />
          <Tab label="Nustatymai"   icon={<IcoSettings />} active={tab === "settings"}      onClick={() => setTab("settings")} />
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>

            {/* Stat: locked fields */}
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ background: "hsl(var(--primary) / 0.1)", borderRadius: 8, padding: 8, color: "hsl(var(--primary))" }}><IcoLock /></div>
                <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "hsl(var(--foreground))" }}>Užrakinti laukai</span>
              </div>
              <div className="font-display font-bold" style={{ fontSize: "2rem", color: "hsl(var(--primary))" }}>{lockedCount}</div>
              <p style={{ fontSize: "0.78rem", color: "hsl(var(--muted-foreground))", margin: "4px 0 0" }}>iš {fieldLockRows.length} reikalauja kredito</p>
            </Card>

            {/* Stat: enabled features */}
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ background: "hsl(var(--primary) / 0.1)", borderRadius: 8, padding: 8, color: "hsl(var(--primary))" }}><IcoZap /></div>
                <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "hsl(var(--foreground))" }}>Aktyvios funkcijos</span>
              </div>
              <div className="font-display font-bold" style={{ fontSize: "2rem", color: "hsl(var(--primary))" }}>{enabledCount}</div>
              <p style={{ fontSize: "0.78rem", color: "hsl(var(--muted-foreground))", margin: "4px 0 0" }}>iš {featureRows.length} įjungtos</p>
            </Card>

            {/* Stat: maintenance */}
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ background: config.maintenance_mode ? "hsl(var(--destructive) / 0.1)" : "hsl(var(--primary) / 0.1)", borderRadius: 8, padding: 8, color: config.maintenance_mode ? "hsl(var(--destructive))" : "hsl(var(--primary))" }}>
                  <IcoShield />
                </div>
                <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "hsl(var(--foreground))" }}>Priežiūros režimas</span>
              </div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 12px", borderRadius: 999,
                background: config.maintenance_mode ? "hsl(var(--destructive) / 0.1)" : "hsl(160 84% 39% / 0.1)",
                color: config.maintenance_mode ? "hsl(var(--destructive))" : "hsl(var(--primary))",
                fontWeight: 700, fontSize: "0.85rem",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                {config.maintenance_mode ? "ĮJUNGTAS" : "Išjungtas"}
              </div>
              <p style={{ fontSize: "0.78rem", color: "hsl(var(--muted-foreground))", margin: "6px 0 0" }}>
                {config.maintenance_mode ? "Vartotojai mato priežiūros puslapį" : "Aplikacija veikia normaliai"}
              </p>
            </Card>

            {/* Stat: free credits */}
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ background: "hsl(var(--primary) / 0.1)", borderRadius: 8, padding: 8, color: "hsl(var(--primary))" }}>
                  <IcoSettings />
                </div>
                <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "hsl(var(--foreground))" }}>Nemokami kreditai</span>
              </div>
              <div className="font-display font-bold" style={{ fontSize: "2rem", color: "hsl(var(--primary))" }}>
                {config.free_credits_on_signup}
              </div>
              <p style={{ fontSize: "0.78rem", color: "hsl(var(--muted-foreground))", margin: "4px 0 0" }}>kreditai naujam vartotojui</p>
            </Card>

            {/* Quick toggles */}
            <Card style={{ gridColumn: "1 / -1" }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: "0.95rem", color: "hsl(var(--foreground))" }}>
                Greiti nustatymai
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
                {[...fieldLockRows, ...featureRows].filter(r => {
                  return ["lock_market_value", "lock_map", "maintenance_mode", "feature_cadastral_search", "feature_map_identify", "feature_landing_page"].includes(r.key);
                }).map(row => (
                  <div key={row.key} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "hsl(var(--muted) / 0.5)", borderRadius: 10, padding: "10px 14px",
                    border: "1px solid hsl(var(--border))",
                  }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "hsl(var(--foreground))" }}>{row.label || row.key}</span>
                    <Toggle
                      checked={row.value === true || row.value === "true"}
                      onChange={v => handleToggle(row.key, v)}
                      disabled={saving === row.key}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── FIELD LOCKS ── */}
        {tab === "field_locks" && (
          <Card>
            <div style={{ marginBottom: 20 }}>
              <h2 className="font-display font-bold text-foreground" style={{ fontSize: "1.15rem", margin: "0 0 6px" }}>
                {GROUP_META.field_locks.label}
              </h2>
              <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.875rem", lineHeight: 1.6 }}>
                {GROUP_META.field_locks.desc}
              </p>
            </div>
            <div style={{ background: "hsl(var(--primary) / 0.07)", border: "1px solid hsl(var(--primary) / 0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 20 }}>
              <p style={{ fontSize: "0.8rem", color: "hsl(var(--primary))", fontWeight: 600, margin: 0 }}>
                💡 Įjungta = laukas reikalauja kredito (mokamas). Išjungta = visi mato nemokamai.
              </p>
            </div>
            {fieldLockRows.map(row => (
              <ConfigRow key={row.key} row={row} onToggle={handleToggle} saving={saving} />
            ))}
          </Card>
        )}

        {/* ── FEATURES ── */}
        {tab === "features" && (
          <Card>
            <div style={{ marginBottom: 20 }}>
              <h2 className="font-display font-bold text-foreground" style={{ fontSize: "1.15rem", margin: "0 0 6px" }}>
                {GROUP_META.features.label}
              </h2>
              <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.875rem", lineHeight: 1.6 }}>
                {GROUP_META.features.desc}
              </p>
            </div>
            <div style={{ background: "hsl(38 92% 50% / 0.08)", border: "1px solid hsl(38 92% 50% / 0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 20 }}>
              <p style={{ fontSize: "0.8rem", color: "hsl(38 80% 40%)", fontWeight: 600, margin: 0 }}>
                ⚠️ Priežiūros režimas iš karto slepia aplikaciją visiems ne-admin vartotojams.
              </p>
            </div>
            {featureRows.map(row => (
              <ConfigRow key={row.key} row={row} onToggle={handleToggle} saving={saving} />
            ))}
          </Card>
        )}

        {/* ── SECTION ORDER ── */}
        {tab === "section_order" && (
          <Card>
            <div style={{ marginBottom: 20 }}>
              <h2 className="font-display font-bold text-foreground" style={{ fontSize: "1.15rem", margin: "0 0 6px" }}>
                Ataskaitų sekcijų tvarka
              </h2>
              <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.875rem", lineHeight: 1.6 }}>
                Valdykite, kokia eilės tvarka rodomos pilnos ataskaitos sekcijos vartotojui.
              </p>
            </div>
            <SectionOrderEditor
              initialOrder={config.report_sections_order}
              onSave={handleSaveOrder}
            />
          </Card>
        )}

        {/* ── SETTINGS ── */}
        {tab === "settings" && (
          <Card>
            <div style={{ marginBottom: 20 }}>
              <h2 className="font-display font-bold text-foreground" style={{ fontSize: "1.15rem", margin: "0 0 6px" }}>
                {GROUP_META.settings.label}
              </h2>
              <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.875rem", lineHeight: 1.6 }}>
                {GROUP_META.settings.desc}
              </p>
            </div>
            <SettingsEditor rows={settingRows} onSave={handleSaveValue} />
          </Card>
        )}
      </div>
    </div>
  );
}
