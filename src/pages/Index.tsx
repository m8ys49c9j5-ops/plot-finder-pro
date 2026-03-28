import { useState, useCallback, useRef, useEffect } from "react";
import { Mail, ChevronRight } from "lucide-react";
import FeedbackPopup from "@/components/FeedbackPopup";
import SznsModal from "@/components/SznsModal";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import { fetchSznsForPolygon, type SznsZone, type SznsPolygonResult } from "@/lib/sznsPolygonSampling";
import MapView, { type MapViewHandle, type MapLayerType, type OverlayLayerType } from "@/components/MapView";
import ParcelSidebar, { type ParcelData } from "@/components/ParcelSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/sessionId";
import { Layers, Map, Satellite, User, Trees, Droplets, ShieldAlert, Zap, LayoutGrid, FileText } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const OVERLAY_BUTTONS: { key: OverlayLayerType; label: string; Icon: React.ElementType }[] = [
  { key: "parcels", label: "Sklypai", Icon: LayoutGrid },
  { key: "forest", label: "Miškai", Icon: Trees },
  { key: "melior", label: "Melioracija", Icon: Droplets },
  { key: "energy", label: "Tinklai", Icon: Zap },
  // { key: "szns", label: "Specialiosios sąlygos", Icon: ShieldAlert }, // SZNS — disabled until feature is live
];

