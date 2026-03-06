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
  Image as ImageIcon,
  Euro,
  Ruler,
  AlertTriangle,
} from "lucide-react";

// --- EXPANDED MOCK DATA ---
const MOCK_PARCEL = {
  cadastralNumber: "4400-1234-5678",
  unikalusNr: "4400-1234-5678-0001",
  area: "0.1500 ha",
  purpose: "Kitos paskirties žemė (Vienbučių ir dvibučių gyvenamųjų pastatų teritorijos)",
  address: "Gedimino pr. 1, Vilniaus m. sav.",
  formavimoData: "2015-05-20",
  coordinates: "54.687157, 25.279652",
  vidutineRinkosVerte: "125 400 €",
  vertinimoData: "2023-08-01",
  matavimuTipas: "Kadastriniai matavimai",
  nasumoBalas: "Netaikoma",
  specialiosiosSalygos: "Yra (Kelių apsaugos zonos, Ryšių linijų apsaugos zonos)",
};

const SAMPLE_REPORT_DATA = {
  cadastralNumber: "0101/0001:0001",
  unikalusNr: "4400-0000-0001",
  area: "0.1200 ha",
  purpose: "Namų valda (Vienbučių gyvenamųjų pastatų teritorijos)",
  address: "Pavyzdžio g. 1, Vilniaus m. sav.",
  formavimoData: "2020-03-15",
  coordinates: "54.689200, 25.271400",
  vidutineRinkosVerte: "45 200 €",
  vertinimoData: "2024-01-10",
  matavimuTipas: "Preliminarūs matavimai",
  nasumoBalas: "42.5",
  specialiosiosSalygos: "Nėra registruota",
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
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isMono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:bg-muted/40 transition-colors">
      <div className="sm:w-2/5 flex items-center gap-2 text-muted-foreground text-sm font-medium">
        <div className="w-4 h-4 opacity-70">{icon}</div>
        {label}
      </div>
      <div
        className={`sm:w-3/5 ${isMono ? "font-mono text-sm" : "font-medium"} ${highlight ? "text-emerald-600 font-bold text-lg" : "text-foreground"}`}
      >
        {value || "Nėra duomenų"}
      </div>
    </div>
  );
}

function DataCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden h-full">
      <div className="p-4 border-b border-border bg-muted/50 font-semibold flex items-center gap-2 text-foreground">
        {icon} {title}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function ReportContent({ data, isSample = false }: { data: typeof MOCK_PARCEL; isSample?: boolean }) {
  return (
    <div className={`w-full space-y-6 ${isSample ? "grayscale-[15%]" : ""} relative`}>
      {isSample && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 overflow-hidden">
          <span className="text-5xl md:text-8xl font-black text-foreground/[0.04] rotate-[-25deg] select-none tracking-[0.2em] uppercase whitespace-nowrap">
            PAVYZDYS
          </span>
        </div>
      )}

      {/* Antraštė */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border shadow-sm relative z-10">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Išsami sklypo ataskaita</h2>
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

      {/* Žemėlapių galerija */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {/* Standartinis žemėlapis */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-[250px]">
          <div className="p-3 border-b border-border bg-muted/50 font-semibold text-sm flex items-center gap-2">
            <Map className="w-4 h-4 text-muted-foreground" /> Kadastro žemėlapis
          </div>
          <div className="flex-1 bg-primary/5 flex items-center justify-center relative">
            <div className="text-center">
              <MapPin className="w-10 h-10 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Sklypo ribos</p>
            </div>
          </div>
        </div>

        {/* Ortofoto žemėlapis */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-[250px]">
          <div className="p-3 border-b border-border bg-muted/50 font-semibold text-sm flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-muted-foreground" /> Ortofoto vaizdas
          </div>
          <div className="flex-1 bg-emerald-900/10 flex items-center justify-center relative">
            <div className="text-center">
              <ImageIcon className="w-10 h-10 text-emerald-700 mx-auto mb-2 opacity-70" />
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300">Palydovinis vaizdas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Duomenų sekcijos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        {/* 1. Pagrindinė informacija */}
        <div className="lg:col-span-2">
          <DataCard title="Pagrindinė informacija" icon={<Info className="w-5 h-5 text-blue-500" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="divide-y divide-border">
                <DataRow icon={<FileText />} label="Unikalus numeris" value={data.unikalusNr} />
                <DataRow icon={<MapPin />} label="Tikslus adresas" value={data.address} />
                <DataRow icon={<Map />} label="Centro koordinatės" value={data.coordinates} isMono />
              </div>
              <div className="divide-y divide-border">
                <DataRow icon={<Maximize />} label="Registruotas plotas" value={data.area} />
                <DataRow icon={<Info />} label="Žemės paskirtis" value={data.purpose} />
                <DataRow icon={<Calendar />} label="Formavimo data" value={data.formavimoData} />
              </div>
            </div>
          </DataCard>
        </div>

        {/* 2. Vertės duomenys */}
        <DataCard title="Mokestinė ir vertės informacija" icon={<Euro className="w-5 h-5 text-emerald-500" />}>
          <DataRow icon={<Euro />} label="Vidutinė rinkos vertė" value={data.vidutineRinkosVerte} highlight />
          <DataRow icon={<Calendar />} label="Vertinimo data" value={data.vertinimoData} />
          <div className="p-4 bg-muted/30 text-xs text-muted-foreground">
            * Vidutinė rinkos vertė yra apskaičiuota masinio vertinimo būdu ir gali skirtis nuo realios komercinės
            vertės.
          </div>
        </DataCard>

        {/* 3. Matavimai ir apribojimai */}
        <DataCard title="Matavimai ir apribojimai" icon={<Ruler className="w-5 h-5 text-amber-500" />}>
          <DataRow icon={<Ruler />} label="Matavimų tipas" value={data.matavimuTipas} />
          <DataRow icon={<Shield />} label="Našumo balas" value={data.nasumoBalas} />
          <DataRow icon={<AlertTriangle />} label="Specialiosios sąlygos" value={data.specialiosiosSalygos} />
        </DataCard>
      </div>
    </div>
  );
}

// ... (Keep the rest of the ParcelCheckout component exactly the same, just ensure it uses this new ReportContent)
