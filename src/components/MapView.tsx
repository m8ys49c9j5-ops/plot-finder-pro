import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useAppConfig } from "@/hooks/useAppConfig";
import type { ParcelData } from "./ParcelSidebar";

export type MapLayerType = "standard" | "ortho";

export interface MapViewHandle {
  setLayerType: (type: MapLayerType) => void;
  highlightAndFit: (feature: any) => void;
}

interface MapViewProps {
  onParcelSelect: (parcel: ParcelData, feature?: any) => void;
  searchQuery: string | null;
  onSearchComplete: () => void;
  initialFeature?: any;
}

const GEOPORTAL_BASE = "https://www.geoportal.lt/mapproxy/gisc_pagrindinis/MapServer";
const KADASTRAS_BASE = "https://www.geoportal.lt/mapproxy/rc_kadastro_zemelapis/MapServer";
const ORTHO_BASE = "https://www.geoportal.lt/mapproxy/nzt_ort10lt_recent_public/MapServer";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Fire-and-forget analytics insert
const logSearchAnalytics = (queryInput: string, searchType: string, isSuccessful: boolean, userId?: string) => {
  supabase
    .from("search_analytics")
    .insert({
      query_input: queryInput,
      search_type: searchType,
      is_successful: isSuccessful,
      user_id: userId || null,
    })
    .then(() => {});
};

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

