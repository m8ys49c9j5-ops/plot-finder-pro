import React, { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useAuth } from "@/contexts/AuthContext";

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconLayers = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);
const IconMapPin = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const IconSearchBtn = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);
const IconChevronDown = ({ open }: { open: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .28s ease" }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IconTarget = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);
const IconRuler = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4Z" />
    <path d="m7.5 10.5 2 2" />
    <path d="m10.5 7.5 2 2" />
    <path d="m13.5 4.5 2 2" />
    <path d="m4.5 13.5 2 2" />
  </svg>
);
const IconMap = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
    <line x1="9" x2="9" y1="3" y2="18" />
    <line x1="15" x2="15" y1="6" y2="21" />
  </svg>
);
const IconEuro = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 10h12" />
    <path d="M4 14h9" />
    <path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2" />
  </svg>
);
const IconSatellite = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M13 7 9 3 5 7l4 4" />
    <path d="m17 11 4 4-4 4-4-4" />
    <path d="m8 12 4 4 6-6-4-4Z" />
    <path d="m16 8 3-3" />
    <path d="M9 21a6 6 0 0 0-6-6" />
  </svg>
);
const IconCheck = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ─── Map tile grid (Geoportal Lithuanian topo tiles — same as app) ─────────────
// z=12 centred on a nice rural Lithuanian area (near Kaunas/Prienai)
const GEOPORTAL = "https://www.geoportal.lt/mapproxy/gisc_pagrindinis/MapServer";

function toTileXY(lat: number, lng: number, z: number) {
  const n = Math.pow(2, z);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latR = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n);
  return { x, y };
}

function MapTileBackground() {
  // Centre: ~54.93°N 23.95°E — rural Lithuania near Prienai (similar to screenshot)
  const z = 12;
  const { x: cx, y: cy } = toTileXY(54.93, 23.95, z);

  const cols = 6;
  const rows = 5;
  const tiles: { x: number; y: number; col: number; row: number }[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push({
        x: cx - Math.floor(cols / 2) + c,
        y: cy - Math.floor(rows / 2) + r,
        col: c,
        row: r,
      });
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        overflow: "hidden",
      }}
    >
      {tiles.map(({ x, y, col, row }) => (
        <img
          key={`${col}-${row}`}
          // Geoportal tile URL: /tile/{z}/{y}/{x} (note: y before x)
          src={`${GEOPORTAL}/tile/${z}/${y}/${x}`}
          alt=""
          draggable={false}
          style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }}
          onError={(e) => {
            // fallback to OSM if geoportal tiles fail
            const img = e.currentTarget;
            if (!img.src.includes("openstreetmap")) {
              img.src = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
            }
          }}
        />
      ))}
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const WHY_ITEMS = [
  {
    n: "1",
    title: "Taupote laiką",
    desc: "Visa svarbiausia informacija apie sklypą vienoje vietoje.",
  },
  {
    n: "2",
    title: "Gaunate pirminę sklypo analizę",
    desc: "Pagrindiniai duomenys padeda greitai įvertinti sklypo potencialą.",
  },
  {
    n: "3",
    title: "Matote tikslią sklypo vietą",
    desc: "Interaktyvus žemėlapis leidžia lengvai suprasti aplinką ir kaimynystę.",
  },
];

const REPORT_FEATURES = [
  {
    icon: <IconTarget />,
    title: "Kadastrinis & Unikalus Nr.",
    desc: "Nurodomi to paties sklypo kadastrinis ir unikalus numeriai",
  },
  {
    icon: <IconRuler />,
    title: "Sklypo plotas",
    desc: "Pateikiamas juridinis sklypo plotas hektarais, 1 kv. m tikslumu",
  },
  { icon: <IconMap />, title: "Interaktyvus žemėlapis", desc: "Tikslios sklypo ribos kadastro ir ortofoto žemėlapyje" },
  {
    icon: <IconEuro />,
    title: "Sklypo vidutinė rinkos vertė",
    desc: "Vertė nustatyta pagal masinį vertinimą, vertinimo data nurodyta ataskaitoje",
  },
  { icon: <IconSatellite />, title: "Ortofoto vaizdas", desc: "Palydovinis vaizdas su sklypo kontūrais" },
  { icon: <IconCheck />, title: "Esama žemės sklypo paskirtis", desc: "" },
  { icon: <IconMapPin />, title: "Sklypo adresas", desc: "" },
  { icon: <IconTarget />, title: "Koordinatės", desc: "Nurodomos sklypo centro koordinatės" },
];

