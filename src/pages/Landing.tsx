import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// ---------- ICONS ----------
const IconSearch = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const IconUnlock = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
  </svg>
);
const IconFile = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
);
const IconMap = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
    <line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/>
  </svg>
);
const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconZap = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconChevronDown = ({ open }: { open: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease" }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IconLayers = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
  </svg>
);
const IconEuro = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/>
  </svg>
);
const IconCoords = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
  </svg>
);
const IconRuler = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4Z"/><path d="m7.5 10.5 2 2"/><path d="m10.5 7.5 2 2"/><path d="m13.5 4.5 2 2"/><path d="m4.5 13.5 2 2"/>
  </svg>
);
const IconTarget = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);
const IconTrend = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
  </svg>
);
const IconSatellite = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 7 9 3 5 7l4 4"/><path d="m17 11 4 4-4 4-4-4"/><path d="m8 12 4 4 6-6-4-4Z"/><path d="m16 8 3-3"/><path d="M9 21a6 6 0 0 0-6-6"/>
  </svg>
);

// ---------- STATIC DATA ----------
const FEATURES = [
  { icon: <IconTarget />, title: "Kadastrinis & Unikalus Nr.", desc: "Tikslus sklypo identifikatorius iš NT registro" },
  { icon: <IconRuler />, title: "Juridinis plotas", desc: "Registruotas plotas hektarais su tikslumu iki 4 ženklų" },
  { icon: <IconFile />, title: "Žemės paskirtis", desc: "Oficiali paskirtis ir naudojimo kategorija" },
  { icon: <IconCoords />, title: "Koordinatės (WGS84 & LKS94)", desc: "GPS koordinatės abiejose koordinačių sistemose" },
  { icon: <IconMap />, title: "Interaktyvus žemėlapis", desc: "Tikslios sklypo ribos kadastro ir ortofoto žemėlapyje" },
  { icon: <IconEuro />, title: "Rinkos vertė", desc: "Automatiškai surinkta masinė vertė iš RC registro" },
  { icon: <IconSatellite />, title: "Ortofoto vaizdas", desc: "Palydovinis vaizdas su sklypo kontūrais" },
  { icon: <IconTrend />, title: "Formavimo data", desc: "Kada sklypas buvo suformuotas registre" },
];

const STEPS = [
  { num: "01", icon: <IconSearch />, title: "Ieškokite sklypo", desc: "Įveskite kadastrinio numerį arba spustelėkite žemėlapyje. Sistema akimirksniu suranda sklypą INSPIRE duomenų bazėje." },
  { num: "02", icon: <IconUnlock />, title: "Atrakinkite ataskaitą", desc: "Naudokite 1 kreditą norėdami atrakinti pilną sklypo duomenų ataskaitą. Kreditai negalioja – mokate tik kai naudojate." },
  { num: "03", icon: <IconFile />, title: "Gaukite duomenis", desc: "Momentinė ataskaita su visais kadastrinio sklypo duomenimis, rinkos verte ir interaktyviais žemėlapiais." },
];

const PRICING = [
  { name: "Starteris", credits: 1, price: "€1,99", per: "€1,99/paieška", highlight: false, save: "" },
  { name: "Populiarus", credits: 10, price: "€9,99", per: "€1,00/paieška", highlight: true, save: "Sutaupyk 50%" },
  { name: "Profesionalus", credits: 30, price: "€19,99", per: "€0,67/paieška", highlight: false, save: "Sutaupyk 66%" },
];

