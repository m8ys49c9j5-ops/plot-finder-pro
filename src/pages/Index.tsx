import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import MapView, { type MapViewHandle, type MapLayerType, type OverlayLayerType } from "@/components/MapView";
import ParcelSidebar, { type ParcelData } from "@/components/ParcelSidebar";
import PricingModal from "@/components/PricingModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/sessionId";
import {
  Layers,
  Map,
  Satellite,
  User,
  LogOut,
  Coins,
  Trees,
  Droplets,
  ShieldAlert,
  Zap,
  LayoutGrid,
  History,
} from "lucide-react";
import { toast } from "sonner";

const OVERLAY_BUTTONS: { key: OverlayLayerType; label: string; Icon: React.ElementType }[] = [
  { key: "parcels", label: "Sklypai", Icon: LayoutGrid },
  { key: "forest", label: "Miškai", Icon: Trees },
  { key: "melior", label: "Melioracija", Icon: Droplets },
  { key: "szns", label: "SZNS", Icon: ShieldAlert },
  { key: "energy", label: "Tinklai", Icon: Zap },
];

const Index = () => {
  const [selectedParcel, setSelectedParcel] = useState<ParcelData | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [lastSearchInput, setLastSearchInput] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeLayer, setActiveLayer] = useState<MapLayerType>("standard");
  const [activeOverlays, setActiveOverlays] = useState<Record<OverlayLayerType, boolean>>({
    parcels: true,
    forest: false,
    melior: false,
    szns: false,
    energy: false,
  });
  const [pricingOpen, setPricingOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const mapViewRef = useRef<MapViewHandle>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, credits, loading, signOut, refreshCredits } = useAuth();

  // Close account dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-search from ?q= parameter (e.g. from Landing page)
  const qParam = searchParams.get("q");
  useEffect(() => {
    if (qParam) {
      handleSearch(qParam);
      window.history.replaceState({}, "", "/map");
    }
  }, [qParam]);

  // Recover parcel + feature from localStorage after Stripe redirect
  useEffect(() => {
    if (searchParams.get("payment") === "success") {
      toast.success("Mokėjimas sėkmingas! Kreditai pridėti.");
      refreshCredits();

      const stored = localStorage.getItem("pendingParcel");
      if (stored) {
        try {
          const parcel = JSON.parse(stored);
          setSelectedParcel(parcel);
        } catch {}
      }
      const storedFeature = localStorage.getItem("pendingFeature");
      if (storedFeature) {
        try {
          setSelectedFeature(JSON.parse(storedFeature));
        } catch {}
      }
      window.history.replaceState({}, "", "/map");
    }
  }, [searchParams, refreshCredits]);

  const toggleLayer = useCallback(() => {
    const next: MapLayerType = activeLayer === "standard" ? "ortho" : "standard";
    setActiveLayer(next);
    mapViewRef.current?.setLayerType(next);
  }, [activeLayer]);

  const handleToggleOverlay = useCallback((key: OverlayLayerType) => {
    const newState = mapViewRef.current?.toggleOverlay(key);
    if (typeof newState === "boolean") {
      setActiveOverlays((prev) => ({ ...prev, [key]: newState }));
    }
  }, []);

  const handleSearch = useCallback((query: string) => {
    setIsSearching(true);
    setSearchQuery(query);
    setLastSearchInput(query);
  }, []);

  const handleSearchComplete = useCallback(() => {
    setIsSearching(false);
    setSearchQuery(null);
  }, []);

  const handleParcelSelect = useCallback((parcel: ParcelData, feature?: any) => {
    setSelectedParcel(parcel);
    if (feature) setSelectedFeature(feature);
  }, []);

  const handleLogSearch = useCallback(async (params: {
    cadastralNumber: string;
    address?: string;
    lat?: number;
    lng?: number;
    searchMethod: string;
  }) => {
    const sessionId = getSessionId();
    await supabase.rpc("log_search", {
      p_user_id: user?.id ?? null,
      p_cadastral_number: params.cadastralNumber,
      p_address: params.address ?? null,
      p_lat: params.lat ?? null,
      p_lng: params.lng ?? null,
      p_is_unlocked: false,
      p_search_method: params.searchMethod,
      p_is_anonymous: !user,
      p_session_id: sessionId,
    });
  }, [user]);

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-background">
      <MapView
        ref={mapViewRef}
        onParcelSelect={handleParcelSelect}
        searchQuery={searchQuery}
        onSearchComplete={handleSearchComplete}
        initialFeature={selectedFeature}
        onLogSearch={handleLogSearch}
      />

      {/* Map layer & overlay toggles */}
      <div className="absolute top-4 left-4 z-[900] flex flex-col gap-1.5">
        {/* Ortofoto toggle */}
        <button
          onClick={toggleLayer}
          className="glass-panel rounded-xl p-2.5 shadow-lg hover:bg-muted/60 transition-colors flex items-center gap-2"
          title={activeLayer === "standard" ? "Rodyti ortofoto" : "Rodyti žemėlapį"}
        >
          {activeLayer === "standard" ? (
            <Satellite className="h-5 w-5 text-foreground" />
          ) : (
            <Map className="h-5 w-5 text-foreground" />
          )}
          <span className="text-xs font-medium text-foreground hidden sm:inline">
            {activeLayer === "standard" ? "Ortofoto" : "Žemėlapis"}
          </span>
        </button>

        {/* Overlay toggle buttons */}
        {OVERLAY_BUTTONS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => handleToggleOverlay(key)}
            title={label}
            className={`glass-panel rounded-xl p-2.5 shadow-lg transition-colors flex items-center gap-2 ${
              activeOverlays[key]
                ? "bg-primary/15 ring-1 ring-primary/40 hover:bg-primary/25"
                : "hover:bg-muted/60"
            }`}
          >
            <Icon className={`h-4 w-4 ${activeOverlays[key] ? "text-primary" : "text-foreground"}`} />
            <span
              className={`text-xs font-medium hidden sm:inline ${
                activeOverlays[key] ? "text-primary" : "text-foreground"
              }`}
            >
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Top overlay */}
      <div className="absolute top-0 left-0 right-0 z-[900] pointer-events-none">
        <div className="flex flex-col items-center pt-4 px-4 gap-3">
          <div className="pointer-events-auto flex items-center gap-2">
            <Link to="/" className="glass-panel rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg hover:bg-muted/60 transition-colors no-underline">
              <Layers className="h-5 w-5 text-primary" />
              <span className="font-display font-bold text-foreground text-lg">
                Žemė<span className="text-gradient">Pro</span>
              </span>
            </Link>

            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-1.5" ref={accountMenuRef}>
                    <button
                      onClick={() => setPricingOpen(true)}
                      className="glass-panel rounded-xl px-3 py-2 flex items-center gap-1.5 shadow-lg hover:bg-muted/60 transition-colors"
                    >
                      <Coins className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">{credits}</span>
                    </button>
                    <button
                      onClick={() => setAccountMenuOpen((v) => !v)}
                      className="glass-panel rounded-xl p-2 shadow-lg hover:bg-muted/60 transition-colors"
                      title="Paskyra"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {accountMenuOpen && (
                      <div className="absolute top-full right-0 mt-2 glass-panel rounded-xl shadow-xl overflow-hidden min-w-[180px] z-[1000]">
                        <button
                          onClick={() => { setAccountMenuOpen(false); navigate("/history"); }}
                          className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted/60 flex items-center gap-2"
                        >
                          <History className="h-4 w-4" />
                          Mano Paieškos
                        </button>
                        <div className="border-t border-border" />
                        <button
                          onClick={() => { setAccountMenuOpen(false); signOut(); }}
                          className="w-full text-left px-4 py-3 text-sm text-muted-foreground hover:bg-muted/60 flex items-center gap-2"
                        >
                          <LogOut className="h-4 w-4" />
                          Atsijungti
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => navigate("/login", { state: { from: "/map" + window.location.search } })}
                    className="glass-panel rounded-xl px-3 py-2 flex items-center gap-1.5 shadow-lg hover:bg-muted/60 transition-colors"
                  >
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-foreground">Prisijungti</span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="pointer-events-auto w-full max-w-xl">
            <SearchBar onSearch={handleSearch} isLoading={isSearching} />
          </div>
        </div>
      </div>

      {/* Attribution */}
      <div className="absolute bottom-2 left-2 z-[800]">
        <div className="glass-panel rounded-lg px-2 py-1 text-[10px] text-muted-foreground">
          Duomenys: Geoportal.lt · RC Kadastras
        </div>
      </div>

      <ParcelSidebar
        parcel={selectedParcel}
        onClose={() => setSelectedParcel(null)}
        searchInput={lastSearchInput}
      />

      {selectedParcel && (
        <div
          className="fixed inset-0 bg-foreground/20 z-[999] sm:hidden animate-fade-in"
          onClick={() => setSelectedParcel(null)}
        />
      )}

      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </div>
  );
};

export default Index;
