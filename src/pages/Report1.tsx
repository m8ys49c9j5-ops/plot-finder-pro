import React, { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ParcelData } from "@/components/ParcelSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  CheckCircle2, Lock, Map, FileText, MapPin, Maximize, Calendar, Info,
  ShieldCheck, Unlock, Shield, Image as ImageIcon, Euro, Ruler, AlertTriangle,
  ArrowLeft, Mail, Lock as LockIcon, Search, Zap, Crown, Loader2, Check, Coins,
  LogOut, Layers, ExternalLink,
} from "lucide-react";

// --- SAMPLE DATA for preview ---
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
  { id: "tier1", name: "Starteris", credits: 1, price: "€1,99", perSearch: "€1,99", icon: Search, popular: false },
  { id: "tier2", name: "Populiarus", credits: 10, price: "€9,99", perSearch: "€1,00", icon: Zap, popular: true, save: "50%" },
  { id: "tier3", name: "Profesionalus", credits: 30, price: "€19,99", perSearch: "€0,67", icon: Crown, popular: false, save: "66%" },
];

// --- Types ---
interface ReportData {
  cadastralNumber: string;
  unikalusNr: string;
  area: string;
  purpose: string;
  address: string;
  formavimoData: string;
  coordinates: string;
  vidutineRinkosVerte: string;
  vertinimoData: string;
  matavimuTipas: string;
  nasumoBalas: string;
  specialiosiosSalygos: string;
}

interface ParcelFromRoute {
  cadastralNumber: string;
  unikalusNr?: string;
  area?: number;
  purpose?: string;
  address?: string;
  lat?: number;
  lng?: number;
  formavimoData?: string;
}

// Convert route parcel data to report format
function parcelToReportData(parcel: ParcelFromRoute): ReportData {
  return {
    cadastralNumber: parcel.cadastralNumber || "",
    unikalusNr: parcel.unikalusNr || "",
    area: parcel.area ? `${parcel.area} ha` : "",
    purpose: parcel.purpose || "",
    address: parcel.address || "",
    formavimoData: parcel.formavimoData || "",
    coordinates: parcel.lat && parcel.lng ? `${parcel.lat.toFixed(6)}, ${parcel.lng.toFixed(6)}` : "",
    vidutineRinkosVerte: "",
    vertinimoData: "",
    matavimuTipas: "",
    nasumoBalas: "",
    specialiosiosSalygos: "",
  };
}

// --- HELPER COMPONENTS ---
function DataRow({ icon, label, value, isMono = false, highlight = false }: {
  icon: React.ReactNode; label: string; value: string; isMono?: boolean; highlight?: boolean;
}) {
  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:bg-muted/40 transition-colors">
      <div className="sm:w-2/5 flex items-center gap-2 text-muted-foreground text-sm font-medium">
        <div className="w-4 h-4 opacity-70">{icon}</div>
        {label}
      </div>
      <div className={`sm:w-3/5 ${isMono ? "font-mono text-sm" : "font-medium"} ${highlight ? "text-emerald-600 font-bold text-lg" : "text-foreground"}`}>
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

// --- Interactive Leaflet map for report ---
function ReportInteractiveMap({ lat, lng, feature }: { lat: number; lng: number; feature?: any }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const KADASTRAS_BASE = "https://www.geoportal.lt/mapproxy/rc_kadastro_zemelapis/MapServer";
    const GEOPORTAL_BASE = "https://www.geoportal.lt/mapproxy/gisc_pagrindinis/MapServer";

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 17,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    });

    // Enable scroll zoom only when map is clicked/focused
    map.on("click", () => map.scrollWheelZoom.enable());
    map.on("mouseout", () => map.scrollWheelZoom.disable());

    const buildTileUrl = (baseUrl: string, coords: L.Coords, format: string, transparent: boolean, layers?: string) => {
      const tileSize = 256;
      const nwPoint = coords.scaleBy(new L.Point(tileSize, tileSize));
      const sePoint = nwPoint.add(new L.Point(tileSize, tileSize));
      const nw = map.unproject(nwPoint, coords.z);
      const se = map.unproject(sePoint, coords.z);
      const nwMerc = L.CRS.EPSG3857.project(nw);
      const seMerc = L.CRS.EPSG3857.project(se);
      const bbox = `${nwMerc.x},${seMerc.y},${seMerc.x},${nwMerc.y}`;
      let exportUrl = `${baseUrl}/export?bbox=${bbox}&bboxSR=3857&imageSR=3857&size=${tileSize},${tileSize}&format=${format}&transparent=${transparent}&f=image`;
      if (layers) exportUrl += `&layers=${encodeURIComponent(layers)}`;
      return `${SUPABASE_URL}/functions/v1/map-proxy?url=${encodeURIComponent(exportUrl)}`;
    };

    const baseTile = L.tileLayer("", { tileSize: 256 });
    (baseTile as any).getTileUrl = (coords: L.Coords) => buildTileUrl(GEOPORTAL_BASE, coords, "jpg", false);
    baseTile.addTo(map);

    const kadTile = L.tileLayer("", { tileSize: 256 });
    (kadTile as any).getTileUrl = (coords: L.Coords) => buildTileUrl(KADASTRAS_BASE, coords, "png32", true, "show:15,21,27,33");
    kadTile.addTo(map);

    // Highlight parcel polygon
    if (feature?.geometry) {
      const geoLayer = L.geoJSON(feature, {
        style: {
          color: "#22c55e",
          weight: 3,
          fillColor: "#22c55e",
          fillOpacity: 0.15,
        },
      }).addTo(map);
      map.fitBounds(geoLayer.getBounds(), { padding: [40, 40] });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [lat, lng, feature]);

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden relative z-10">
      <div className="p-3 border-b border-border bg-muted/50 font-semibold text-sm flex items-center gap-2">
        <Map className="w-4 h-4 text-primary" /> Interaktyvus žemėlapis
      </div>
      <div ref={mapContainerRef} className="w-full" style={{ height: "450px" }} />
    </div>
  );
}

