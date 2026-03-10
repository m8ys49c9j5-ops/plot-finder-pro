import React, { useEffect, useRef, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── tiny inline icons (no extra deps) ───────────────────────────────────────
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
    width="18"
    height="18"
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
const IconSearch = () => (
  <svg
    width="16"
    height="16"
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
const IconCheck = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconShield = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconZap = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const IconRuler = () => (
  <svg
    width="22"
    height="22"
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
    width="22"
    height="22"
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
    width="22"
    height="22"
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
const IconTarget = () => (
  <svg
    width="22"
    height="22"
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
const IconChevronDown = ({ open }: { open: boolean }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.28s ease" }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ─── Map hero background ──────────────────────────────────────────────────────
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL ?? "";
const GEOPORTAL_BASE = "https://www.geoportal.lt/mapproxy/gisc_pagrindinis/MapServer";
const KADASTRAS_BASE = "https://www.geoportal.lt/mapproxy/rc_kadastro_zemelapis/MapServer";

function HeroMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [55.35, 23.9],
      zoom: 12,
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: false,
    });

    // OSM base
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Geoportal overlay
    L.tileLayer(`${GEOPORTAL_BASE}/tile/{z}/{y}/{x}`, {
      maxZoom: 19,
      opacity: 0.75,
    }).addTo(map);

    // Kadastro layer via proxy
    const buildUrl = (coords: L.Coords) => {
      const sz = 256;
      const nw = coords.scaleBy(new L.Point(sz, sz));
      const se = nw.add(new L.Point(sz, sz));
      const nwLL = map.unproject(nw, coords.z);
      const seLL = map.unproject(se, coords.z);
      const nwM = L.CRS.EPSG3857.project(nwLL);
      const seM = L.CRS.EPSG3857.project(seLL);
      const bbox = `${nwM.x},${seM.y},${seM.x},${nwM.y}`;
      const url = `${KADASTRAS_BASE}/export?bbox=${bbox}&bboxSR=3857&imageSR=3857&size=${sz},${sz}&format=png32&transparent=true&f=image&layers=${encodeURIComponent("show:15,21,27,33")}`;
      return SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/map-proxy?url=${encodeURIComponent(url)}` : "";
    };
    const KadLayer = L.TileLayer.extend({
      getTileUrl: function (c: L.Coords) {
        return buildUrl(c);
      },
    });
    new (KadLayer as any)("", { maxZoom: 19, opacity: 0.9 }).addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
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

const FEATURES = [
  { icon: <IconTarget />, title: "Kadastrinis & Unikalus Nr.", desc: "Tikslus sklypo identifikatorius iš NT registro" },
  { icon: <IconRuler />, title: "Juridinis plotas", desc: "Registruotas plotas hektarais, tikslumas iki 4 ženklų" },
  { icon: <IconMap />, title: "Interaktyvus žemėlapis", desc: "Tikslios sklypo ribos kadastro ir ortofoto žemėlapyje" },
  { icon: <IconEuro />, title: "Rinkos vertė", desc: "Automatiškai surinkta masinė vertė iš RC registro" },
];

const PRICING = [
  { name: "Starteris", credits: 1, price: "€1,99", per: "€1,99 / paieška", popular: false, save: "" },
  { name: "Populiarus", credits: 10, price: "€9,99", per: "€1,00 / paieška", popular: true, save: "−50%" },
  { name: "Profesionalus", credits: 30, price: "€19,99", per: "€0,67 / paieška", popular: false, save: "−66%" },
];

const FAQ_ITEMS = [
  {
    q: "Iš kur gaunami duomenys?",
    a: "Visi duomenys gaunami iš oficialių Lietuvos šaltinių: INSPIRE geoportalas, Registrų centras ir Valstybinė žemės tarnyba. Mes juos surenkame ir pateikiame suprantamai.",
  },
  {
    q: "Ar duomenys atnaujinami?",
    a: "Taip. Kiekvieną kartą pateikiame naujausius duomenis tiesiai iš šaltinio. Rinkos vertė atnaujinama pagal oficialų Registrų centro masinį vertinimą.",
  },
  {
    q: "Ar kreditai turi galiojimo datą?",
    a: "Ne. Kreditai lieka jūsų sąskaitoje neribotą laiką – mokate tik kai faktiškai atrakinate ataskaitą.",
  },
  {
    q: "Ar galima naudoti verslo tikslais?",
    a: "Taip. Ataskaitos skirtos tiek privatiems asmenims, tiek NT agentams, advokatams, statybų įmonėms ir investuotojams.",
  },
  {
    q: "Kaip veikia žemėlapio identifikavimas?",
    a: "Spustelėkite bet kurį tašką žemėlapyje – sistema automatiškai nustato, kuriam sklypui tas taškas priklauso, ir parodo jo ribas bei duomenis.",
  },
];

// ─── FAQ row ──────────────────────────────────────────────────────────────────
function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
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
        <p className="text-sm text-muted-foreground leading-relaxed pb-4">{a}</p>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/map?q=${encodeURIComponent(query.trim())}`);
    else navigate("/map");
  };

  const navSolid = scrollY > 60;

  return (
    <div className="bg-background text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        .au1{animation:fadeUp .6s ease .05s both}
        .au2{animation:fadeUp .6s ease .18s both}
        .au3{animation:fadeUp .6s ease .3s both}
        .au4{animation:fadeUp .6s ease .42s both}
        .au5{animation:fadeUp .6s ease .54s both}
        .hero-search:focus-within { box-shadow: 0 0 0 3px hsl(var(--primary) / 0.18), 0 4px 24px rgba(0,0,0,0.10); }
        .feature-card:hover { border-color: hsl(var(--primary) / 0.35); transform: translateY(-2px); }
        .feature-card { transition: border-color .2s, transform .2s, box-shadow .2s; }
        .feature-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.07); }
        .pricing-card { transition: transform .22s, box-shadow .22s; }
        .pricing-card:hover { transform: translateY(-4px); box-shadow: 0 12px 36px rgba(0,0,0,0.10); }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-[900] flex items-center justify-between px-6 md:px-10"
        style={{
          height: 58,
          background: navSolid ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.85)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: navSolid ? "1px solid hsl(var(--border))" : "1px solid transparent",
          transition: "border-color .3s, background .3s",
          boxShadow: navSolid ? "0 1px 8px rgba(0,0,0,0.06)" : "none",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <span className="text-primary">
            <IconLayers />
          </span>
          <span className="font-display font-bold text-foreground text-base tracking-tight">
            Žemė<span className="text-gradient">Pro</span>
          </span>
        </div>

        {/* Nav links (desktop) */}
        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground font-medium">
          <button
            onClick={() => document.getElementById("why")?.scrollIntoView({ behavior: "smooth" })}
            className="hover:text-foreground transition-colors bg-transparent border-none cursor-pointer p-0"
          >
            Kodėl ŽemėPro?
          </button>
          <button
            onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
            className="hover:text-foreground transition-colors bg-transparent border-none cursor-pointer p-0"
          >
            Kainos
          </button>
        </div>

        {/* Auth buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/auth")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-4 py-1.5 bg-transparent cursor-pointer hover:bg-muted/50"
          >
            Prisijungti
          </button>
          <button
            onClick={() => navigate("/map")}
            className="premium-gradient text-primary-foreground text-sm font-semibold rounded-lg px-4 py-1.5 border-none cursor-pointer hover:opacity-90 transition-opacity"
          >
            Išbandyti nemokamai
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", height: "100vh", minHeight: 560 }}>
        {/* Live map background */}
        <HeroMap />

        {/* Overlay gradient — lighter at top (nav), heavier in centre, fades to white at bottom */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.55) 35%, rgba(255,255,255,0.82) 65%, rgba(255,255,255,1) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 1.25rem",
            paddingTop: 64,
          }}
        >
          <h1
            className="au1 font-display font-bold text-foreground text-center"
            style={{
              fontSize: "clamp(1.7rem, 4.5vw, 3rem)",
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              maxWidth: 680,
              marginBottom: "0.6rem",
            }}
          >
            Sklypų patikra – <span className="text-gradient">ŽemėPro</span>
          </h1>

          <p
            className="au2 text-center text-muted-foreground"
            style={{ fontSize: "clamp(0.9rem,2vw,1.05rem)", marginBottom: "0.5rem" }}
          >
            Greita ir patogi informacija apie bet kurį Lietuvos sklypą.
          </p>
          <p
            className="au3 text-center font-semibold text-foreground"
            style={{ fontSize: "clamp(0.85rem,1.8vw,1rem)", marginBottom: "1.75rem" }}
          >
            Patikrinkite vietą, pagrindinius duomenis ir svarbiausią informaciją per kelias sekundes.
          </p>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="au4 hero-search bg-card rounded-xl shadow-lg flex items-center gap-2 px-4 py-3 w-full border border-border"
            style={{ maxWidth: 600, transition: "box-shadow .2s" }}
          >
            <span className="text-primary shrink-0">
              <IconMapPin />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Įveskite adresą, kadastro numerį arba pažymėkite sklypą žemėlapyje"
              className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
              style={{ minWidth: 0 }}
            />
            <button
              type="submit"
              className="premium-gradient text-primary-foreground rounded-lg px-5 py-2 text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity border-none cursor-pointer shrink-0"
            >
              <IconSearch />
              Ieškoti
            </button>
          </form>

          {/* Trust pills */}
          <div className="au5 flex items-center gap-3 mt-4 flex-wrap justify-center">
            {[
              { icon: <IconShield />, label: "Oficialūs duomenys" },
              { icon: <IconZap />, label: "Momentinis atsakymas" },
              { icon: <IconCheck />, label: "Saugus mokėjimas" },
            ].map(({ icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span className="text-primary">{icon}</span>
                {label}
              </span>
            ))}
            <span className="text-muted-foreground/40 text-xs select-none">·</span>
            <span className="text-xs text-muted-foreground">Patogu</span>
            <span className="text-muted-foreground/40 text-xs select-none">·</span>
            <span className="text-xs text-muted-foreground">Greita</span>
            <span className="text-muted-foreground/40 text-xs select-none">·</span>
            <span className="text-xs text-muted-foreground">Prieinama</span>
          </div>
        </div>

        {/* Attribution */}
        <div className="absolute bottom-2 left-3 z-10">
          <span className="text-[10px] text-muted-foreground/70 bg-card/70 rounded px-2 py-0.5 backdrop-blur-sm">
            Duomenys: Geoportal.lt · RC Kadastras
          </span>
        </div>
      </section>

      {/* ── WHY ──────────────────────────────────────────────────────── */}
      <section id="why" className="bg-background py-20 px-5">
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2
            className="font-display font-bold text-foreground text-center mb-12"
            style={{ fontSize: "clamp(1.4rem,3.5vw,2.2rem)", letterSpacing: "-0.02em" }}
          >
            Kodėl verta naudoti <span className="text-gradient">ŽemėPro</span>?
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "1.5rem" }}>
            {WHY_ITEMS.map((item) => (
              <div key={item.n} className="bg-card rounded-xl border border-border p-6 feature-card">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="premium-gradient text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                    style={{ width: 32, height: 32 }}
                  >
                    {item.n}
                  </div>
                  <h3 className="font-display font-bold text-foreground text-base leading-tight">{item.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT'S IN THE REPORT ─────────────────────────────────────── */}
      <section className="py-20 px-5" style={{ background: "hsl(var(--secondary))" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary block mb-2">Ataskaita</span>
            <h2
              className="font-display font-bold text-foreground"
              style={{ fontSize: "clamp(1.4rem,3.5vw,2.2rem)", letterSpacing: "-0.02em" }}
            >
              Viskas vienoje ataskaitoje
            </h2>
            <p className="text-sm text-muted-foreground mt-2">Surenkame duomenis iš kelių oficialių registrų</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: "1rem" }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-5 feature-card">
                <div className="text-primary mb-3">{f.icon}</div>
                <h3 className="font-semibold text-foreground text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => navigate("/map")}
              className="premium-gradient text-primary-foreground font-semibold rounded-xl px-8 py-3 border-none cursor-pointer hover:opacity-90 transition-opacity text-sm"
            >
              Išbandyti dabar →
            </button>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────── */}
      <section id="pricing" className="bg-background py-20 px-5">
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary block mb-2">Kainos</span>
            <h2
              className="font-display font-bold text-foreground"
              style={{ fontSize: "clamp(1.4rem,3.5vw,2.2rem)", letterSpacing: "-0.02em" }}
            >
              Mokate tik kai naudojate
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Jokių prenumeratų · Jokių mėnesinių mokesčių · Kreditai negalioja
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
              gap: "1.25rem",
              alignItems: "end",
            }}
          >
            {PRICING.map((p) => (
              <div
                key={p.name}
                className={`bg-card rounded-2xl border pricing-card relative ${p.popular ? "border-primary/40 shadow-lg" : "border-border"}`}
                style={{ padding: p.popular ? "2.25rem 1.75rem" : "1.75rem" }}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 premium-gradient text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap">
                    Populiariausias
                  </div>
                )}
                {p.save && !p.popular && (
                  <div className="absolute -top-2.5 right-4 bg-primary/10 text-primary border border-primary/25 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    {p.save}
                  </div>
                )}

                <p className="font-display font-bold text-foreground text-base mb-1">{p.name}</p>
                <p className="text-xs text-muted-foreground mb-4">
                  {p.credits} {p.credits === 1 ? "paieška" : "paieškų"}
                </p>

                <div
                  className="font-display font-bold text-foreground mb-1"
                  style={{
                    fontSize: "2.1rem",
                    letterSpacing: "-0.03em",
                    color: p.popular ? "hsl(var(--primary))" : undefined,
                  }}
                >
                  {p.price}
                </div>
                <p className="text-xs text-muted-foreground mb-6">{p.per}</p>

                <button
                  onClick={() => navigate("/map")}
                  className={`w-full rounded-xl py-2.5 text-sm font-semibold border-none cursor-pointer transition-opacity ${p.popular ? "premium-gradient text-primary-foreground hover:opacity-90" : "bg-muted text-foreground hover:bg-muted/70"}`}
                >
                  Pradėti
                </button>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground/60 mt-5">
            Saugus mokėjimas per Stripe · Visi pagrindiniai mokėjimo metodai
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-5" style={{ background: "hsl(var(--secondary))" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-primary block mb-2">FAQ</span>
            <h2
              className="font-display font-bold text-foreground"
              style={{ fontSize: "clamp(1.4rem,3.5vw,2.2rem)", letterSpacing: "-0.02em" }}
            >
              Dažniausiai užduodami klausimai
            </h2>
          </div>
          <div className="bg-card rounded-2xl border border-border px-6 divide-y divide-border">
            {FAQ_ITEMS.map((item, i) => (
              <FaqRow key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="bg-background py-20 px-5 text-center">
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2
            className="font-display font-bold text-foreground mb-4"
            style={{ fontSize: "clamp(1.5rem,4vw,2.4rem)", letterSpacing: "-0.025em" }}
          >
            Pradėkite nemokamai šiandien
          </h2>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            Pirmą ataskaitą galite gauti per 60 sekundžių.
            <br />
            Registracija nemokama.
          </p>
          <button
            onClick={() => navigate("/map")}
            className="premium-gradient text-primary-foreground font-bold rounded-xl px-10 py-3.5 border-none cursor-pointer hover:opacity-90 transition-opacity text-base"
          >
            Išbandyti nemokamai →
          </button>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-background px-6 md:px-10 py-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-primary">
            <IconLayers />
          </span>
          <span className="font-display font-bold text-foreground text-sm">
            Žemė<span className="text-gradient">Pro</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground/60">Duomenys: Geoportal.lt · Registrų centras · VŽT</p>
        <p className="text-xs text-muted-foreground/60">© {new Date().getFullYear()} ŽemėPro</p>
      </footer>
    </div>
  );
}