const PRICING = [
  { name: "Starteris", credits: 1, price: "€1,99", per: "€1,99 / paieška", popular: false, save: "" },
  { name: "Populiarus", credits: 10, price: "€9,99", per: "€1,00 / paieška", popular: true, save: "−50%" },
  { name: "Profesionalus", credits: 30, price: "€19,99", per: "€0,67 / paieška", popular: false, save: "−66%" },
];

const FAQ_ITEMS = [
  {
    q: "Ar jūsū duomenys tikslūs ir patikimi?",
    a: "Visi duomenys gaunami iš oficialių Lietuvos šaltinių, kuriuos kompanijos specialistai apdoroja, įvertina ir pateikia jums supaprastinta forma.",
  },
  {
    q: "Kaip dažnai atnaujinama informacija?",
    a: "Kiekvieną kartą pateikiame naujausius duomenis. Duomenis atnaujiname kartą per mėnesį.",
  },
  {
    q: "Kokią informaciją pateikiate mokamoje ataskaitoje?",
    a: "Mokamoje ataskaitoje jūs gaunate pilną išaiškinimą dėl specialiųjų sąlygų ir specialistų/profesionalų pateiktą išvadą.",
  },
  {
    q: "Ar kreditai turi galiojimo datą?",
    a: "Ne. Kreditai lieka jūsų sąskaitoje neribotą laiką – mokate tik kai faktiškai atrakinate ataskaitą.",
  },
  {
    q: "Ar galima naudoti verslo tikslais?",
    a: "Taip. Ataskaitos skirtos tiek privatiems asmenims, tiek NT agentams, advokatams, statybų įmonėms ir investuotojams.",
  },
];