function ReportContent({ data, isSample = false, onGoToMap, parcelLat, parcelLng, feature }: { data: ReportData; isSample?: boolean; onGoToMap?: () => void; parcelLat?: number; parcelLng?: number; feature?: any }) {
  const kadastroMapRef = useRef<HTMLDivElement>(null);
  const orthoMapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSample || !parcelLat || !parcelLng) return;

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const KADASTRAS_BASE = "https://www.geoportal.lt/mapproxy/rc_kadastro_zemelapis/MapServer";
    const ORTHO_BASE = "https://www.geoportal.lt/mapproxy/nzt_ort10lt_recent_public/MapServer";
    const GEOPORTAL_BASE = "https://www.geoportal.lt/mapproxy/gisc_pagrindinis/MapServer";

    // Convert lat/lng to EPSG:3857 (Web Mercator)
    const toMerc = (lat: number, lng: number) => {
      const x = lng * 20037508.34 / 180;
      const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180) * 20037508.34 / 180;
      return { x, y };
    };

    const center = toMerc(parcelLat, parcelLng);
    const span = 1000;
    const bbox = `${center.x - span},${center.y - span},${center.x + span},${center.y + span}`;
    const size = "512,512";

    // Kadastro map: base + cadastre overlay
    const baseUrl = `${GEOPORTAL_BASE}/export?bbox=${bbox}&bboxSR=3857&imageSR=3857&size=${size}&format=jpg&transparent=false&f=image`;
    const kadUrl = `${KADASTRAS_BASE}/export?bbox=${bbox}&bboxSR=3857&imageSR=3857&size=${size}&format=png32&transparent=true&f=image&layers=${encodeURIComponent("show:15,21,27,33")}`;
    
    if (kadastroMapRef.current) {
      kadastroMapRef.current.style.backgroundImage = `url(${SUPABASE_URL}/functions/v1/map-proxy?url=${encodeURIComponent(kadUrl)}), url(${SUPABASE_URL}/functions/v1/map-proxy?url=${encodeURIComponent(baseUrl)})`;
      kadastroMapRef.current.style.backgroundSize = "cover";
      kadastroMapRef.current.style.backgroundPosition = "center";
    }

    // Ortho map
    const orthoUrl = `${ORTHO_BASE}/export?bbox=${bbox}&bboxSR=3857&imageSR=3857&size=${size}&format=jpg&transparent=false&f=image`;
    if (orthoMapRef.current) {
      orthoMapRef.current.style.backgroundImage = `url(${SUPABASE_URL}/functions/v1/map-proxy?url=${encodeURIComponent(orthoUrl)})`;
      orthoMapRef.current.style.backgroundSize = "cover";
      orthoMapRef.current.style.backgroundPosition = "center";
    }
  }, [isSample, parcelLat, parcelLng]);

  return (
    <div className={`w-full space-y-6 ${isSample ? "grayscale-[15%]" : ""} relative`}>
      {isSample && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 overflow-hidden">
          <span className="text-5xl md:text-8xl font-black text-foreground/[0.04] rotate-[-25deg] select-none tracking-[0.2em] uppercase whitespace-nowrap">
            PAVYZDYS
          </span>
        </div>
      )}

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


      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        <div
          onClick={!isSample ? onGoToMap : undefined}
          className={`bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-[200px] group ${!isSample && onGoToMap ? "cursor-pointer hover:ring-2 hover:ring-primary transition-all" : ""}`}
        >
          <div className="p-3 border-b border-border bg-muted/50 font-semibold text-sm flex items-center gap-2">
            <Map className="w-4 h-4 text-muted-foreground" /> Kadastro žemėlapis
          </div>
          <div ref={kadastroMapRef} className="flex-1 bg-primary/5 flex items-center justify-center relative">
            {(!parcelLat || !parcelLng || isSample) && (
              <div className="text-center">
                <MapPin className="w-10 h-10 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Sklypo ribos</p>
              </div>
            )}
            {!isSample && onGoToMap && (
              <div className="absolute inset-0 bg-foreground/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-card/90 text-foreground text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow">
                  <ExternalLink className="w-3.5 h-3.5" /> Žiūrėti interaktyviame žemėlapyje
                </span>
              </div>
            )}
          </div>
        </div>
        <div
          onClick={!isSample ? onGoToMap : undefined}
          className={`bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-[200px] group ${!isSample && onGoToMap ? "cursor-pointer hover:ring-2 hover:ring-primary transition-all" : ""}`}
        >
          <div className="p-3 border-b border-border bg-muted/50 font-semibold text-sm flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-muted-foreground" /> Ortofoto vaizdas
          </div>
          <div ref={orthoMapRef} className="flex-1 bg-muted/20 flex items-center justify-center relative">
            {(!parcelLat || !parcelLng || isSample) && (
              <div className="text-center">
                <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-70" />
                <p className="text-sm font-medium text-muted-foreground">Palydovinis vaizdas</p>
              </div>
            )}
            {!isSample && onGoToMap && (
              <div className="absolute inset-0 bg-foreground/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-card/90 text-foreground text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow">
                  <ExternalLink className="w-3.5 h-3.5" /> Žiūrėti interaktyviame žemėlapyje
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        <div className="lg:col-span-2">
          <DataCard title="Pagrindinė informacija" icon={<Info className="w-5 h-5 text-primary" />}>
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

        <DataCard title="Mokestinė ir vertės informacija" icon={<Euro className="w-5 h-5 text-emerald-500" />}>
          <DataRow icon={<Euro />} label="Vidutinė rinkos vertė" value={data.vidutineRinkosVerte} highlight />
          <DataRow icon={<Calendar />} label="Vertinimo data" value={data.vertinimoData} />
          <div className="p-4 bg-muted/30 text-xs text-muted-foreground">
            * Vidutinė rinkos vertė yra apskaičiuota masinio vertinimo būdu ir gali skirtis nuo realios komercinės vertės.
          </div>
        </DataCard>

        <DataCard title="Matavimai ir apribojimai" icon={<Ruler className="w-5 h-5 text-amber-500" />}>
          <DataRow icon={<Ruler />} label="Matavimų tipas" value={data.matavimuTipas} />
          <DataRow icon={<Shield />} label="Našumo balas" value={data.nasumoBalas} />
          <DataRow icon={<AlertTriangle />} label="Specialiosios sąlygos" value={data.specialiosiosSalygos} />
        </DataCard>
      </div>

      {/* Interactive Leaflet Map at bottom */}
      {!isSample && parcelLat && parcelLng && (
        <ReportInteractiveMap lat={parcelLat} lng={parcelLng} feature={feature} />
      )}
    </div>
  );
}

