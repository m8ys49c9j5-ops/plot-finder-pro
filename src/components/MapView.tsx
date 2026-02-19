import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import type { ParcelData } from "./ParcelSidebar";

interface MapViewProps {
  onParcelSelect: (parcel: ParcelData) => void;
  searchQuery: string | null;
  onSearchComplete: () => void;
}

const GEOPORTAL_BASE = "https://www.geoportal.lt/mapproxy/gisc_pagrindinis/MapServer";
const KADASTRAS_BASE = "https://www.geoportal.lt/mapproxy/rc_kadastro_zemelapis/MapServer";

const MapView = ({ onParcelSelect, searchQuery, onSearchComplete }: MapViewProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightLayerRef = useRef<L.GeoJSON | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [55.1694, 23.8813],
      zoom: 8,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    L.tileLayer(`${GEOPORTAL_BASE}/tile/{z}/{y}/{x}`, {
      maxZoom: 19,
      opacity: 0.7,
      attribution: '&copy; <a href="https://www.geoportal.lt">Geoportal.lt</a>',
    }).addTo(map);

    L.tileLayer(`${KADASTRAS_BASE}/tile/{z}/{y}/{x}`, {
      maxZoom: 19,
      opacity: 0.6,
      attribution: "Kadastro žemėlapis",
    }).addTo(map);

    map.on("click", async (e: L.LeafletMouseEvent) => {
      await identifyParcel(e.latlng, map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!searchQuery || !mapRef.current) return;
    searchCadastralNumber(searchQuery);
  }, [searchQuery]);

  const callEdgeFunction = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("cadastral-search", {
      body,
    });

    if (error) {
      console.error("Edge function error:", error);
      return null;
    }
    return data;
  };

  const identifyParcel = async (latlng: L.LatLng, map: L.Map) => {
    setIsLoading(true);
    try {
      const data = await callEdgeFunction({
        action: "identify",
        lat: latlng.lat,
        lng: latlng.lng,
      });

      if (data?.features && data.features.length > 0) {
        const feature = data.features[0];
        const props = feature.properties || {};

        const parcel: ParcelData = {
          cadastralNumber:
            props.nationalCadastralReference ||
            props.NTR_ID?.toString() ||
            "Nežinomas",
          area: props.areaValue || props.PLOTAS_J,
          purpose: props.currentUse || props.PASKIRTIS,
          address: props.label,
          lat: latlng.lat,
          lng: latlng.lng,
        };

        if (feature.geometry) {
          highlightGeoJSON(feature);
        }

        onParcelSelect(parcel);
      } else {
        onParcelSelect({
          cadastralNumber: "Nežinomas",
          address: "Sklypas nerastas šiame taške. Pabandykite priartinti žemėlapį.",
          lat: latlng.lat,
          lng: latlng.lng,
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
      const data = await callEdgeFunction({
        action: "search",
        cadastralNumber: query.trim(),
      });

      if (data?.features && data.features.length > 0) {
        const feature = data.features[0];
        const props = feature.properties || {};

        const parcel: ParcelData = {
          cadastralNumber:
            props.nationalCadastralReference ||
            props.kadastro_nr ||
            props.NTR_ID?.toString() ||
            query.trim(),
          area: props.skl_plotas || props.areaValue || props.PLOTAS_J,
          purpose: props.pask_tipas || props.currentUse || props.PASKIRTIS,
          address: props.seniunijos_pavad
            ? `${props.sav_pavadinimas || ""}, ${props.seniunijos_pavad}`
            : props.label,
        };

        if (feature.geometry && mapRef.current) {
          const layer = highlightGeoJSON(feature);
          if (layer) {
            const bounds = layer.getBounds();
            mapRef.current.fitBounds(bounds, { padding: [80, 80], maxZoom: 17 });
            const center = bounds.getCenter();
            parcel.lat = center.lat;
            parcel.lng = center.lng;
          }
        }

        onParcelSelect(parcel);
      } else {
        onParcelSelect({
          cadastralNumber: query.trim(),
          address:
            data?.error ||
            "Sklypas su tokiu kadastriniu numeriu nerastas. Patikrinkite numerį.",
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      onParcelSelect({
        cadastralNumber: query,
        address: "Paieškos klaida. Pabandykite vėliau.",
      });
    } finally {
      setIsLoading(false);
      onSearchComplete();
    }
  };

  const highlightGeoJSON = (feature: any): L.GeoJSON | null => {
    if (!mapRef.current || !feature.geometry) return null;

    if (highlightLayerRef.current) {
      mapRef.current.removeLayer(highlightLayerRef.current);
    }

    try {
      highlightLayerRef.current = L.geoJSON(feature, {
        style: {
          color: "hsl(160, 84%, 39%)",
          weight: 3,
          fillColor: "hsl(160, 84%, 39%)",
          fillOpacity: 0.15,
        },
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
};

export default MapView;
