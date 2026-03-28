import React, { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useAuth } from "@/contexts/AuthContext";
import ContactDialog from "@/components/ContactDialog";
import HeroMap from "@/components/HeroMap";

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
    q: "Kokią informaciją pateikiate ataskaitoje?",
    a: "Šiuo metu pateikiame bazinę informaciją nemokamai: sklypo ribos, adresas, koordinatės, paskirtis. Pilna ataskaita su papildoma informacija bus prieinama netrukus mokamoje versijoje.",
  },
  {
    q: "Ar planuojate mokamą versiją?",
    a: "Taip! Mokama versija su išsamia sklypo ataskaita ir papildoma informacija bus prieinama netrukus. Šiuo metu visa bazinė informacija yra nemokama.",
  },
  {
    q: "Ar galima naudoti verslo tikslais?",
    a: "Taip. Ataskaitos skirtos tiek privatiems asmenims, tiek NT agentams, advokatams, statybų įmonėms ir investuotojams.",
  },
  {
    q: "Kokie yra registracijos privalumai?",
    a: "Registracija yra visiškai nemokama. Prisiregistravę galėsite patogiai išsaugoti savo paieškų istoriją ir bet kada prie jos sugrįžti savo paskyroje.",
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
  const [contactOpen, setContactOpen] = useState(false);
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
  const footerAttrib = config.content_footer_attribution ?? "© OpenStreetMap · Geoportal.lt · Registrų centras · NŽT";

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
    <div className="bg-background text-foreground" style={{ fontFamily: "'Inter', sans-serif", overflowX: "hidden" }}>
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

      {/* ── HERO — full-viewport map with floating text ───────────────────── */}
      <section
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "100%",
          overflowX: "hidden",
          height: "100dvh",
          minHeight: "min(560px, 100vh)",
          overflow: "hidden",
        }}
      >
        <nav
          style={{
            position: "absolute",
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box", // ✅ FIX
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            height: 62,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 clamp(1.25rem, 4vw, 2.5rem)",
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

          {/* Auth buttons */}
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
<div
    style={{
      position: "absolute",
      inset: 0,
      overflow: "hidden",
    }}
  >
        {/* Eagerly-loaded native tile map fills the entire hero perfectly sized */}
        <HeroMap />

        {/* Very subtle centre radial scrim — just enough to read text */}
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
            padding: "0 clamp(0.75rem, 4vw, 3rem)",
            paddingTop: 80,
            paddingBottom: "clamp(20px, 8vh, 80px)",
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
              autoComplete="off"
              inputMode="text"
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "16px",
                color: "hsl(var(--foreground))",
              }}
            />
            <button
              type="submit"
              // Adjusted responsive padding classes (square on mobile, wide on desktop)
              className="premium-gradient p-2.5 sm:px-[22px] sm:py-[9px]"
              style={{
                border: "none",
                color: "#fff",
                borderRadius: 8,
                /* padding: "9px 22px", <-- Removed from here to allow responsive classes */
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center", // Added to perfectly center the icon on mobile
                gap: 7,
                transition: "opacity .2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <IconSearchBtn />
              {/* Hidden on mobile screens, shown inline on 'sm' screens and larger */}
              <span className="hidden sm:inline">Ieškoti</span>
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
      </section>
   </div>


      {/* ── WHY ŽEMĖPRO — white section directly below map ────────────────── */}
      {/* No border/shadow separator — exactly like screenshot */}
      <section
        id="why"
        style={{
          background: "#fff",
          padding: "4.5rem clamp(1.25rem, 5vw, 3rem) 5rem",
          contentVisibility: "auto",
          containIntrinsicSize: "0 500px",
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
          contentVisibility: "auto",
          containIntrinsicSize: "0 500px",
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
          contentVisibility: "auto",
          containIntrinsicSize: "0 500px",
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

      {/* ── ABOUT / SOCIALS / FEEDBACK ─────────────────────────────────── */}
      <section
        className="border-t border-border py-8 px-4"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 300px" }}
      >
        <div className="flex flex-col md:flex-row gap-6 justify-center items-start max-w-3xl mx-auto">
          {/* Left — About */}
          <div className="flex-1 min-w-[200px]">
            <h3 className="text-sm font-semibold text-foreground mb-2">Apie ŽemėPro</h3>
            <p className="text-xs text-muted-foreground mb-3">Greita kadastrinė paieška Lietuvoje.</p>
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com/zemepro"
                target="_blank"
                rel="noopener noreferrer"
                className="glass-panel rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                Instagram
              </a>
              <a
                href="https://www.facebook.com/people/%C5%BDem%C4%97-Pro/61579558936148/"
                target="_blank"
                rel="noopener noreferrer"
                className="glass-panel rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </a>
              <a
                href="https://www.tiktok.com/@empro229?_r=1&_t=ZN-94u5dcQmID8"
                target="_blank"
                rel="noopener noreferrer"
                className="glass-panel rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
                TikTok
              </a>
            </div>
          </div>

          {/* Right — Contact */}
          <div className="flex-1 min-w-[200px]">
            <h3 className="text-sm font-semibold text-foreground mb-2">Susisiekite</h3>
            <p className="text-xs text-muted-foreground mb-3">Turite klausimų ar pasiūlymų? Parašykite mums!</p>
            <button
              onClick={() => setContactOpen(true)}
              className="premium-gradient text-primary-foreground text-xs font-semibold rounded-lg py-2 px-4 hover:opacity-90 transition-opacity"
            >
              Rašykite mums
            </button>
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

      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
