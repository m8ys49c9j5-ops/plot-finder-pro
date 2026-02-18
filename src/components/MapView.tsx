import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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

    // Add zoom control to bottom-right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Base tile layer (OSM as fallback)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Geoportal base layer
    L.tileLayer(
      `${GEOPORTAL_BASE}/tile/{z}/{y}/{x}`,
      {
        maxZoom: 19,
        opacity: 0.7,
        attribution: '&copy; <a href="https://www.geoportal.lt">Geoportal.lt</a>',
      }
    ).addTo(map);

    // Cadastral layer
    L.tileLayer(
      `${KADASTRAS_BASE}/tile/{z}/{y}/{x}`,
      {
        maxZoom: 19,
        opacity: 0.6,
        attribution: "Kadastro žemėlapis",
      }
    ).addTo(map);

    // Click handler for parcel identification
    map.on("click", async (e: L.LeafletMouseEvent) => {
      await identifyParcel(map, e.latlng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle search queries
  useEffect(() => {
    if (!searchQuery || !mapRef.current) return;
    searchCadastralNumber(searchQuery);
  }, [searchQuery]);

  const identifyParcel = async (map: L.Map, latlng: L.LatLng) => {
    setIsLoading(true);
    try {
      const bounds = map.getBounds();
      const size = map.getSize();
      const point = map.latLngToContainerPoint(latlng);

      const params = new URLSearchParams({
        f: "json",
        geometry: JSON.stringify({ x: latlng.lng, y: latlng.lat, spatialReference: { wkid: 4326 } }),
        geometryType: "esriGeometryPoint",
        sr: "4326",
        layers: "all",
        tolerance: "5",
        mapExtent: `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`,
        imageDisplay: `${size.x},${size.y},96`,
        returnGeometry: "true",
      });

      const response = await fetch(`${KADASTRAS_BASE}/identify?${params}`);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const attrs = result.attributes;

        const parcel: ParcelData = {
          cadastralNumber: attrs.KADASTRO_NR || attrs.UNIKALUS_NR || attrs.LABEL || "Nežinomas",
          area: attrs.PLOTAS || attrs.SHAPE_Area,
          purpose: attrs.PASKIRTIS || attrs.PASKIRTIES_PAVADINIMAS,
          address: attrs.ADRESAS || attrs.VIETOVES_PAVADINIMAS,
          lat: latlng.lat,
          lng: latlng.lng,
        };

        // Highlight parcel geometry
        if (result.geometry) {
          highlightGeometry(result.geometry);
        }

        onParcelSelect(parcel);
      }
    } catch (error) {
      console.error("Identify error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchCadastralNumber = async (cadastralNr: string) => {
    setIsLoading(true);
    try {
      // Try to find parcel using the query/find endpoint
      const params = new URLSearchParams({
        f: "json",
        searchText: cadastralNr,
        contains: "true",
        returnGeometry: "true",
        layers: "0",
        sr: "4326",
      });

      const response = await fetch(`${KADASTRAS_BASE}/find?${params}`);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const attrs = result.attributes;

        const parcel: ParcelData = {
          cadastralNumber: attrs.KADASTRO_NR || attrs.UNIKALUS_NR || cadastralNr,
          area: attrs.PLOTAS || attrs.SHAPE_Area,
          purpose: attrs.PASKIRTIS || attrs.PASKIRTIES_PAVADINIMAS,
          address: attrs.ADRESAS || attrs.VIETOVES_PAVADINIMAS,
        };

        // Zoom to geometry
        if (result.geometry && mapRef.current) {
          highlightGeometry(result.geometry);

          if (result.geometry.rings) {
            const geoJson = arcgisToGeoJSON(result.geometry);
            const layer = L.geoJSON(geoJson as any);
            const bounds = layer.getBounds();
            mapRef.current.fitBounds(bounds, { padding: [60, 60] });
            
            const center = bounds.getCenter();
            parcel.lat = center.lat;
            parcel.lng = center.lng;
          }
        }

        onParcelSelect(parcel);
      } else {
        // If no results found via find, create a basic entry
        onParcelSelect({
          cadastralNumber: cadastralNr,
          address: "Sklypas nerastas. Pabandykite spustelėti žemėlapyje.",
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      onParcelSelect({
        cadastralNumber: cadastralNr,
        address: "Paieškos klaida. Pabandykite vėliau.",
      });
    } finally {
      setIsLoading(false);
      onSearchComplete();
    }
  };

  const highlightGeometry = (geometry: any) => {
    if (!mapRef.current) return;

    // Remove previous highlight
    if (highlightLayerRef.current) {
      mapRef.current.removeLayer(highlightLayerRef.current);
    }

    if (geometry.rings) {
      const geoJson = arcgisToGeoJSON(geometry);
      highlightLayerRef.current = L.geoJSON(geoJson as any, {
        style: {
          color: "hsl(160, 84%, 39%)",
          weight: 3,
          fillColor: "hsl(160, 84%, 39%)",
          fillOpacity: 0.15,
        },
      }).addTo(mapRef.current);
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

// Simple ArcGIS geometry to GeoJSON converter
function arcgisToGeoJSON(geometry: any) {
  if (geometry.rings) {
    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: geometry.rings.map((ring: number[][]) =>
          ring.map((coord) => [coord[0], coord[1]])
        ),
      },
      properties: {},
    };
  }
  return null;
}

export default MapView;