const Index = () => {
  const [selectedParcel, setSelectedParcel] = useState<ParcelData | null>(null);
  const [lastParcel, setLastParcel] = useState<ParcelData | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [lastSearchInput, setLastSearchInput] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeLayer, setActiveLayer] = useState<MapLayerType>("standard");
  const [activeOverlays, setActiveOverlays] = useState<Record<OverlayLayerType, boolean>>({
    parcels: false,
    forest: false,
    melior: false,
    energy: false,
    szns: false,
    szns_infra: false,
    szns_transport: false,
    szns_culture: false,
    szns_sanitary: false,
    szns_nature: false,
    szns_defense: false,
  });
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // SZNS modal state
  const [sznsModalOpen, setSznsModalOpen] = useState(false);
  const [sznsResults, setSznsResults] = useState<SznsZone[] | null>(null);
  const [sznsLoading, setSznsLoading] = useState(false);
  const [sznsFailed, setSznsFailed] = useState(false);
  const [sznsPointsQueried, setSznsPointsQueried] = useState(0);
  const sznsRequestIdRef = useRef(0);

  const mapViewRef = useRef<MapViewHandle>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, refreshCredits } = useAuth();

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
        localStorage.removeItem("pendingParcel");
      }
      const storedFeature = localStorage.getItem("pendingFeature");
      if (storedFeature) {
        try {
          setSelectedFeature(JSON.parse(storedFeature));
        } catch {}
        localStorage.removeItem("pendingFeature");
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

  const handleSznsClick = useCallback(async () => {
    // Must have a selected parcel with valid geometry
    const geom = selectedFeature?.geometry;
    if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) {
      // No valid geometry — just toggle the overlay layer
      handleToggleOverlay("szns");
      return;
    }

    const requestId = ++sznsRequestIdRef.current;
    setSznsModalOpen(true);
    setSznsLoading(true);
    setSznsResults(null);
    setSznsFailed(false);
    setSznsPointsQueried(0);

    try {
      const abortSignal = { cancelled: false };
      // Cancel on unmount / new request
      const result: SznsPolygonResult = await fetchSznsForPolygon(geom, abortSignal);

      // Race condition guard
      if (requestId !== sznsRequestIdRef.current) return;

      setSznsResults(result.zones);
      setSznsFailed(result.failed);
      setSznsPointsQueried(result.pointsQueried);
    } catch (e) {
      if (requestId !== sznsRequestIdRef.current) return;
      console.error("SZNS polygon query error:", e);
      toast.error("SŽNS užklausa nepavyko");
      setSznsResults([]);
      setSznsFailed(true);
    } finally {
      if (requestId === sznsRequestIdRef.current) {
        setSznsLoading(false);
      }
    }
  }, [selectedFeature, handleToggleOverlay]);

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
    setLastParcel(parcel);
    if (feature) setSelectedFeature(feature);
  }, []);

  const handleLogSearch = useCallback(
    async (params: { cadastralNumber: string; address?: string; lat?: number; lng?: number; searchMethod: string }) => {
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
    },
    [user],
  );

  return (
    <div className="h-[100dvh] w-full relative overflow-hidden overscroll-none bg-background">
      <MapView
        ref={mapViewRef}
        onParcelSelect={handleParcelSelect}
        searchQuery={searchQuery}
        onSearchComplete={handleSearchComplete}
        initialFeature={selectedFeature}
        onLogSearch={handleLogSearch}
      />

      {/* Top bar — logo, account, search, then layer buttons on mobile */}
      <div className="absolute top-0 left-0 right-0 z-[900] pointer-events-none">
        <div className="flex flex-col items-center pt-2 sm:pt-4 px-3 sm:px-4 gap-1.5 sm:gap-3">
          <div className="pointer-events-auto flex items-center gap-2">
            <Link
              to="/"
              className="glass-panel rounded-xl px-3 sm:px-4 py-2 flex items-center gap-2 shadow-lg hover:bg-muted/60 transition-colors no-underline"
            >
              <Layers className="h-5 w-5 text-primary" />
              <span className="font-display font-bold text-foreground text-sm sm:text-lg">
                Žemė<span className="text-gradient">Pro</span>
              </span>
            </Link>

            {!loading && (
              <>
                {user ? (
                  <button
                    onClick={() => navigate("/account")}
                    className="glass-panel rounded-xl px-3 py-2 flex items-center gap-1.5 shadow-lg hover:bg-muted/60 transition-colors"
                    title="Paskyra ir istorija"
                  >
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-foreground hidden sm:inline">Paskyra</span>
                  </button>
                ) : (
                  <button
                    onClick={() => navigate("/login", { state: { from: "/map" + window.location.search } })}
                    className="glass-panel rounded-xl px-3 py-2 flex items-center gap-1.5 shadow-lg hover:bg-muted/60 transition-colors"
                  >
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-foreground hidden sm:inline">Prisijungti</span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="pointer-events-auto w-full max-w-xl px-0 sm:px-0">
            <SearchBar onSearch={handleSearch} isLoading={isSearching} />
          </div>
        </div>
      </div>

      {/* Layer buttons — always visible, vertical stack on left side */}
      <div className="absolute top-40 sm:top-4 left-2 sm:left-4 z-[900] flex flex-col gap-1.5">
        <button
          onClick={toggleLayer}
          className="glass-panel rounded-xl p-2 sm:p-2.5 shadow-lg hover:bg-muted/60 transition-colors flex items-center gap-2"
          title={activeLayer === "standard" ? "Rodyti ortofoto" : "Rodyti žemėlapį"}
        >
          {activeLayer === "standard" ? (
            <Satellite className="h-4 sm:h-5 w-4 sm:w-5 text-foreground" />
          ) : (
            <Map className="h-4 sm:h-5 w-4 sm:w-5 text-foreground" />
          )}
          <span className="text-xs font-medium text-foreground hidden sm:inline">
            {activeLayer === "standard" ? "Ortofoto" : "Žemėlapis"}
          </span>
        </button>

        {OVERLAY_BUTTONS.map(({ key, label, Icon }) => {
          const isActive = key === "szns" ? activeOverlays.szns : activeOverlays[key];
          const onClick = key === "szns" ? handleSznsClick : () => handleToggleOverlay(key);
          return (
            <button
              key={key}
              onClick={onClick}
              title={label}
              className={`glass-panel rounded-xl p-2 sm:p-2.5 shadow-lg transition-colors flex items-center gap-2 ${
                isActive ? "bg-primary/15 ring-1 ring-primary/40 hover:bg-primary/25" : "hover:bg-muted/60"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-foreground"}`} />
              <span className={`text-xs font-medium hidden sm:inline ${isActive ? "text-primary" : "text-foreground"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Social + mail icons & Attribution */}
      <div className="absolute bottom-2 left-2 z-[800] flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <a
            href="https://www.instagram.com/zemepro"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-panel h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Instagram"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </a>
          <a
            href="https://www.facebook.com/people/%C5%BDem%C4%97-Pro/61579558936148/"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-panel h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Facebook"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
          <a
            href="https://www.tiktok.com/@empro229?_r=1&_t=ZN-94u5dcQmID8"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-panel h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="TikTok"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
            </svg>
          </a>
          <button
            onClick={() => setFeedbackOpen((v) => !v)}
            className="glass-panel h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Rašykite mums"
          >
            <Mail className="h-4 w-4" />
          </button>
        </div>
        <div className="glass-panel rounded-lg px-2 py-1 text-[10px] text-muted-foreground">
          ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            OpenStreetMap
          </a>{" "}
          ·{" "}
          <a href="https://www.geoportal.lt" target="_blank" rel="noopener noreferrer" className="hover:underline">
            Geoportal.lt
          </a>{" "}
          · Registrų centras · NŽT
        </div>
      </div>

      <FeedbackPopup open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      {/* SZNS Modal — disabled until feature is live */}
      {/* <SznsModal
        open={sznsModalOpen}
        onClose={() => setSznsModalOpen(false)}
        zones={sznsResults}
        loading={sznsLoading}
        failed={sznsFailed}
        pointsQueried={sznsPointsQueried}
      /> */}

      {/* Floating button to reopen parcel sidebar */}
      {!selectedParcel && lastParcel && (
        <button
          onClick={() => setSelectedParcel(lastParcel)}
          className="fixed right-4 z-[900] glass-panel rounded-full h-11 w-11 shadow-lg hover:bg-muted/60 transition-colors flex items-center justify-center bottom-[calc(1rem+7rem)]"
          title="Rodyti sklypo informaciją"
        >
          <FileText className="h-5 w-5 text-primary" />
        </button>
      )}

      <ParcelSidebar parcel={selectedParcel} onClose={() => setSelectedParcel(null)} searchInput={lastSearchInput} />

      {selectedParcel && (
        <div
          className="fixed inset-0 bg-foreground/20 z-[999] sm:hidden animate-fade-in"
          onClick={() => setSelectedParcel(null)}
        />
      )}
    </div>
  );
};

export default Index;