function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-4 text-left text-sm font-semibold text-foreground gap-4 hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
      >
        <span>{q}</span>
        <span className="text-primary shrink-0">
          <IconChevronDown open={open} />
        </span>
      </button>
      <div style={{ maxHeight: open ? 300 : 0, overflow: "hidden", transition: "max-height .32s ease" }}>
        <p className="text-sm text-muted-foreground leading-relaxed pb-4 pr-6">{a}</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const { config } = useAppConfig();

  // ── CMS-driven content (falls back to hard-coded if key not in DB) ──────────
  const appName = config.content_app_name ?? "ŽemėPro";
  const heroTitle = config.content_hero_title ?? "ŽemėPro";
  const heroSub1 = config.content_hero_subtitle1 ?? "Greita ir patogi informacija apie bet kurį Lietuvos sklypą.";
  const heroSub2 =
    config.content_hero_subtitle2 ??
    "Patikrinkite vietą, pagrindinius duomenis ir svarbiausią informaciją per kelias sekundes.";
  const heroTrust = config.content_hero_trust ?? "Patogu  •  Greita  •  Prieinama";
  const searchPlaceholder = config.content_search_placeholder ?? "Įveskite sklypo kadastrinį arba unikalų numerį";
  const whyTitle = config.content_why_title ?? "Kodėl verta naudoti ŽemėPro?";
  const footerAttrib = config.content_footer_attribution ?? "Duomenys: Geoportal.lt · Registrų centras · VŽT";

  // Why items from CMS
  const WHY_ITEMS_CMS = [
    {
      n: "1",
      title: config.content_why_1_title ?? "Taupote laiką",
      desc: config.content_why_1_desc ?? "Visa svarbiausia informacija apie sklypą vienoje vietoje.",
    },
    {
      n: "2",
      title: config.content_why_2_title ?? "Gaunate pirminę sklypo analizę",
      desc: config.content_why_2_desc ?? "Pagrindiniai duomenys padeda greitai įvertinti sklypo potencialą.",
    },
    {
      n: "3",
      title: config.content_why_3_title ?? "Matote tikslią sklypo vietą",
      desc: config.content_why_3_desc ?? "Interaktyvus žemėlapis leidžia lengvai suprasti aplinką ir kaimynystę.",
    },
  ];

  // Button labels / hrefs from CMS
  const btnSignin = config.btn_nav_signin ?? { label: "Prisijungti", href: "/auth", enabled: true };
  const btnTryFree = config.btn_nav_try_free ?? { label: "Išbandyti nemokamai", href: "/map", enabled: true };
  const btnFeatCta = config.btn_features_cta ?? { label: "Išbandyti dabar →", href: "/map", enabled: true };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(query.trim() ? `/map?q=${encodeURIComponent(query.trim())}` : "/map");
  };

  // Split appName for gradient suffix "Pro"
  const renderAppName = (name: string, extraClass = "") => {
    if (name.includes("Pro")) {
      const parts = name.split("Pro");
      return React.createElement(
        "span",
        { className: extraClass },
        parts[0],
        React.createElement("span", { className: "text-gradient" }, "Pro"),
        parts[1] ?? "",
      );
    }
    return React.createElement("span", { className: extraClass }, name);
  };

  return (
    <div className="bg-background text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes lp-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp1 { animation: lp-up .55s ease .0s both; }
        .lp2 { animation: lp-up .55s ease .12s both; }
        .lp3 { animation: lp-up .55s ease .22s both; }
        .lp4 { animation: lp-up .55s ease .32s both; }
        .lp5 { animation: lp-up .55s ease .42s both; }
        .lp-search { transition: box-shadow .2s; }
        .lp-search:focus-within {
          box-shadow: 0 0 0 3px hsl(var(--primary) / .2), 0 4px 20px rgba(0,0,0,.12) !important;
        }
        .lp-card { transition: box-shadow .2s, transform .2s; }
        .lp-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,.09); }
        .lp-price { transition: transform .2s, box-shadow .2s; }
        .lp-price:hover { transform: translateY(-4px); box-shadow: 0 12px 36px rgba(0,0,0,.1); }
      `}</style>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      {/* Sits on top of the map with no background, exactly like screenshot */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 900,
          height: 62,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(1.25rem, 4vw, 2.5rem)",
          // No background — floats over the map
        }}
      >
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <span className="text-primary">
            <IconLayers />
          </span>
          <span
            className="font-display font-bold text-foreground"
            style={{ fontSize: "1.05rem", letterSpacing: "-0.01em" }}
          >
            Žemė<span className="text-gradient">Pro</span>
          </span>
        </button>

        {/* Auth buttons — exactly like screenshot */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {user ? (
            <button
              onClick={() => navigate("/account")}
              style={{
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid rgba(0,0,0,0.15)",
                color: "hsl(var(--foreground))",
                borderRadius: 8,
                padding: "7px 18px",
                fontSize: "0.85rem",
                fontWeight: 500,
                cursor: "pointer",
                transition: "background .2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.97)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.85)")}
            >
              Mano paskyra
            </button>
          ) : btnSignin.enabled !== false ? (
            <button
              onClick={() => navigate(btnSignin.href ?? "/login", { state: { from: "/" } })}
              style={{
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid rgba(0,0,0,0.15)",
                color: "hsl(var(--foreground))",
                borderRadius: 8,
                padding: "7px 18px",
                fontSize: "0.85rem",
                fontWeight: 500,
                cursor: "pointer",
                transition: "background .2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.97)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.85)")}
            >
              {btnSignin.label ?? "Prisijungti"}
            </button>
          ) : null}
          {btnTryFree.enabled !== false && (
            <button
              onClick={() => navigate(btnTryFree.href ?? "/map")}
              className="premium-gradient hidden sm:inline-flex"
              style={{
                border: "none",
                color: "#fff",
                borderRadius: 8,
                padding: "7px 18px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "opacity .2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {btnTryFree.label ?? "Išbandyti nemokamai"}
            </button>
          )}
        </div>
      </nav>

      {/* ── HERO — full-viewport map with floating text ───────────────────── */}
      <section
        style={{
          position: "relative",
          width: "100%",
          height: "100vh",
          minHeight: 560,
          maxHeight: 860,
          overflow: "hidden",
        }}
      >
        {/* Tile mosaic fills the entire hero */}
        <MapTileBackground />

        {/* Very subtle centre radial scrim — just enough to read text */}
        {/* Matches screenshot: map is clearly visible, only light centre wash */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 75% 65% at 50% 40%, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.30) 55%, rgba(255,255,255,0) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Floating content — upper-centre like screenshot */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 clamp(1rem, 5vw, 3rem)",
            paddingTop: 40,
            paddingBottom: 80,
          }}
        >
          {/* Title */}
          <h1
            className="lp1 font-display font-bold text-center"
            style={{
              fontSize: "clamp(1.75rem, 4.2vw, 2.9rem)",
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              color: "hsl(var(--foreground))",
              margin: "0 0 0.55rem",
              textShadow: "0 1px 4px rgba(255,255,255,0.6)",
            }}
          >
            {renderAppName(heroTitle)}
          </h1>

          {/* Subtitle 1 */}
          <p
            className="lp2 text-center"
            style={{
              fontSize: "clamp(0.88rem, 1.8vw, 1.05rem)",
              color: "hsl(var(--muted-foreground))",
              margin: "0 0 0.35rem",
              textShadow: "0 1px 3px rgba(255,255,255,0.7)",
            }}
          >
            {heroSub1}
          </p>

          {/* Subtitle 2 — bold, slightly larger */}
          <p
            className="lp3 text-center font-semibold"
            style={{
              fontSize: "clamp(0.85rem, 1.6vw, 1rem)",
              color: "hsl(var(--foreground))",
              maxWidth: 600,
              margin: "0 0 1.6rem",
              textShadow: "0 1px 4px rgba(255,255,255,0.7)",
            }}
          >
            {heroSub2}
          </p>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="lp4 lp-search"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.10)",
              borderRadius: 12,
              padding: "10px 10px 10px 14px",
              width: "100%",
              maxWidth: 600,
              boxShadow: "0 2px 16px rgba(0,0,0,0.10)",
            }}
          >
            <span className="text-primary shrink-0">
              <IconMapPin />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "0.875rem",
                color: "hsl(var(--foreground))",
              }}
            />
            <button
              type="submit"
              className="premium-gradient"
              style={{
                border: "none",
                color: "#fff",
                borderRadius: 8,
                padding: "9px 22px",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 7,
                transition: "opacity .2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <IconSearchBtn />
              Ieškoti
            </button>
          </form>

          {/* Patogu · Greita · Prieinama — exactly like screenshot */}
          <p
            className="lp5"
            style={{
              fontSize: "0.85rem",
              color: "hsl(var(--muted-foreground))",
              marginTop: "0.9rem",
              textShadow: "0 1px 3px rgba(255,255,255,0.8)",
              letterSpacing: "0.01em",
            }}
          >
            {heroTrust}
          </p>
        </div>

        {/* Attribution bottom-left */}
        <div style={{ position: "absolute", bottom: 8, left: 10, zIndex: 10 }}>
          <span
            style={{
              fontSize: "10px",
              color: "rgba(0,0,0,0.5)",
              background: "rgba(255,255,255,0.75)",
              borderRadius: 4,
              padding: "2px 7px",
            }}
          >
            Duomenys: Geoportal.lt · RC Kadastras
          </span>
        </div>
      </section>

      {/* ── WHY ŽEMĖPRO — white section directly below map ────────────────── */}
      {/* No border/shadow separator — exactly like screenshot */}
      <section
        id="why"
        style={{
          background: "#fff",
          padding: "4.5rem clamp(1.25rem, 5vw, 3rem) 5rem",
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2
            className="font-display font-bold text-center"
            style={{
              fontSize: "clamp(1.4rem, 3vw, 2rem)",
              letterSpacing: "-0.02em",
              color: "hsl(var(--foreground))",
              marginBottom: "2.75rem",
            }}
          >
            {whyTitle.includes("Pro") ? renderAppName(whyTitle) : whyTitle}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {WHY_ITEMS_CMS.map((item) => (
              <div
                key={item.n}
                className="lp-card"
                style={{
                  background: "#fff",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 14,
                  padding: "1.6rem",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                  {/* Green circle badge — exactly like screenshot */}
                  <div
                    className="premium-gradient"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: "#fff",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                    }}
                  >
                    {item.n}
                  </div>
                  <h3
                    className="font-display font-bold"
                    style={{
                      color: "hsl(var(--foreground))",
                      fontSize: "1rem",
                      lineHeight: 1.3,
                      marginTop: 4,
                    }}
                  >
                    {item.title}
                  </h3>
                </div>
                <p
                  style={{
                    color: "hsl(var(--muted-foreground))",
                    fontSize: "0.875rem",
                    lineHeight: 1.65,
                    paddingLeft: 44,
                  }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT'S IN THE REPORT ──────────────────────────────────────────── */}
      <section
        style={{
          background: "hsl(var(--secondary))",
          borderTop: "1px solid hsl(var(--border))",
          borderBottom: "1px solid hsl(var(--border))",
          padding: "5rem clamp(1.25rem, 5vw, 3rem)",
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "2.75rem" }}>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "hsl(var(--primary))",
                display: "block",
                marginBottom: "0.6rem",
              }}
            >
              Ataskaita
            </span>
            <h2
              className="font-display font-bold"
              style={{
                fontSize: "clamp(1.4rem, 3vw, 2rem)",
                letterSpacing: "-0.02em",
                color: "hsl(var(--foreground))",
                margin: "0 0 0.5rem",
              }}
            >
              Viskas vienoje ataskaitoje
            </h2>
            <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.875rem" }}>
              Surenkame duomenis iš kelių oficialių registrų
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: "1rem",
            }}
            className="grid-cols-2 sm:grid-cols-4"
          >
            {REPORT_FEATURES.map((f, i) => (
              <div
                key={i}
                className="lp-card"
                style={{
                  background: "#fff",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  padding: "1.25rem",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
                }}
              >
                <div className="text-primary" style={{ marginBottom: "0.65rem" }}>
                  {f.icon}
                </div>
                <h3
                  className="font-semibold"
                  style={{ color: "hsl(var(--foreground))", fontSize: "0.875rem", marginBottom: "0.3rem" }}
                >
                  {f.title}
                </h3>
                <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.8rem", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
            {btnFeatCta.enabled !== false && (
              <button
                onClick={() => navigate(btnFeatCta.href ?? "/map")}
                className="premium-gradient"
                style={{
                  border: "none",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "11px 32px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "opacity .2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                {btnFeatCta.label ?? "Išbandyti dabar →"}
              </button>
            )}
          </div>
        </div>
      </section>

      {/*  ── PRICING ───────────────────────────────────────────────────────── 
      <section id="pricing" style={{ background: "#fff", padding: "5rem clamp(1.25rem, 5vw, 3rem)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "2.75rem" }}>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                color: "hsl(var(--primary))",
                display: "block",
                marginBottom: "0.6rem",
              }}
            >
              Kainos
            </span>
            <h2
              className="font-display font-bold"
              style={{
                fontSize: "clamp(1.4rem, 3vw, 2rem)",
                letterSpacing: "-0.02em",
                color: "hsl(var(--foreground))",
                margin: "0 0 0.5rem",
              }}
            >
              Mokate tik kai naudojate
            </h2>
            <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.875rem" }}>
              Jokių prenumeratų · Jokių mėnesinių mokesčių · Kreditai negalioja
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "1.25rem",
              alignItems: "end",
            }}
          >
            {PRICING.map((p) => (
              <div
                key={p.name}
                className="lp-price"
                style={{
                  background: "#fff",
                  border: p.popular ? "1.5px solid hsl(var(--primary) / 0.5)" : "1px solid hsl(var(--border))",
                  borderRadius: 16,
                  padding: p.popular ? "2.25rem 1.75rem" : "1.75rem",
                  position: "relative",
                  boxShadow: p.popular ? "0 4px 24px rgba(0,0,0,0.08)" : "0 1px 6px rgba(0,0,0,0.04)",
                }}
              >
                {p.popular && (
                  <div
                    className="premium-gradient"
                    style={{
                      position: "absolute",
                      top: -13,
                      left: "50%",
                      transform: "translateX(-50%)",
                      color: "#fff",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "3px 14px",
                      borderRadius: 999,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Populiariausias
                  </div>
                )}
                {p.save && !p.popular && (
                  <div
                    style={{
                      position: "absolute",
                      top: -11,
                      right: "1.25rem",
                      background: "hsl(var(--primary) / 0.1)",
                      color: "hsl(var(--primary))",
                      border: "1px solid hsl(var(--primary) / 0.25)",
                      fontSize: "0.67rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      padding: "2px 9px",
                      borderRadius: 999,
                    }}
                  >
                    {p.save}
                  </div>
                )}
                <p
                  className="font-display font-bold"
                  style={{ color: "hsl(var(--foreground))", fontSize: "1rem", marginBottom: "0.25rem" }}
                >
                  {p.name}
                </p>
                <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.8rem", marginBottom: "1.25rem" }}>
                  {p.credits} {p.credits === 1 ? "paieška" : "paieškų"}
                </p>
                <div
                  className="font-display font-bold"
                  style={{
                    fontSize: "2rem",
                    letterSpacing: "-0.03em",
                    color: p.popular ? "hsl(var(--primary))" : "hsl(var(--foreground))",
                    marginBottom: "0.25rem",
                  }}
                >
                  {p.price}
                </div>
                <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.78rem", marginBottom: "1.5rem" }}>
                  {p.per}
                </p>
                <button
                  onClick={() => navigate("/map")}
                  className={p.popular ? "premium-gradient" : ""}
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    padding: "10px",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "opacity .2s, background .2s",
                    border: p.popular ? "none" : "1px solid hsl(var(--border))",
                    background: p.popular ? undefined : "hsl(var(--secondary))",
                    color: p.popular ? "#fff" : "hsl(var(--foreground))",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  Pradėti
                </button>
              </div>
            ))}
          </div>

          <p
            style={{
              textAlign: "center",
              marginTop: "1.5rem",
              color: "hsl(var(--muted-foreground) / 0.6)",
              fontSize: "0.76rem",
            }}
          >
            Saugus mokėjimas per Stripe · Visi pagrindiniai mokėjimo metodai
          </p>
        </div>
      </section> */}

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: "hsl(var(--secondary))",
          borderTop: "1px solid hsl(var(--border))",
          padding: "5rem clamp(1.25rem, 5vw, 3rem)",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                color: "hsl(var(--primary))",
                display: "block",
                marginBottom: "0.6rem",
              }}
            >
              D.U.K.
            </span>
            <h2
              className="font-display font-bold"
              style={{
                fontSize: "clamp(1.4rem, 3vw, 2rem)",
                letterSpacing: "-0.02em",
                color: "hsl(var(--foreground))",
                margin: 0,
              }}
            >
              Dažniausiai užduodami klausimai
            </h2>
          </div>
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              border: "1px solid hsl(var(--border))",
              padding: "0.5rem 1.5rem",
              boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
            }}
          >
            {FAQ_ITEMS.map((item, i) => (
              <FaqRow key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer
        style={{
          background: "#fff",
          borderTop: "1px solid hsl(var(--border))",
          padding: "1.5rem clamp(1.25rem, 5vw, 2.5rem)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span className="text-primary">
            <IconLayers />
          </span>
          <span className="font-display font-bold text-foreground" style={{ fontSize: "0.9rem" }}>
            Žemė<span className="text-gradient">Pro</span>
          </span>
        </div>
        <p style={{ color: "hsl(var(--muted-foreground) / 0.6)", fontSize: "0.74rem", margin: 0 }}>{footerAttrib}</p>
        <p style={{ color: "hsl(var(--muted-foreground) / 0.6)", fontSize: "0.74rem", margin: 0 }}>
          © {new Date().getFullYear()} ŽemėPro
        </p>
      </footer>
    </div>
  );
}
