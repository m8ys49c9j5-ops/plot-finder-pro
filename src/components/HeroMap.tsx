import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const GEOPORTAL_BASE = "https://www.geoportal.lt/mapproxy/gisc_pagrindinis/MapServer";

const HeroMap = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map centered on Vilnius
    const map = L.map(containerRef.current, {
      center: [54.6872, 25.2797], // Vilnius
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    });

    // Add exactly authentic Geoportal tile layer
    L.tileLayer(`${GEOPORTAL_BASE}/tile/{z}/{y}/{x}`, {
      maxZoom: 19,
      opacity: 0.90, 
    }).addTo(map);

    // 🚨 VITAL FIX: Leaflet maps initialized inside React.lazy() / Suspense
    // frequently mount with mathematically 0 height for a split second, causing 
    // them to permanently render a blank white screen. We force a resize geometry fix:
    setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize(true);
    }, 300);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 bg-background" 
      style={{ width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} 
    />
  );
};

export default HeroMap;
