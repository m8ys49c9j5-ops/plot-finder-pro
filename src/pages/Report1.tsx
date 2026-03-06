import React, { useState, useRef } from "react";
import {
  CheckCircle2,
  Lock,
  Map,
  FileText,
  MapPin,
  Maximize,
  Calendar,
  Info,
  ShieldCheck,
  Unlock,
  Eye,
  ArrowRight,
  Shield,
  CreditCard,
  Zap,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// --- MOCK DATA ---
const MOCK_PARCEL = {
  cadastralNumber: "4400-1234-5678",
  unikalusNr: "4400-1234-5678-0001",
  area: "0.1500 ha",
  purpose: "Kitos paskirties žemė (Vienbučių ir dvibučių gyvenamųjų pastatų teritorijos)",
  address: "Gedimino pr. 1, Vilniaus m. sav.",
  formavimoData: "2015-05-20",
  coordinates: "54.687157, 25.279652",
};

const SAMPLE_REPORT_DATA = {
  cadastralNumber: "0101/0001:0001",
  unikalusNr: "4400-0000-0001",
  area: "0.1200 ha",
  purpose: "Namų valda (Vienbučių gyvenamųjų pastatų teritorijos)",
  address: "Pavyzdžio g. 1, Vilniaus m. sav.",
  formavimoData: "2020-03-15",
  coordinates: "54.689200, 25.271400",
};

const PRICING_TIERS = [
  { id: "tier-1", credits: 1, price: 1.99, originalPrice: null, badge: null },
  { id: "tier-2", credits: 10, price: 9.99, originalPrice: 19.9, badge: "Sutaupote 50%" },
  { id: "tier-3", credits: 30, price: 19.99, originalPrice: 59.7, badge: "Sutaupote 67%", isPopular: true },
];

// --- HELPER COMPONENTS ---
function DataRow({
  icon,
  label,
  value,
  isMono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isMono?: boolean;
}) {
  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:bg-muted/40 transition-colors">
      <div className="sm:w-1/3 flex items-center gap-2 text-muted-foreground text-sm font-medium">
        <div className="w-4 h-4 opacity-70">{icon}</div>
        {label}
      </div>
      <div className={`sm:w-2/3 text-foreground ${isMono ? "font-mono text-sm" : "font-medium"}`}>
        {value || "Nėra duomenų"}
      </div>
    </div>
  );
}

