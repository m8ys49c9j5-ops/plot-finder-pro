import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { ParcelData } from "./ParcelSidebar";

export type MapLayerType = "standard" | "ortho";

export interface MapViewHandle {
  setLayerType: (type: MapLayerType) => void;
}

interface MapViewProps {
  onParcelSelect: (parcel: ParcelData) => void;
  searchQuery: string | null;
  onSearchComplete: () => void;
}

const GEOPORTAL_BASE = "https://www.geoportal.lt/mapproxy/gisc_pagrindinis/MapServer";
const KADASTRAS_BASE = "https://www.geoportal.lt/mapproxy/rc_kadastro_zemelapis/MapServer";
const ORTHO_BASE = "https://www.geoportal.lt/mapproxy/nzt_ort10lt_recent_public/MapServer";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const buildExportProxyUrl = (
  baseUrl: string,
  coords: L.Coords,
  map: L.Map,
  format: "jpg" | "png32",
  transparent = false,
  layers?: string,
) => {
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

const OrthoTileLayer = L.TileLayer.extend({
  getTileUrl: function (coords: L.Coords) {
    return buildExportProxyUrl(ORTHO_BASE, coords, (this as any)._map as L.Map, "jpg", false);
  },
});

const KadastroTileLayer = L.TileLayer.extend({
  getTileUrl: function (coords: L.Coords) {
    return buildExportProxyUrl(KADASTRAS_BASE, coords, (this as any)._map as L.Map, "png32", true, "show:15,21,27,33");
  },
});

const MapView = forwardRef<MapViewHandle, MapViewProps>(({ onParcelSelect, searchQuery, onSearchComplete }, ref) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightLayerRef = useRef<L.GeoJSON | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const baseTileRef = useRef<L.TileLayer | null>(null);
  const geoportalTileRef = useRef<L.TileLayer | null>(null);
  const orthoLayerRef = useRef<L.TileLayer | null>(null);
  const kadastroLayerRef = useRef<L.TileLayer | null>(null);
  const { user, credits, refreshCredits } = useAuth();

  useImperativeHandle(ref, () => ({
    setLayerType: (type: MapLayerType) => {
      if (!mapRef.current) return;
      if (type === "ortho") {
        if (geoportalTileRef.current) mapRef.current.removeLayer(geoportalTileRef.current);
        if (baseTileRef.current && !mapRef.current.hasLayer(baseTileRef.current)) baseTileRef.current.addTo(mapRef.current);
        if (baseTileRef.current) baseTileRef.current.bringToBack();
        if (!orthoLayerRef.current) {
          orthoLayerRef.current = new (OrthoTileLayer as any)("", { maxZoom: 19, attribution: "Ortofoto © NŽT" });
        }
        orthoLayerRef.current.addTo(mapRef.current).bringToFront();
      } else {
        if (orthoLayerRef.current) mapRef.current.removeLayer(orthoLayerRef.current);
        if (baseTileRef.current && !mapRef.current.hasLayer(baseTileRef.current)) baseTileRef.current.addTo(mapRef.current);
        if (geoportalTileRef.current && !mapRef.current.hasLayer(geoportalTileRef.current)) geoportalTileRef.current.addTo(mapRef.current);
        if (baseTileRef.current) baseTileRef.current.bringToBack();
      }
      if (kadastroLayerRef.current) kadastroLayerRef.current.bringToFront();
    },
  }));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [55.1694, 23.8813], zoom: 8, zoomControl: false });
    L.control.zoom({ position: "topleft" }).addTo(map);
    baseTileRef.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19,
    }).addTo(map);
    geoportalTileRef.current = L.tileLayer(`${GEOPORTAL_BASE}/tile/{z}/{y}/{x}`, {
      maxZoom: 19, opacity: 0.7, attribution: '&copy; <a href="https://www.geoportal.lt">Geoportal.lt</a>',
    }).addTo(map);
    kadastroLayerRef.current = new (KadastroTileLayer as any)("", {
      maxZoom: 19, opacity: 0.85, attribution: "Kadastro žemėlapis",
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!searchQuery || !mapRef.current) return;
    searchCadastralNumber(searchQuery);
  }, [searchQuery]);

  const callEdgeFunction = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("cadastral-search", { body });
    if (error) { console.error("Edge function error:", error); return null; }
    return data;
  };

  const unlockParcel = async (cadastralNumber: string): Promise<{ status: string }> => {
    if (!user) return { status: "error" };
    const { data, error } = await supabase.rpc("unlock_parcel", { 
      p_user_id: user.id, 
      p_cadastral_number: cadastralNumber 
    });
    if (error) { console.error("Unlock parcel error:", error); return { status: "error" }; }
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    if (result?.status === 'success') await refreshCredits();
    return result || { status: "error" };
  };

  const identifyParcel = async (latlng: L.LatLng, map: L.Map) => {
    if (!user) {
      toast.error("Prisijunkite, kad galėtumėte identifikuoti sklypus");
      return;
    }
    if (credits <= 0) {
      toast.error("Neturite paieškos kreditų");
      return;
    }

    setIsLoading(true);
    try {
      const data = await callEdgeFunction({ action: "identify", lat: latlng.lat, lng: latlng.lng });

      if (data?.features && data.features.length > 0) {
        const feature = data.features[0];
        const props = feature.properties || {};

        const cadastralNr = props.nationalCadastralReference || props.NTR_ID?.toString() || "Nežinomas";
        const unlockResult = await unlockParcel(cadastralNr);
        if (unlockResult.status === 'insufficient_credits') {
          toast.error("Neturite paieškos kreditų");
          return;
        }
        if (unlockResult.status === 'error') {
          toast.error("Nepavyko apdoroti užklausos");
          return;
        }
        if (unlockResult.status === 'already_unlocked') {
          toast.info("Šis sklypas jau atrakintas – kreditas nenurašytas");
        }

        const parcel: ParcelData = {
          cadastralNumber: cadastralNr,
          unikalusNr: props.UNIK_NR?.toString() || props.unikalus_nr,
          area: props.areaValue || props.PLOTAS_J,
          purpose: props.currentUse || props.PASKIRTIS || props.pask_tipas,
          address: props.exactAddress || props.label || props.adresas || props.ADRESAS ||
            (props.sav_pavadinimas || props.seniunijos_pavad
              ? `${props.sav_pavadinimas || ""}${props.seniunijos_pavad ? ", " + props.seniunijos_pavad : ""}`
              : undefined),
          lat: latlng.lat, lng: latlng.lng,
          coordinates: feature.geometry?.coordinates,
          formavimoData: props.formavimo_data || props.FORMAVIMO_DATA,
        };
        if (feature.geometry) highlightGeoJSON(feature);
        onParcelSelect(parcel);
      } else {
        onParcelSelect({
          cadastralNumber: "Nežinomas",
          address: "Sklypas nerastas šiame taške. Pabandykite priartinti žemėlapį.",
          lat: latlng.lat, lng: latlng.lng,
        });
      }
    } catch (error) {
      console.error("Identify error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchCadastralNumber = async (query: string) => {
    setIsLoading(true);
    try {
      const data = await callEdgeFunction({ action: "search", cadastralNumber: query.trim() });

      if (data?.features && data.features.length > 0) {
        const feature = data.features[0];
        const props = feature.properties || {};

        const cadastralNr = props.nationalCadastralReference || props.kadastro_nr || props.NTR_ID?.toString() || query.trim();

        const parcel: ParcelData = {
          cadastralNumber: cadastralNr,
          unikalusNr: props.UNIK_NR?.toString() || props.unikalus_nr,
          area: props.skl_plotas || props.areaValue || props.PLOTAS_J,
          purpose: props.pask_tipas || props.currentUse || props.PASKIRTIS,
          address: props.exactAddress || props.label || props.adresas || props.ADRESAS ||
            (props.sav_pavadinimas || props.seniunijos_pavad
              ? `${props.sav_pavadinimas || ""}${props.seniunijos_pavad ? ", " + props.seniunijos_pavad : ""}`
              : undefined),
          coordinates: feature.geometry?.coordinates,
          formavimoData: props.formavimo_data || props.FORMAVIMO_DATA,
        };

        if (feature.geometry && mapRef.current) {
          const layer = highlightGeoJSON(feature);
          if (layer) {
            const bounds = layer.getBounds();
            const center = bounds.getCenter();
            parcel.lat = center.lat;
            parcel.lng = center.lng;
          }
        }
        onParcelSelect(parcel);
      } else {
        onParcelSelect({
          cadastralNumber: query.trim(),
          address: data?.error || "Sklypas su tokiu kadastriniu numeriu nerastas. Patikrinkite numerį.",
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      onParcelSelect({ cadastralNumber: query, address: "Paieškos klaida. Pabandykite vėliau." });
    } finally {
      setIsLoading(false);
      onSearchComplete();
    }
  };

  const highlightGeoJSON = (feature: any): L.GeoJSON | null => {
    if (!mapRef.current || !feature.geometry) return null;
    if (highlightLayerRef.current) mapRef.current.removeLayer(highlightLayerRef.current);
    try {
      highlightLayerRef.current = L.geoJSON(feature, {
        style: { color: "hsl(160, 84%, 39%)", weight: 3, fillColor: "hsl(160, 84%, 39%)", fillOpacity: 0.15 },
      }).addTo(mapRef.current);
      return highlightLayerRef.current;
    } catch (e) {
      console.error("GeoJSON highlight error:", e);
      return null;
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {isLoading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[999]">
          <div className="glass-panel rounded-xl px-5 py-3 flex items-center gap-3 shadow-lg">
            <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm font-medium text-foreground">Ieškoma...</span>
          </div>
        </div>
      )}
    </div>
  );
});

export default MapView;