const FAQ_ITEMS = [
  { q: "Iš kur gaunami duomenys?", a: "Visi duomenys gaunami iš oficialių Lietuvos šaltinių: INSPIRE geoportalas, Registrų centras (Nekilnojamojo turto registras) ir Valstybinė žemės tarnyba. Mes tik juos surenkame ir pateikiame suprantamai." },
  { q: "Ar duomenys atnaujinami?", a: "Taip. Kiekvieną kartą pateikiame naujausius duomenis tiesiai iš šaltinio – be seno tarpinio saugojimo. Rinkos vertė atnaujinama pagal oficialaus Registrų centro masinį vertinimą." },
  { q: "Ar kreditai gali pasibaigti?", a: "Kreditai neturi galiojimo termino – jie lieka jūsų sąskaitoje tol, kol juos panaudosite. Mokate tik kai faktiškai atrakinate ataskaitą." },
  { q: "Ar galima naudoti verslo tikslais?", a: "Taip. Ataskaitos skirtos ir privatiems asmenims, ir nekilnojamojo turto agentams, advokatams, statybų įmonėms bei investuotojams." },
  { q: "Kaip veikia žemėlapio identifikavimas?", a: "Spustelėkite bet kurį tašką žemėlapyje – sistema automatiškai nustato, kuriam sklypui tas taškas priklauso, ir parodo jo ribas bei duomenis." },
];

// ---------- HOOKS ----------
function useInView(ref: React.RefObject<HTMLElement>): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return visible;
}

function useCounter(target: number, active: boolean, duration = 1600): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let n = 0;
    const step = Math.max(1, Math.ceil(target / (duration / 16)));
    const t = setInterval(() => {
      n = Math.min(n + step, target);
      setVal(n);
      if (n >= target) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [active, target, duration]);
  return val;
}

// ---------- SMALL COMPONENTS ----------

function StatItem({ value, suffix, label, active }: { value: number; suffix: string; label: string; active: boolean }) {
  const count = useCounter(value, active);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "clamp(1.9rem, 4vw, 3rem)", fontFamily: "'Unbounded', sans-serif", fontWeight: 800, color: "#1fcc7a", lineHeight: 1 }}>
        {active ? count.toLocaleString("lt-LT") : "0"}{suffix}
      </div>
      <div style={{ fontSize: "0.75rem", color: "#3a4a60", marginTop: "0.45rem", letterSpacing: "0.09em", textTransform: "uppercase" as const, fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
}

function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #0f1c2e" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.2rem 0", background: "none", border: "none", cursor: "pointer",
          color: "#b0bdd4", fontSize: "0.93rem", fontWeight: 600, textAlign: "left" as const, gap: "1rem",
        }}
      >
        <span>{q}</span>
        <span style={{ flexShrink: 0, color: "#1fcc7a" }}><IconChevronDown open={open} /></span>
      </button>
      <div style={{ maxHeight: open ? "300px" : 0, overflow: "hidden", transition: "max-height 0.35s ease" }}>
        <p style={{ color: "#3a4a60", lineHeight: 1.75, paddingBottom: "1.2rem", fontSize: "0.88rem", margin: 0 }}>{a}</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, index }: { icon: React.ReactNode; title: string; desc: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const vis = useInView(ref as React.RefObject<HTMLElement>);
  const [hov, setHov] = useState(false);
  return (
    <div
      ref={ref}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "#0b1828" : "#070e1b",
        border: hov ? "1px solid #1fcc7a2e" : "1px solid #0f1c2e",
        borderRadius: "16px", padding: "1.4rem",
        transition: "all 0.35s ease",
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(24px)",
        transitionDelay: `${(index % 4) * 55}ms`,
      }}
    >
      <div style={{ color: "#1fcc7a", marginBottom: "0.9rem" }}>{icon}</div>
      <h3 style={{ color: "#b0bdd4", fontWeight: 700, fontSize: "0.88rem", margin: "0 0 0.35rem" }}>{title}</h3>
      <p style={{ color: "#2a3a52", fontSize: "0.8rem", lineHeight: 1.65, margin: 0 }}>{desc}</p>
    </div>
  );
}