const MapView = forwardRef<MapViewHandle, MapViewProps>(
  ({ onParcelSelect, searchQuery, onSearchComplete, initialFeature }, ref) => {
    const mapRef = useRef<L.Map | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const highlightLayerRef = useRef<L.GeoJSON | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const baseTileRef = useRef<L.TileLayer | null>(null);
    const geoportalTileRef = useRef<L.TileLayer | null>(null);
    const orthoLayerRef = useRef<L.TileLayer | null>(null);
    const kadastroLayerRef = useRef<L.TileLayer | null>(null);
    const { user, credits, refreshCredits } = useAuth();
    const { config } = useAppConfig();

    // Refs to keep auth state current for async functions without stale closure issues
    const userRef = useRef(user);
    const creditsRef = useRef(credits);
    useEffect(() => {
      userRef.current = user;
    }, [user]);
    useEffect(() => {
      creditsRef.current = credits;
    }, [credits]);

    useImperativeHandle(ref, () => ({
      setLayerType: (type: MapLayerType) => {
        if (!mapRef.current) return;
        if (type === "ortho") {
          if (geoportalTileRef.current) mapRef.current.removeLayer(geoportalTileRef.current);
          if (baseTileRef.current && !mapRef.current.hasLayer(baseTileRef.current))
            baseTileRef.current.addTo(mapRef.current);
          if (baseTileRef.current) baseTileRef.current.bringToBack();
          if (!orthoLayerRef.current) {
            orthoLayerRef.current = new (OrthoTileLayer as any)("", { maxZoom: 19, attribution: "Ortofoto © NŽT" });
          }
          orthoLayerRef.current.addTo(mapRef.current).bringToFront();
        } else {
          if (orthoLayerRef.current) mapRef.current.removeLayer(orthoLayerRef.current);
          if (baseTileRef.current && !mapRef.current.hasLayer(baseTileRef.current))
            baseTileRef.current.addTo(mapRef.current);
          if (geoportalTileRef.current && !mapRef.current.hasLayer(geoportalTileRef.current))
            geoportalTileRef.current.addTo(mapRef.current);
          if (baseTileRef.current) baseTileRef.current.bringToBack();
        }
        if (kadastroLayerRef.current) kadastroLayerRef.current.bringToFront();
      },
      highlightAndFit: (feature: any) => {
        if (!mapRef.current || !feature?.geometry) return;
        const layer = highlightGeoJSON(feature);
        if (layer) {
          const bounds = layer.getBounds();
          mapRef.current.fitBounds(bounds, { paddingTopLeft: [80, 80], paddingBottomRight: [80, 80], maxZoom: 17 });
        }
      },
    }));

    // Re-highlight initial feature when map is ready
    useEffect(() => {
      if (!mapReady || !initialFeature?.geometry || !mapRef.current) return;
      const layer = highlightGeoJSON(initialFeature);
      if (layer) {
        const bounds = layer.getBounds();
        mapRef.current.fitBounds(bounds, { paddingTopLeft: [80, 80], paddingBottomRight: [480, 80], maxZoom: 17 });
      }
    }, [initialFeature, mapReady]);

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, {
        center: [config.map_default_lat ?? 55.1694, config.map_default_lng ?? 23.8813],
        zoom: config.map_default_zoom ?? 8,
        zoomControl: false,
      });
      L.control.zoom({ position: "topleft" }).addTo(map);
      baseTileRef.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      geoportalTileRef.current = L.tileLayer(`${GEOPORTAL_BASE}/tile/{z}/{y}/{x}`, {
        maxZoom: 19,
        opacity: 0.7,
        attribution: '&copy; <a href="https://www.geoportal.lt">Geoportal.lt</a>',
      }).addTo(map);
      kadastroLayerRef.current = new (KadastroTileLayer as any)("", {
        maxZoom: 19,
        opacity: 0.85,
        attribution: "Kadastro žemėlapis",
      }).addTo(map);

      mapRef.current = map;
      setMapReady(true);
      return () => {
        map.remove();
        mapRef.current = null;
        setMapReady(false);
      };
    }, []);

    useEffect(() => {
      if (!searchQuery || !mapRef.current) return;
      searchCadastralNumber(searchQuery);
    }, [searchQuery]);

    const callEdgeFunction = async (body: any) => {
      const { data, error } = await supabase.functions.invoke("cadastral-search", { body });
      if (error) {
        console.error("Edge function error:", error);
        return null;
      }
      return data;
    };

    const unlockParcel = async (cadastralNumber: string): Promise<{ status: string }> => {
      const currentUser = userRef.current;
      if (!currentUser) return { status: "error" };
      const { data, error } = await supabase.rpc("unlock_parcel", {
        p_user_id: currentUser.id,
        p_cadastral_number: cadastralNumber,
      });
      if (error) {
        console.error("Unlock parcel error:", error);
        return { status: "error" };
      }
      const result = typeof data === "string" ? JSON.parse(data) : data;
      if (result?.status === "success") await refreshCredits();
      return result || { status: "error" };
    };

    const searchCadastralNumber = async (query: string) => {
      setIsLoading(true);
      try {
        const data = await callEdgeFunction({ action: "search", cadastralNumber: query.trim() });
        const success = !!(data?.features && data.features.length > 0);

        // Log analytics (fire and forget)
        logSearchAnalytics(query.trim(), "text_search", success, userRef.current?.id);

        if (success) {
          const feature = data.features[0];
          const props = feature.properties || {};

          const cadastralNr =
            props.nationalCadastralReference || props.kadastro_nr || props.NTR_ID?.toString() || query.trim();

          const parcel: ParcelData = {
            cadastralNumber: cadastralNr,
            unikalusNr: props.UNIK_NR?.toString() || props.unikalus_nr,
            area: props.skl_plotas || props.areaValue || props.PLOTAS_J,
            purpose: props.pask_tipas || props.currentUse || props.PASKIRTIS,
            address:
              props.exactAddress ||
              props.fullAddress ||
              props.label ||
              props.adresas ||
              props.ADRESAS ||
              [
                props.kaimas_miestas,
                props.seniunija && String(props.seniunija).trim() ? `${props.seniunija} sen.` : null,
                props.sav_pavadinimas && String(props.sav_pavadinimas).trim() ? `${props.sav_pavadinimas} r. sav.` : null,
              ]
                .filter(Boolean)
                .join(", ") ||
              undefined,
            postalCode: props.postalCode || props.pasto_kodas || undefined,
            coordinates: feature.geometry?.coordinates,
            formavimoData: props.formavimo_data || props.FORMAVIMO_DATA,
            vidutineRinkosVerte: props.vidutineRinkosVerte || props.vid_rinkos_verte || undefined,
            vertinimoData: props.vertinimoData || props.vertinimo_data || undefined,
          };

          if (feature.geometry && mapRef.current) {
            const layer = highlightGeoJSON(feature);
            if (layer) {
              const bounds = layer.getBounds();
              const center = bounds.getCenter();
              parcel.lat = center.lat;
              parcel.lng = center.lng;
              // Fit map to parcel, accounting for sidebar width on large screens
              mapRef.current.fitBounds(bounds, {
                paddingTopLeft: [80, 120],
                paddingBottomRight: [420, 80],
                maxZoom: 17,
                animate: true,
              });
            }
          }
          onParcelSelect(parcel, feature);

          // Fetch market value asynchronously — show sidebar immediately, enrich when ready
          if (parcel.unikalusNr) {
            supabase.functions
              .invoke("fetch-market-value", { body: { unikalusNr: parcel.unikalusNr } })
              .then(({ data: mvData }) => {
                if (mvData?.vidutineRinkosVerte && mvData.vidutineRinkosVerte !== "Nėra duomenų") {
                  onParcelSelect(
                    {
                      ...parcel,
                      vidutineRinkosVerte: mvData.vidutineRinkosVerte,
                      vertinimoData: mvData.vertinimoData || undefined,
                    },
                    feature,
                  );
                }
              })
              .catch(() => {}); // fire-and-forget, never block the main flow
          }
        } else {
          toast.error(data?.error || "Sklypas nerastas. Patikrinkite numerį.");
        }
      } catch (error) {
        console.error("Search error:", error);
        logSearchAnalytics(query.trim(), "text_search", false, userRef.current?.id);
        toast.error("Paieškos klaida. Pabandykite vėliau.");
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
  },
);

MapView.displayName = "MapView";

export default MapView;
