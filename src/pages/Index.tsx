import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import MapView, { type MapViewHandle, type MapLayerType } from "@/components/MapView";
import ParcelSidebar, { type ParcelData } from "@/components/ParcelSidebar";
import PricingModal from "@/components/PricingModal";
import Report1 from "@/pages/Report1";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Layers, Map, Satellite, User, LogOut, Coins } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [selectedParcel, setSelectedParcel] = useState<ParcelData | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [activeView, setActiveView] = useState<"map" | "report">("map");
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [lastSearchInput, setLastSearchInput] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeLayer, setActiveLayer] = useState<MapLayerType>("standard");
  const [pricingOpen, setPricingOpen] = useState(false);
  const [parcelUnlocked, setParcelUnlocked] = useState(false);
  const mapViewRef = useRef<MapViewHandle>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, credits, loading, signOut, refreshCredits } = useAuth();

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
          setActiveView("report");
        } catch {}
      }
      const storedFeature = localStorage.getItem("pendingFeature");
      if (storedFeature) {
        try {
          setSelectedFeature(JSON.parse(storedFeature));
        } catch {}
      }
      window.history.replaceState({}, "", "/");
    }
  }, [searchParams, refreshCredits]);

  const toggleLayer = useCallback(() => {
    const next: MapLayerType = activeLayer === "standard" ? "ortho" : "standard";
    setActiveLayer(next);
    mapViewRef.current?.setLayerType(next);
  }, [activeLayer]);

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
    setActiveView("report");
  }, []);

  const handleGoToMap = useCallback((shouldHighlight = true) => {
    setActiveView("map");
    if (shouldHighlight && selectedParcel && mapViewRef.current) {
      setTimeout(() => {
        if (selectedFeature) {
          mapViewRef.current?.highlightAndFit(selectedFeature);
        }
      }, 100);
    }
  }, [selectedParcel, selectedFeature]);

  const handleGoToReport = useCallback(() => {
    setActiveView("report");
  }, []);

  // Report view
  if (activeView === "report" && selectedParcel) {
    return (
      <Report1
        parcel={selectedParcel}
        onGoToMap={handleGoToMap}
        feature={selectedFeature}
      />
    );
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-background">
      <MapView
        ref={mapViewRef}
        onParcelSelect={handleParcelSelect}
        searchQuery={searchQuery}
        onSearchComplete={handleSearchComplete}
        initialFeature={selectedFeature}
      />

      {/* Map layer toggle */}
      <div className="absolute top-4 left-4 z-[900]">
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
      </div>

      {/* Top overlay */}
      <div className="absolute top-0 left-0 right-0 z-[900] pointer-events-none">
        <div className="flex flex-col items-center pt-4 px-4 gap-3">
          <div className="pointer-events-auto flex items-center gap-2">
            <div className="glass-panel rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg">
              <Layers className="h-5 w-5 text-primary" />
              <span className="font-display font-bold text-foreground text-lg">
                Žemė<span className="text-gradient">Pro</span>
              </span>
            </div>

            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPricingOpen(true)}
                      className="glass-panel rounded-xl px-3 py-2 flex items-center gap-1.5 shadow-lg hover:bg-muted/60 transition-colors"
                    >
                      <Coins className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">{credits}</span>
                    </button>
                    <button
                      onClick={signOut}
                      className="glass-panel rounded-xl p-2 shadow-lg hover:bg-muted/60 transition-colors"
                      title="Atsijungti"
                    >
                      <LogOut className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate("/auth")}
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

      {/* Parcel sidebar on map */}
      <ParcelSidebar
        parcel={selectedParcel}
        onClose={() => setSelectedParcel(null)}
        searchInput={lastSearchInput}
        onGoToReport={selectedParcel ? handleGoToReport : undefined}
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
