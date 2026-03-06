import React, { useState, useRef } from 'react';
import {
  CheckCircle2, Lock, Map, FileText, MapPin,
  Maximize, Calendar, Info, ShieldCheck, Unlock, Eye, ArrowUp
} from 'lucide-react';

const MOCK_PARCEL = {
  cadastralNumber: "4400-1234-5678",
  unikalusNr: "4400-1234-5678-0001",
  area: "0.1500 ha",
  purpose: "Kitos paskirties žemė (Vienbučių ir dvibučių gyvenamųjų pastatų teritorijos)",
  address: "Gedimino pr. 1, Vilniaus m. sav.",
  formavimoData: "2015-05-20",
  coordinates: "54.687157, 25.279652"
};

const SAMPLE_REPORT_DATA = {
  cadastralNumber: "0101/0001:0001",
  unikalusNr: "4400-0000-0001",
  area: "0.1200 ha",
  purpose: "Namų valda (Vienbučių gyvenamųjų pastatų teritorijos)",
  address: "Pavyzdžio g. 1, Vilniaus m. sav.",
  formavimoData: "2020-03-15",
  coordinates: "54.689200, 25.271400"
};

function DataRow({ icon, label, value, isMono = false }: { icon: React.ReactNode; label: string; value: string; isMono?: boolean }) {
  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:bg-muted/40 transition-colors">
      <div className="sm:w-1/3 flex items-center gap-2 text-muted-foreground text-sm font-medium">
        <div className="w-4 h-4 opacity-70">{icon}</div>
        {label}
      </div>
      <div className={`sm:w-2/3 text-foreground ${isMono ? 'font-mono text-sm' : 'font-medium'}`}>
        {value || "Nėra duomenų"}
      </div>
    </div>
  );
}

function ReportContent({ data, isSample = false }: { data: typeof MOCK_PARCEL; isSample?: boolean }) {
  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${isSample ? 'grayscale-[20%]' : ''}`}>
      {/* Ataskaitos antraštė */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border shadow-sm relative">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sklypo ataskaita</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Atrakinta {new Date().toLocaleDateString('lt-LT')}
          </p>
        </div>
        <div className="bg-muted/50 px-4 py-2 rounded-lg border border-border text-right">
          <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Kadastrinis numeris</p>
          <p className="text-lg font-mono font-bold text-primary">{data.cadastralNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Žemėlapis */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-[300px] relative">
            <div className="p-3 border-b border-border bg-muted/50 font-semibold text-sm flex items-center gap-2">
              <Map className="w-4 h-4 text-muted-foreground" /> Žemėlapio vaizdas
            </div>
            <div className={`flex-1 bg-primary/5 flex items-center justify-center relative ${isSample ? 'opacity-60' : ''}`}>
              {isSample && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <span className="text-6xl font-black text-foreground/[0.06] rotate-[-25deg] select-none tracking-widest uppercase">
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
        </div>

        {/* Duomenų lentelė */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm overflow-hidden">
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

export default function Report1() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  const handleUnlock = () => {
    setIsUnlocking(true);
    setTimeout(() => {
      setIsUnlocked(true);
      setIsUnlocking(false);
    }, 1500);
  };

  const scrollToCta = () => {
    ctaRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-background p-4">
        {/* ===== VIRŠUS: Užrakinta peržiūra ===== */}
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500" ref={ctaRef}>
          {/* Sėkmės pranešimas */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
            <div className="flex justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-900">Žemės sklypas rastas!</h2>
            <p className="text-emerald-700 font-medium">
              Įrašas rastas Nacionaliniame registre, kadastrinis Nr.: <span className="font-bold">{MOCK_PARCEL.cadastralNumber}</span>
            </p>
          </div>

          {/* Peržiūros kortelė */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden relative">
            <div className="p-6 border-b border-border bg-muted/50 flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Ataskaitos peržiūra
              </h3>
              <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Patikrinti duomenys
              </span>
            </div>

            <div className="p-6 relative">
              <div className="filter blur-[6px] opacity-60 select-none pointer-events-none space-y-4">
                <div className="h-48 bg-muted rounded-lg w-full mb-6"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-12 bg-muted/60 rounded"></div>
                  <div className="h-12 bg-muted/60 rounded"></div>
                  <div className="h-12 bg-muted/60 rounded"></div>
                  <div className="h-12 bg-muted/60 rounded"></div>
                </div>
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-card via-card/90 to-transparent p-6 text-center">
                <Lock className="w-10 h-10 text-muted-foreground mb-4" />
                <h4 className="text-xl font-bold text-foreground mb-2">Atrakinti pilną sklypo ataskaitą</h4>
                <ul className="text-sm text-muted-foreground mb-6 space-y-2 text-left inline-block">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Tikslios interaktyvaus žemėlapio ribos</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Registruota žemės paskirtis ir plotas</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Tikslus adresas ir koordinatės</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Unikalus turto numeris</li>
                </ul>

                <button
                  onClick={handleUnlock}
                  disabled={isUnlocking}
                  className="w-full max-w-md premium-gradient text-primary-foreground font-bold py-4 px-8 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isUnlocking ? (
                    <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Unlock className="w-5 h-5" />
                      Atrakinti ataskaitą (1 kreditas)
                    </>
                  )}
                </button>
                <p className="text-xs text-muted-foreground mt-4">Jūs turite 12 kreditų.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== SKIRTUKAS ===== */}
        <div className="max-w-3xl mx-auto my-12">
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/60 border border-border">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-muted-foreground">Pažiūrėkite, kas įtraukta į pilną ataskaitą</span>
              <span className="text-lg">👇</span>
            </div>
            <div className="flex-1 h-px bg-border" />
          </div>
        </div>

        {/* ===== APAČIA: Pavyzdinė ataskaita ===== */}
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-2xl border-2 border-dashed border-border bg-muted/30 p-6 pt-12">
            {/* PAVYZDYS ženkliukas */}
            <div className="absolute top-3 right-3 z-10">
              <span className="bg-amber-100 text-amber-800 text-xs font-black px-4 py-1.5 rounded-full border border-amber-200 uppercase tracking-wider shadow-sm">
                Pavyzdinė ataskaita
              </span>
            </div>

            {/* Vandenženklis */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-2xl">
              <span className="text-[120px] font-black text-foreground/[0.03] rotate-[-30deg] select-none tracking-[0.2em] uppercase whitespace-nowrap">
                PAVYZDYS
              </span>
            </div>

            <div className="relative">
              <ReportContent data={SAMPLE_REPORT_DATA} isSample />
            </div>

            {/* Apatinis kvietimas veikti */}
            <div className="mt-8 text-center">
              <button
                onClick={scrollToCta}
                className="inline-flex items-center gap-2 premium-gradient text-primary-foreground font-bold py-3 px-8 rounded-xl shadow-lg transition-all hover:opacity-90"
              >
                <ArrowUp className="w-5 h-5" />
                Atrakinti jūsų tikrą ataskaitą
              </button>
              <p className="text-xs text-muted-foreground mt-3">
                Aukščiau pateikta pavyzdinė ataskaita su fiktyviais duomenimis. Jūsų tikra ataskaita turės patikrintus registro duomenis.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== ATRAKINTA BŪSENA =====
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="animate-in slide-in-from-bottom-4 duration-500">
        <ReportContent data={MOCK_PARCEL} />
      </div>
    </div>
  );
}
