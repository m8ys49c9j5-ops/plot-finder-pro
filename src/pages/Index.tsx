import { useState, useCallback } from "react";
import SearchBar from "@/components/SearchBar";
import MapView from "@/components/MapView";
import ParcelSidebar, { type ParcelData } from "@/components/ParcelSidebar";
import { Layers } from "lucide-react";

const Index = () => {
  const [selectedParcel, setSelectedParcel] = useState<ParcelData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback((query: string) => {
    setIsSearching(true);
    setSearchQuery(query);
  }, []);

  const handleSearchComplete = useCallback(() => {
    setIsSearching(false);
    setSearchQuery(null);
  }, []);

  const handleParcelSelect = useCallback((parcel: ParcelData) => {
    setSelectedParcel(parcel);
  }, []);

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-background">
      {/* Full-screen map */}
      <MapView
        onParcelSelect={handleParcelSelect}
        searchQuery={searchQuery}
        onSearchComplete={handleSearchComplete}
      />

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

      {/* Attribution corner */}
      <div className="absolute bottom-2 left-2 z-[800]">
        <div className="glass-panel rounded-lg px-2 py-1 text-[10px] text-muted-foreground">
          Duomenys: Geoportal.lt · RC Kadastras
        </div>
      </div>

      {/* Parcel sidebar */}
      <ParcelSidebar parcel={selectedParcel} onClose={() => setSelectedParcel(null)} />

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
