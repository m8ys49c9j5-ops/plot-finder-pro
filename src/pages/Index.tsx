import { useState, useCallback, useRef } from "react";
import SearchBar from "@/components/SearchBar";
import MapView, { type MapViewHandle, type MapLayerType } from "@/components/MapView";
import ParcelSidebar, { type ParcelData } from "@/components/ParcelSidebar";
import { Layers, RefreshCw, Map, Satellite } from "lucide-react";


const Index = () => {
  const [selectedParcel, setSelectedParcel] = useState<ParcelData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [lastSearchInput, setLastSearchInput] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeLayer, setActiveLayer] = useState<MapLayerType>("standard");
  const mapViewRef = useRef<MapViewHandle>(null);

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

  const handleParcelSelect = useCallback((parcel: ParcelData) => {
    setSelectedParcel(parcel);
  }, []);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    let lastId = "";
    let totalSynced = 0;

    try {
      while (true) {
        setSyncStatus(`Sinchronizuojama... (${totalSynced} įrašų)`);

        const params = lastId ? `?last_id=${lastId}` : "";
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-parcels${params}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: "{}",
          }
        );

        const result = await res.json();
        if (!res.ok || result.error) {
          setSyncStatus(`Klaida: ${result.error}`);
          break;
        }

        totalSynced += result.synced ?? 0;

        if (result.done) {
          setSyncStatus(`✓ Sinchronizuota ${totalSynced} įrašų`);
          break;
        }

        lastId = result.lastId;
      }
    } catch (e: any) {
      setSyncStatus(`Klaida: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-background">
      {/* Full-screen map */}
      <MapView
        ref={mapViewRef}
        onParcelSelect={handleParcelSelect}
        searchQuery={searchQuery}
        onSearchComplete={handleSearchComplete}
      />

      {/* Map layer toggle - top left */}
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

      {/* Top overlay - Logo + Search */}
      <div className="absolute top-0 left-0 right-0 z-[900] pointer-events-none">
        <div className="flex flex-col items-center pt-4 px-4 gap-3">
          {/* Logo */}
          <div className="pointer-events-auto glass-panel rounded-xl px-4 py-2 flex items-center gap-2 shadow-lg">
            <Layers className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-foreground text-lg">
              Žemė<span className="text-gradient">Pro</span>
            </span>
          </div>

          {/* Search */}
          <div className="pointer-events-auto w-full max-w-xl">
            <SearchBar onSearch={handleSearch} isLoading={isSearching} />
          </div>
        </div>
      </div>

      {/* Attribution + Sync button corner */}
      <div className="absolute bottom-2 left-2 z-[800] flex flex-col gap-1">
        <div className="glass-panel rounded-lg px-2 py-1 text-[10px] text-muted-foreground">
          Duomenys: Geoportal.lt · RC Kadastras
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="glass-panel rounded-lg px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
          {syncStatus ?? "Sinchronizuoti DB"}
        </button>
      </div>

      {/* Parcel sidebar */}
      <ParcelSidebar parcel={selectedParcel} onClose={() => setSelectedParcel(null)} searchInput={lastSearchInput} />

      {/* Overlay backdrop when sidebar is open */}
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