// --- INLINE AUTH FORM ---
function InlineAuthForm({ onSuccess }: { onSuccess: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Sėkmingai prisijungėte!");
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Registracija sėkminga!");
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-bold text-foreground">
          {isLogin ? "Prisijunkite" : "Sukurkite paskyrą"}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {isLogin ? "Prisijunkite, kad galėtumėte atrakinti ataskaitą" : "Registruokitės ir gaukite prieigą"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">El. paštas</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:ring-2 focus:ring-primary/40 outline-none"
              placeholder="jusu@pastas.lt"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Slaptažodis</label>
          <div className="relative">
            <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm focus:ring-2 focus:ring-primary/40 outline-none"
              placeholder="••••••••"
            />
          </div>
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full premium-gradient text-primary-foreground font-semibold rounded-lg py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isLogin ? "Prisijungti" : "Registruotis"}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Neturite paskyros?" : "Jau turite paskyrą?"}{" "}
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
            {isLogin ? "Registruotis" : "Prisijungti"}
          </button>
        </p>
      </form>
    </div>
  );
}

// --- INLINE PRICING ---
function InlinePricing({ parcel }: { parcel?: ParcelFromRoute | null }) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleBuy = async (tierId: string) => {
    setLoadingTier(tierId);
    try {
      // Save parcel to localStorage before redirecting to Stripe
      if (parcel) {
        localStorage.setItem("pendingParcel", JSON.stringify(parcel));
      }
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { tier: tierId } });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Klaida kuriant mokėjimą");
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-bold text-foreground">Įsigykite kreditų</h3>
        <p className="text-sm text-muted-foreground mt-1">1 ataskaita = 1 kreditas</p>
      </div>
      <div className="space-y-3">
        {PRICING_TIERS.map((tier) => {
          const Icon = tier.icon;
          return (
            <button
              key={tier.id}
              onClick={() => handleBuy(tier.id)}
              disabled={loadingTier !== null}
              className={`relative w-full text-left rounded-xl border p-4 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-60 ${
                tier.popular
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-md"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Populiariausias
                </span>
              )}
              {tier.save && (
                <span className="absolute -top-2.5 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full premium-gradient text-primary-foreground">
                  Sutaupyk {tier.save}
                </span>
              )}
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                  tier.popular ? "premium-gradient" : "bg-muted"
                }`}>
                  <Icon className={`h-5 w-5 ${tier.popular ? "text-primary-foreground" : "text-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{tier.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {tier.credits} {tier.credits === 1 ? "paieška" : "paieškų"} · {tier.perSearch}/paieška
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {loadingTier === tier.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <p className="font-bold text-foreground text-xl">{tier.price}</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-primary" />
        <span>Saugus mokėjimas per Stripe</span>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
interface Report1Props {
  parcel?: ParcelFromRoute;
  onGoToMap?: () => void;
  feature?: any;
}

export default function Report1({ parcel: parcelProp, onGoToMap, feature }: Report1Props) {
  const navigate = useNavigate();
  const { user, credits, refreshCredits, signOut } = useAuth();

  const parcel = parcelProp || null;

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  // Build report data from real parcel
  const realReportData: ReportData | null = parcel ? parcelToReportData(parcel) : null;
  const displayCadastralNr = parcel?.cadastralNumber || "—";

  const handleUnlock = async () => {
    if (!user || !parcel) return;
    setIsUnlocking(true);
    try {
      const { data, error } = await supabase.rpc("unlock_parcel", {
        p_user_id: user.id,
        p_cadastral_number: parcel.cadastralNumber,
      });
      if (error) throw error;
      const result = typeof data === "string" ? JSON.parse(data) : data;
      if (result?.status === "insufficient_credits") {
        toast.error("Neturite paieškos kreditų");
        return;
      }
      if (result?.status === "error") {
        toast.error("Nepavyko apdoroti užklausos");
        return;
      }
      if (result?.status === "already_unlocked") {
        toast.info("Šis sklypas jau atrakintas – kreditas nenurašytas");
      }
      await refreshCredits();
      setIsUnlocked(true);
    } catch (err: any) {
      toast.error(err.message || "Klaida");
    } finally {
      setIsUnlocking(false);
    }
  };

  const scrollToCta = () => {
    ctaRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // No parcel data - redirect home
  if (!parcel) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-4">
        <p className="text-muted-foreground">Nėra paieškos duomenų.</p>
        <button onClick={onGoToMap || (() => navigate("/"))} className="flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Grįžti į žemėlapį
        </button>
      </div>
    );
  }

  // UNLOCKED STATE
  if (isUnlocked && realReportData) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={onGoToMap || (() => navigate("/"))} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <Layers className="h-5 w-5 text-primary" />
              <span className="font-display font-bold text-foreground">Žemė<span className="text-gradient">Pro</span></span>
            </button>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">{credits}</span>
              </div>
              <button onClick={signOut} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Atsijungti">
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto p-4 mt-4">
          <ReportContent data={realReportData} onGoToMap={onGoToMap} parcelLat={parcel.lat} parcelLng={parcel.lng} feature={feature} />
        </div>
      </div>
    );
  }

  // LOCKED STATE
  const needsAuth = !user;
  const needsCredits = user && credits <= 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onGoToMap || (() => navigate("/"))} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <Layers className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-foreground">Žemė<span className="text-gradient">Pro</span></span>
          </button>
          {user && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">{credits}</span>
              </div>
              <button onClick={signOut} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Atsijungti">
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-8">
        {/* Top: Found banner + CTA */}
        <div ref={ctaRef} className="space-y-6">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 text-center space-y-3">
            <div className="flex justify-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">Žemės sklypas rastas!</h2>
            <p className="text-emerald-700 dark:text-emerald-300 font-medium">
              Įrašas rastas Nekilnojamojo turto registre pagal kadastrą: <span className="font-bold">{displayCadastralNr}</span>
            </p>
          </div>

          {/* CTA card */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border bg-muted/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" />
                Ataskaitos peržiūra
              </h3>
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Patikrinti duomenys
              </span>
            </div>

            {/* Blurred teaser */}
            <div className="relative">
              <div className="filter blur-[6px] opacity-50 select-none pointer-events-none p-4 space-y-3">
                <div className="h-24 bg-muted rounded-lg w-full" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-8 bg-muted/60 rounded" />
                  <div className="h-8 bg-muted/60 rounded" />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/80 to-card" />
            </div>

            {/* CTA content - not absolute, flows naturally */}
            <div className="px-6 pb-8 pt-2 flex flex-col items-center text-center">
              <Lock className="w-8 h-8 text-muted-foreground mb-3" />
              <h4 className="text-lg font-bold text-foreground mb-2">Atrakinti pilną sklypo ataskaitą</h4>
              <ul className="text-sm text-muted-foreground mb-5 space-y-1.5 text-left inline-block">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Tikslūs interaktyvaus žemėlapio kontūrai</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Registruota žemės paskirtis ir plotas</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Tikslus adresas ir koordinatės</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Unikalus turto numeris</li>
              </ul>

              {/* Conditional: Auth, Pricing, or Unlock */}
              {needsAuth ? (
                <div className="w-full max-w-md">
                  <InlineAuthForm onSuccess={() => {}} />
                </div>
              ) : needsCredits ? (
                <div className="w-full max-w-md">
                  <InlinePricing />
                </div>
              ) : (
                <>
                  <button
                    onClick={handleUnlock}
                    disabled={isUnlocking}
                    className="w-full max-w-md bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isUnlocking ? (
                      <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Unlock className="w-5 h-5" />
                        Atrakinti ataskaitą (1 kreditas)
                      </>
                    )}
                  </button>
                  <p className="text-xs text-muted-foreground mt-3">Jums liko {credits} {credits === 1 ? "kreditas" : "kreditų"}.</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">👇 Žiūrėkite, ką gausite pilnoje ataskaitoje 👇</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Sample Report */}
        <div className="bg-muted/30 border-2 border-dashed border-border rounded-2xl p-6 relative">
          <div className="absolute top-4 right-4 z-20">
            <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
              Pavyzdinė ataskaita
            </span>
          </div>
          <ReportContent data={SAMPLE_REPORT_DATA} isSample />
          <div className="mt-6 text-center">
            <button
              onClick={scrollToCta}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-8 rounded-xl shadow-lg transition-all inline-flex items-center gap-2"
            >
              <Unlock className="w-5 h-5" />
              Atrakinti savo tikrą ataskaitą
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