// ---------- MAIN ----------
export default function Landing() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  const statsRef = useRef<HTMLDivElement>(null);
  const statsVis = useInView(statsRef as React.RefObject<HTMLElement>);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Unbounded:wght@700;800;900&family=Syne:wght@600;700;800&display=swap";
    document.head.appendChild(link);
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      try { document.head.removeChild(link); } catch (_) { /* ignore */ }
    };
  }, []);

  return (
    <div style={{ background: "#050c17", color: "#b0bdd4", fontFamily: "'Inter', sans-serif", overflowX: "hidden" }}>

      {/* Global styles */}
      <style>{`
        @keyframes fadeUpIn { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulseOrb { 0%,100%{opacity:.4;transform:translateX(-50%) scale(1)} 50%{opacity:.65;transform:translateX(-50%) scale(1.07)} }
        @keyframes shimmerMove { from{background-position:-200% 0} to{background-position:200% 0} }
        @keyframes floatBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
        .a1{animation:fadeUpIn .7s ease .05s both}
        .a2{animation:fadeUpIn .7s ease .18s both}
        .a3{animation:fadeUpIn .7s ease .32s both}
        .a4{animation:fadeUpIn .7s ease .46s both}
        .shimmer-green {
          background:linear-gradient(90deg,#0b9c58 0%,#1fcc7a 30%,#a7f3d0 55%,#1fcc7a 72%,#0b9c58 100%);
          background-size:200% auto;
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          background-clip:text;
          animation:shimmerMove 3.5s linear infinite;
        }
        .btn-green{background:#1fcc7a;color:#050c17;border:none;cursor:pointer;font-weight:800;transition:box-shadow .25s,transform .2s}
        .btn-green:hover{box-shadow:0 0 28px #1fcc7a55;transform:translateY(-2px)}
        .btn-outline{background:transparent;border:1px solid #0f1c2e;color:#3a4a60;cursor:pointer;transition:border-color .2s,color .2s}
        .btn-outline:hover{border-color:#1fcc7a33;color:#b0bdd4}
        .pricing-lift{transition:transform .25s ease}
        .pricing-lift:hover{transform:translateY(-5px)}
        .dot-bg{background-image:radial-gradient(circle,#152035 1px,transparent 1px);background-size:28px 28px}
      `}</style>

      {/* ── NAV ─────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 500,
        height: "58px", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 clamp(1rem, 5vw, 3.5rem)",
        background: scrollY > 40 ? "rgba(5,12,23,.93)" : "transparent",
        backdropFilter: scrollY > 40 ? "blur(18px)" : "none",
        borderBottom: scrollY > 40 ? "1px solid #0f1c2e" : "1px solid transparent",
        transition: "background .3s,border-color .3s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span style={{ color: "#1fcc7a" }}><IconLayers /></span>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1.08rem", color: "#b0bdd4", letterSpacing: "-0.01em" }}>
            Žemė<span style={{ color: "#1fcc7a" }}>Pro</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: "9px", alignItems: "center" }}>
          <button onClick={() => navigate("/auth")} className="btn-outline" style={{ padding: "6px 15px", borderRadius: "8px", fontSize: "0.82rem" }}>
            Prisijungti
          </button>
          <button onClick={() => navigate("/map")} className="btn-green" style={{ padding: "6px 17px", borderRadius: "8px", fontSize: "0.82rem" }}>
            Pradėti →
          </button>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────── */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column" as const,
        alignItems: "center", justifyContent: "center",
        position: "relative", textAlign: "center" as const,
        padding: "6rem clamp(1rem, 5vw, 4rem) 5rem",
      }}>
        <div className="dot-bg" style={{ position: "absolute", inset: 0, opacity: .3 }} />
        <div style={{
          position: "absolute", top: "22%", left: "50%",
          width: "min(720px,100vw)", height: "340px",
          background: "radial-gradient(ellipse,#1fcc7a1c 0%,transparent 68%)",
          animation: "pulseOrb 5s ease-in-out infinite", pointerEvents: "none",
        }} />

        {/* pill */}
        <div className="a1" style={{ marginBottom: "1.6rem" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            border: "1px solid #1fcc7a2e", borderRadius: "999px",
            padding: "4px 15px", fontSize: "0.7rem", fontWeight: 700,
            color: "#1fcc7a", letterSpacing: "0.09em", textTransform: "uppercase" as const,
            background: "#1fcc7a09",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#1fcc7a", display: "inline-block", boxShadow: "0 0 6px #1fcc7a" }} />
            Oficialūs kadastro duomenys · Lietuvos NT registras
          </span>
        </div>

        {/* headline */}
        <h1 className="a2" style={{
          fontFamily: "'Unbounded',sans-serif", fontWeight: 900,
          fontSize: "clamp(2rem,7.5vw,6.2rem)", lineHeight: 1.06,
          letterSpacing: "-0.03em", maxWidth: "920px", margin: "0 auto 1.4rem",
        }}>
          <span style={{ display: "block", color: "#c8d4e8" }}>KIEKVIENAS</span>
          <span className="shimmer-green" style={{ display: "block" }}>ŽEMĖS SKLYPAS</span>
          <span style={{ display: "block", color: "#c8d4e8" }}>TURI ISTORIJĄ</span>
        </h1>

        <p className="a3" style={{ fontSize: "clamp(.9rem,2vw,1.1rem)", color: "#3a4a60", maxWidth: "500px", margin: "0 auto 2.5rem", lineHeight: 1.78 }}>
          Momentinės žemės sklypų ataskaitos iš oficialių Lietuvos registrų.
          Kadastrinis numeris → išsami ataskaita per{" "}
          <strong style={{ color: "#b0bdd4" }}>3 sekundes</strong>.
        </p>

        <div className="a4" style={{ display: "flex", gap: "11px", flexWrap: "wrap" as const, justifyContent: "center", marginBottom: "2.5rem" }}>
          <button onClick={() => navigate("/map")} className="btn-green" style={{ padding: "14px 34px", borderRadius: "12px", fontSize: "0.93rem", fontFamily: "'Syne',sans-serif" }}>
            Pradėti nemokamai →
          </button>
          <button onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })} className="btn-outline" style={{ padding: "14px 26px", borderRadius: "12px", fontSize: "0.93rem" }}>
            Kaip tai veikia?
          </button>
        </div>

        <div className="a4" style={{ display: "flex", gap: "clamp(.8rem,2.5vw,2rem)", flexWrap: "wrap" as const, justifyContent: "center" }}>
          {[{ icon: <IconShield />, t: "Oficialūs duomenys" }, { icon: <IconZap />, t: "Momentinis atsakymas" }, { icon: <IconCheck />, t: "Saugus mokėjimas" }].map(({ icon, t }) => (
            <span key={t} style={{ display: "flex", alignItems: "center", gap: "6px", color: "#253545", fontSize: "0.8rem", fontWeight: 500 }}>
              <span style={{ color: "#1fcc7a" }}>{icon}</span>{t}
            </span>
          ))}
        </div>

        <div style={{ position: "absolute", bottom: "2.5rem", left: "50%", transform: "translateX(-50%)", animation: "floatBob 2.5s ease-in-out infinite" }}>
          <div style={{ width: 1, height: 44, background: "linear-gradient(to bottom,transparent,#1fcc7a44)" }} />
        </div>
      </section>

      {/* ── STATS ───────────────────────────── */}
      <div ref={statsRef} style={{ borderTop: "1px solid #0f1c2e", borderBottom: "1px solid #0f1c2e", background: "#060d1a", padding: "5rem clamp(1rem,5vw,4rem)" }}>
        <div style={{ maxWidth: "820px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "3rem" }}>
          <StatItem value={500000} suffix="+" label="Sklypai duomenų bazėje" active={statsVis} />
          <StatItem value={60}     suffix=""  label="Savivaldybių" active={statsVis} />
          <StatItem value={3}      suffix="s" label="Ataskaitos laikas" active={statsVis} />
          <StatItem value={100}    suffix="%" label="Oficialūs šaltiniai" active={statsVis} />
        </div>
      </div>

      {/* ── HOW ─────────────────────────────── */}
      <section id="how" style={{ padding: "7rem clamp(1rem,5vw,4rem)" }}>
        <div style={{ maxWidth: "980px", margin: "0 auto" }}>
          <div style={{ textAlign: "center" as const, marginBottom: "3.75rem" }}>
            <span style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" as const, color: "#1fcc7a", display: "block", marginBottom: ".8rem" }}>Procesas</span>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.8rem)", color: "#c8d4e8", letterSpacing: "-.02em", margin: 0 }}>Trys žingsniai iki ataskaitos</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: "1.2rem" }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ background: "#060d1a", border: "1px solid #0f1c2e", borderRadius: "20px", padding: "2rem", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: "1.2rem", right: "1.5rem", fontFamily: "'Unbounded',sans-serif", fontSize: "3.2rem", fontWeight: 900, color: "#1fcc7a07", lineHeight: 1, userSelect: "none" as const }}>{s.num}</div>
                <div style={{ width: 44, height: 44, borderRadius: "12px", background: "#1fcc7a0f", border: "1px solid #1fcc7a22", display: "flex", alignItems: "center", justifyContent: "center", color: "#1fcc7a", marginBottom: "1.2rem" }}>{s.icon}</div>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: "1rem", color: "#c8d4e8", margin: "0 0 .6rem" }}>{s.title}</h3>
                <p style={{ color: "#2a3a52", lineHeight: 1.72, fontSize: "0.86rem", margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────── */}
      <section style={{ padding: "7rem clamp(1rem,5vw,4rem)", background: "#060d1a", borderTop: "1px solid #0f1c2e" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
          <div style={{ textAlign: "center" as const, marginBottom: "3.75rem" }}>
            <span style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" as const, color: "#1fcc7a", display: "block", marginBottom: ".8rem" }}>Ataskaita</span>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.8rem)", color: "#c8d4e8", letterSpacing: "-.02em", margin: "0 0 .9rem" }}>Viskas vienoje ataskaitoje</h2>
            <p style={{ color: "#2a3a52", maxWidth: "440px", margin: "0 auto", lineHeight: 1.72, fontSize: ".88rem" }}>Surenkame duomenis iš kelių oficialių registrų ir pateikiame suprantamai</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: ".9rem" }}>
            {FEATURES.map((f, i) => <FeatureCard key={i} index={i} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────── */}
      <section id="pricing" style={{ padding: "7rem clamp(1rem,5vw,4rem)" }}>
        <div style={{ maxWidth: "840px", margin: "0 auto" }}>
          <div style={{ textAlign: "center" as const, marginBottom: "3.75rem" }}>
            <span style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" as const, color: "#1fcc7a", display: "block", marginBottom: ".8rem" }}>Kainos</span>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.8rem)", color: "#c8d4e8", letterSpacing: "-.02em", margin: "0 0 .9rem" }}>Mokate tik kai naudojate</h2>
            <p style={{ color: "#2a3a52", lineHeight: 1.72, fontSize: ".88rem" }}>Jokių prenumeratų. Jokių mėnesinių mokesčių. Kreditai negalioja.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "1.2rem", alignItems: "end" }}>
            {PRICING.map((p, i) => (
              <div key={i} className="pricing-lift" style={{
                background: p.highlight ? "linear-gradient(145deg,#0b1d30,#08141f)" : "#060d1a",
                border: p.highlight ? "1px solid #1fcc7a40" : "1px solid #0f1c2e",
                borderRadius: "20px", padding: p.highlight ? "2.5rem 1.75rem" : "2rem 1.75rem",
                position: "relative", boxShadow: p.highlight ? "0 0 48px #1fcc7a12" : "none",
              }}>
                {p.highlight && (
                  <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "#1fcc7a", color: "#050c17", fontSize: ".67rem", fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" as const, padding: "3px 13px", borderRadius: "999px", whiteSpace: "nowrap" as const }}>Populiariausias</div>
                )}
                {p.save && !p.highlight && (
                  <div style={{ position: "absolute", top: -11, right: "1.25rem", background: "#1fcc7a14", color: "#1fcc7a", border: "1px solid #1fcc7a2e", fontSize: ".65rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, padding: "2px 10px", borderRadius: "999px" }}>{p.save}</div>
                )}
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: ".93rem", color: "#b0bdd4", margin: "0 0 .3rem" }}>{p.name}</h3>
                <p style={{ color: "#253545", fontSize: ".8rem", margin: "0 0 1.4rem" }}>{p.credits} {p.credits === 1 ? "paieška" : "paieškų"}</p>
                <div style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 800, fontSize: "2.1rem", color: p.highlight ? "#1fcc7a" : "#c8d4e8", letterSpacing: "-.03em", lineHeight: 1, margin: "0 0 .3rem" }}>{p.price}</div>
                <p style={{ color: "#253545", fontSize: ".77rem", margin: "0 0 1.6rem" }}>{p.per}</p>
                <button onClick={() => navigate("/map")} className={p.highlight ? "btn-green" : "btn-outline"} style={{ width: "100%", padding: "11px", borderRadius: "10px", fontSize: ".87rem", fontFamily: "'Syne',sans-serif" }}>
                  Pradėti
                </button>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center" as const, marginTop: "1.75rem", color: "#1a2840", fontSize: ".76rem" }}>
            Saugus mokėjimas per Stripe · Visi pagrindiniai mokėjimo metodai
          </p>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────── */}
      <section style={{ padding: "7rem clamp(1rem,5vw,4rem)", background: "#060d1a", borderTop: "1px solid #0f1c2e" }}>
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <div style={{ textAlign: "center" as const, marginBottom: "3.25rem" }}>
            <span style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" as const, color: "#1fcc7a", display: "block", marginBottom: ".8rem" }}>FAQ</span>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.4rem)", color: "#c8d4e8", letterSpacing: "-.02em", margin: 0 }}>Dažniausiai užduodami klausimai</h2>
          </div>
          <div style={{ borderTop: "1px solid #0f1c2e" }}>
            {FAQ_ITEMS.map((item, i) => <FaqRow key={i} q={item.q} a={item.a} />)}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────── */}
      <section style={{ padding: "9rem clamp(1rem,5vw,4rem)", position: "relative", overflow: "hidden", textAlign: "center" as const }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(580px,100vw)", height: "240px", background: "radial-gradient(ellipse,#1fcc7a12 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", maxWidth: "640px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Unbounded',sans-serif", fontWeight: 900, fontSize: "clamp(1.9rem,6vw,4.2rem)", letterSpacing: "-.03em", lineHeight: 1.08, margin: "0 0 1.4rem" }}>
            <span style={{ color: "#c8d4e8" }}>PRADĖKITE</span><br />
            <span className="shimmer-green">ŠIANDIEN</span>
          </h2>
          <p style={{ color: "#253545", fontSize: ".93rem", margin: "0 0 2.4rem", lineHeight: 1.75 }}>
            Pirmą ataskaitą galite gauti per 60 sekundžių. Registracija nemokama.
          </p>
          <button onClick={() => navigate("/map")} className="btn-green" style={{ padding: "16px 44px", borderRadius: "13px", fontSize: ".97rem", fontFamily: "'Syne',sans-serif" }}>
            Pradėti nemokamai →
          </button>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────── */}
      <footer style={{ borderTop: "1px solid #0f1c2e", padding: "2rem clamp(1rem,5vw,3.5rem)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: "1rem", background: "#050c17" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span style={{ color: "#1fcc7a" }}><IconLayers /></span>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: ".93rem", color: "#b0bdd4" }}>Žemė<span style={{ color: "#1fcc7a" }}>Pro</span></span>
        </div>
        <p style={{ color: "#1a2840", fontSize: ".73rem", margin: 0 }}>Duomenys: Geoportal.lt · Registrų centras · VŽT</p>
        <p style={{ color: "#1a2840", fontSize: ".73rem", margin: 0 }}>© {new Date().getFullYear()} ŽemėPro</p>
      </footer>
    </div>
  );
}