function ReportContent({ data, isSample = false }: { data: typeof MOCK_PARCEL; isSample?: boolean }) {
  return (
    <div className={`w-full space-y-6 ${isSample ? "grayscale-[15%]" : ""}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border shadow-sm relative">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Sklypo ataskaita</h2>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            {isSample ? "Pavyzdiniai duomenys" : `Atrakinta ${new Date().toLocaleDateString("lt-LT")}`}
          </p>
        </div>
        <div className="bg-muted/50 px-4 py-2 rounded-lg border border-border text-right">
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Kadastrinis numeris</p>
          <p className="text-lg font-mono font-bold text-primary">{data.cadastralNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Žemėlapis */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-[250px] relative">
          <div className="p-3 border-b border-border bg-muted/50 font-semibold text-sm flex items-center gap-2">
            <Map className="w-4 h-4 text-muted-foreground" /> Žemėlapio vaizdas
          </div>
          <div
            className={`flex-1 bg-primary/5 flex items-center justify-center relative ${isSample ? "opacity-60" : ""}`}
          >
            {isSample && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <span className="text-5xl md:text-7xl font-black text-foreground/[0.05] rotate-[-20deg] select-none tracking-widest uppercase">
                  PAVYZDYS
                </span>
              </div>
            )}
            <div className="text-center z-10">
              <MapPin className="w-10 h-10 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Interaktyvus žemėlapis</p>
            </div>
          </div>
        </div>

        {/* Duomenų lentelė */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/50 font-semibold flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" /> Registro duomenys
          </div>
          <div className="divide-y divide-border">
            <DataRow icon={<FileText />} label="Unikalus numeris" value={data.unikalusNr} />
            <DataRow icon={<MapPin />} label="Tikslus adresas" value={data.address} />
            <DataRow icon={<Maximize />} label="Registruotas plotas" value={data.area} />
            <DataRow icon={<Info />} label="Žemės paskirtis" value={data.purpose} />
            <DataRow icon={<Calendar />} label="Formavimo data" value={data.formavimoData} />
            <DataRow icon={<Map />} label="Centro koordinatės" value={data.coordinates} isMono />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
export default function ParcelCheckout() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTier, setSelectedTier] = useState(PRICING_TIERS[1].id); // Default to 10 credits
  const [showSample, setShowSample] = useState(false);

  const handleCheckout = () => {
    setIsProcessing(true);
    // Čia bus Stripe integracija arba kredito nuskaitymas
    setTimeout(() => {
      setIsUnlocked(true);
      setIsProcessing(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 2000);
  };

  // ===== ATRAKINTA BŪSENA (Pilna ataskaita) =====
  if (isUnlocked) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
          <ReportContent data={MOCK_PARCEL} />
        </div>
      </div>
    );
  }

  // ===== UŽRAKINTA BŪSENA (VinWiser stiliaus Checkout) =====
  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      {/* Trust Banner */}
      <div className="bg-emerald-600 text-white py-3 px-4 text-center shadow-md">
        <p className="text-sm md:text-base font-medium flex items-center justify-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          Saugus ryšys. Oficialūs Lietuvos Respublikos registrų duomenys.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* KAIRYSIS STULPELIS: Informacija ir Pavyzdys */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8 animate-in fade-in duration-500">
            {/* Sėkmės antraštė */}
            <div className="bg-card border border-emerald-200 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full -z-10"></div>
              <div className="flex items-start gap-4">
                <div className="bg-emerald-100 p-3 rounded-full shrink-0">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Sklypas sėkmingai rastas!</h1>
                  <p className="text-muted-foreground text-lg">
                    Nacionaliniame registre aptiktas įrašas kadastriniam numeriui: <br className="hidden md:block" />
                    <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded mt-1 inline-block">
                      {MOCK_PARCEL.cadastralNumber}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Kas įtraukta į ataskaitą */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                Ką sužinosite atrakinę ataskaitą?
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    icon: <Map className="text-blue-500" />,
                    title: "Tikslios sklypo ribos",
                    desc: "Interaktyvus žemėlapis su koordinatėmis",
                  },
                  {
                    icon: <Info className="text-purple-500" />,
                    title: "Žemės paskirtis",
                    desc: "Oficialus naudojimo būdas ir pobūdis",
                  },
                  {
                    icon: <Maximize className="text-emerald-500" />,
                    title: "Registruotas plotas",
                    desc: "Tikslus plotas hektarais (ha)",
                  },
                  {
                    icon: <MapPin className="text-rose-500" />,
                    title: "Tikslus adresas",
                    desc: "Savivaldybė, seniūnija, gatvė, numeris",
                  },
                  {
                    icon: <Calendar className="text-amber-500" />,
                    title: "Formavimo istorija",
                    desc: "Kada sklypas suformuotas registre",
                  },
                  {
                    icon: <Shield className="text-slate-500" />,
                    title: "Unikalus numeris",
                    desc: "NTR identifikacinis kodas",
                  },
                ].map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                  >
                    <div className="bg-background p-2 rounded-lg shadow-sm border border-border shrink-0">
                      {React.cloneElement(feature.icon as React.ReactElement, { className: "w-5 h-5" })}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pavyzdinės ataskaitos Toggle */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setShowSample(!showSample)}
                className="w-full p-6 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Eye className="w-6 h-6 text-primary" />
                  <div className="text-left">
                    <h3 className="font-bold text-foreground">Peržiūrėti pavyzdinę ataskaitą</h3>
                    <p className="text-sm text-muted-foreground">Pamatykite, kaip atrodys jūsų duomenys</p>
                  </div>
                </div>
                {showSample ? (
                  <ChevronUp className="w-6 h-6 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-muted-foreground" />
                )}
              </button>

              {showSample && (
                <div className="p-6 border-t border-border bg-muted/10">
                  <div className="relative rounded-xl border-2 border-dashed border-border bg-background p-4 md:p-6">
                    <div className="absolute top-4 right-4 z-10">
                      <span className="bg-amber-100 text-amber-800 text-xs font-black px-3 py-1 rounded-full border border-amber-200 uppercase tracking-wider shadow-sm">
                        Pavyzdys
                      </span>
                    </div>
                    <ReportContent data={SAMPLE_REPORT_DATA} isSample />
                  </div>
                </div>
              )}
            </div>

            {/* DUK */}
            <div className="py-4">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-muted-foreground" /> Dažniausiai užduodami klausimai
              </h3>
              <div className="space-y-4">
                <div className="bg-card p-4 rounded-xl border border-border">
                  <h4 className="font-semibold text-sm">Iš kur gaunami duomenys?</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Visi duomenys realiu laiku gaunami iš oficialių Lietuvos Respublikos registrų (NŽT, Registrų
                    centras).
                  </p>
                </div>
                <div className="bg-card p-4 rounded-xl border border-border">
                  <h4 className="font-semibold text-sm">Ar kreditai galioja amžinai?</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Taip, įsigyti paieškų kreditai neturi galiojimo pabaigos. Juos galite panaudoti bet kada ateityje.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* DEŠINYSIS STULPELIS: Sticky Checkout (Kreditų pirkimas) */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="sticky top-6 space-y-6">
              <div className="glass-panel bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 border-b border-border bg-muted/30">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Unlock className="w-5 h-5 text-primary" />
                    Atrakinti ataskaitą
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pasirinkite paieškų paketą. 1 ataskaita = 1 kreditas.
                  </p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Pricing Tiers */}
                  <div className="space-y-3">
                    {PRICING_TIERS.map((tier) => (
                      <label
                        key={tier.id}
                        className={`relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedTier === tier.id
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border bg-background hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedTier === tier.id ? "border-primary" : "border-muted-foreground"
                            }`}
                          >
                            {selectedTier === tier.id && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                          </div>
                          <div>
                            <span className="font-bold text-foreground block">
                              {tier.credits} {tier.credits === 1 ? "Ataskaita" : "Ataskaitos"}
                            </span>
                            {tier.originalPrice && (
                              <span className="text-xs text-muted-foreground line-through">
                                {tier.originalPrice.toFixed(2)} €
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-lg text-foreground">{tier.price.toFixed(2)} €</span>
                          {tier.badge && (
                            <span className="block text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider mt-0.5">
                              {tier.badge}
                            </span>
                          )}
                        </div>

                        {tier.isPopular && (
                          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                            Populiariausias
                          </div>
                        )}
                      </label>
                    ))}
                  </div>

                  {/* Email Input (Mock) */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">El. paštas (paskyros sukūrimui)</label>
                    <input
                      type="email"
                      placeholder="vardas@pavyzdys.lt"
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-8 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-lg"
                  >
                    {isProcessing ? (
                      <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Apmokėti ir Atrakinti <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>

                  <p className="text-xs text-center text-muted-foreground">
                    Paspausdami mygtuką sutinkate su paslaugų teikimo sąlygomis.
                  </p>
                </div>

                {/* Trust Footer */}
                <div className="bg-muted/30 p-4 border-t border-border flex flex-col items-center justify-center gap-3">
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <Shield className="w-5 h-5" />
                    <Zap className="w-5 h-5" />
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Saugus atsiskaitymas per Stripe</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
