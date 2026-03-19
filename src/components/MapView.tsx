import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useAppConfig } from "@/hooks/useAppConfig";
import { getSessionId } from "@/lib/sessionId";
import type { ParcelData } from "./ParcelSidebar";

export type MapLayerType = "standard" | "ortho";
export type OverlayLayerType = "parcels" | "forest" | "melior" | "szns" | "energy";

export interface MapViewHandle {
  setLayerType: (type: MapLayerType) => void;
  highlightAndFit: (feature: any) => void;
  toggleOverlay: (key: OverlayLayerType) => boolean;
}

interface MapViewProps {
  onParcelSelect: (parcel: ParcelData, feature?: any) => void;
  searchQuery: string | null;
  onSearchComplete: () => void;
  initialFeature?: any;
  onLogSearch?: (params: {
    cadastralNumber: string;
    address?: string;
    lat?: number;
    lng?: number;
    searchMethod: string;
  }) => void;
}

const GEOPORTAL_BASE = "https://www.geoportal.lt/mapproxy/gisc_pagrindinis/MapServer";
const KADASTRAS_BASE = "https://www.geoportal.lt/mapproxy/rc_kadastro_zemelapis/MapServer";
const ORTHO_BASE = "https://www.geoportal.lt/mapproxy/nzt_ort10lt_recent_public/MapServer";
const FOREST_BASE = "https://www.geoportal.lt/mapproxy/vmt_mkd/MapServer";
const MELIOR_BASE = "https://www.geoportal.lt/mapproxy/nzt_mel_dr10lt/MapServer";
const SZNS_BASE = "https://www.geoportal.lt/mapproxy/rc_szns/MapServer";
const ESO_ELEKTRA_BASE = "https://www.geoportal.lt/mapproxy/ESO_DB_Public/MapServer";
const ESO_DUJOS_BASE = "https://www.geoportal.lt/mapproxy/ESO_DUJOS_Public/MapServer";
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

const ForestTileLayer = L.TileLayer.extend({
  getTileUrl: function (coords: L.Coords) {
    const url = `${FOREST_BASE}/tile/${coords.z}/${coords.y}/${coords.x}`;
    return `${SUPABASE_URL}/functions/v1/map-proxy?url=${encodeURIComponent(url)}`;
  },
});

const MeliorTileLayer = L.TileLayer.extend({
  getTileUrl: function (coords: L.Coords) {
    const url = `${MELIOR_BASE}/tile/${coords.z}/${coords.y}/${coords.x}`;
    return `${SUPABASE_URL}/functions/v1/map-proxy?url=${encodeURIComponent(url)}`;
  },
});

const SznsTileLayer = L.TileLayer.extend({
  getTileUrl: function (coords: L.Coords) {
    const url = `${SZNS_BASE}/tile/${coords.z}/${coords.y}/${coords.x}`;
    return `${SUPABASE_URL}/functions/v1/map-proxy?url=${encodeURIComponent(url)}`;
  },
});

const EsoElektraTileLayer = L.TileLayer.extend({
  getTileUrl: function (coords: L.Coords) {
    return buildExportProxyUrl(ESO_ELEKTRA_BASE, coords, (this as any)._map as L.Map, "png32", true);
  },
});

const EsoDujosTileLayer = L.TileLayer.extend({
  getTileUrl: function (coords: L.Coords) {
    return buildExportProxyUrl(ESO_DUJOS_BASE, coords, (this as any)._map as L.Map, "png32", true);
  },
});

const wgs84ToLKS94 = (lat: number, lng: number): { x: number; y: number } => {
  const a  = 6378137.0;
  const f  = 1 / 298.257222101;
  const e2 = 2 * f - f * f;
  const k0 = 0.9998;
  const lng0 = 24.0 * Math.PI / 180;
  const fe = 500000;

  const phi  = lat * Math.PI / 180;
  const lam  = lng * Math.PI / 180;
  const sinP = Math.sin(phi);
  const cosP = Math.cos(phi);
  const tanP = Math.tan(phi);

  const N = a / Math.sqrt(1 - e2 * sinP * sinP);
  const T = tanP * tanP;
  const C = (e2 / (1 - e2)) * cosP * cosP;
  const A = (lam - lng0) * cosP;
  const M = a * (
    (1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256) * phi
    - (3*e2/8 + 3*e2*e2/32 + 45*e2*e2*e2/1024) * Math.sin(2*phi)
    + (15*e2*e2/256 + 45*e2*e2*e2/1024) * Math.sin(4*phi)
    - (35*e2*e2*e2/3072) * Math.sin(6*phi)
  );

  const x = fe + k0 * N * (
    A + (1 - T + C) * A*A*A/6
    + (5 - 18*T + T*T + 72*C - 58*(e2/(1-e2))) * A*A*A*A*A/120
  );
  const y = k0 * (
    M + N * tanP * (
      A*A/2
      + (5 - T + 9*C + 4*C*C) * A*A*A*A/24
      + (61 - 58*T + T*T + 600*C - 330*(e2/(1-e2))) * A*A*A*A*A*A/720
    )
  );

  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
};

// SZNS identify helper — shows a rich Leaflet popup
const identifySZNS = async (latlng: L.LatLng, map: L.Map) => {
  try {
    const lks = wgs84ToLKS94(latlng.lat, latlng.lng);

    const bounds = map.getBounds();
    const swLks = wgs84ToLKS94(bounds.getSouth(), bounds.getWest());
    const neLks = wgs84ToLKS94(bounds.getNorth(), bounds.getEast());
    const size  = map.getSize();

    const identifyUrl =
      `${SZNS_BASE}/identify?` +
      `geometry=${lks.x},${lks.y}` +
      `&geometryType=esriGeometryPoint` +
      `&sr=3346` +
      `&layers=all` +
      `&tolerance=5` +
      `&mapExtent=${swLks.x},${swLks.y},${neLks.x},${neLks.y}` +
      `&imageDisplay=${size.x},${size.y},96` +
      `&returnGeometry=false` +
      `&f=json`;

    const proxyUrl = `${SUPABASE_URL}/functions/v1/map-proxy?url=${encodeURIComponent(identifyUrl)}`;
    const resp = await fetch(proxyUrl);
    const data = await resp.json();

    if (data?.results && data.results.length > 0) {
      const seen = new Set<string>();
      const rows: Array<{ layer: string; kodas: string }> = [];

      for (const r of data.results) {
        const attrs  = r.attributes ?? {};
        const layer  = r.layerName ?? "ŠZNS";
        const tipas  = attrs.TIPAS || attrs.TIP_KODAS || attrs.tipas || "";
        const key    = `${layer}|${tipas}`;
        if (!seen.has(key)) {
          seen.add(key);
          rows.push({ layer, kodas: tipas });
        }
      }

      const rowsHtml = rows.map(row => `
        <div style="padding:6px 0;border-bottom:1px solid rgba(128,128,128,0.15);">
          <div style="font-size:12px;font-weight:600;color:#111;">${row.layer}</div>
          ${row.kodas ? `<div style="font-size:11px;color:#666;margin-top:2px;">Kodas: ${row.kodas}</div>` : ""}
        </div>
      `).join("");

      const html = `
        <div style="min-width:200px;max-width:280px;font-family:Inter,sans-serif;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888;margin-bottom:8px;">
            Specialiosios sąlygos (${rows.length})
          </div>
          ${rowsHtml}
          <div style="font-size:10px;color:#aaa;margin-top:8px;">© VĮ Registrų centras</div>
        </div>
      `;

      L.popup({ maxWidth: 300, className: "szns-popup" })
        .setLatLng(latlng)
        .setContent(html)
        .openOn(map);

    } else {
      L.popup({ maxWidth: 240 })
        .setLatLng(latlng)
        .setContent(
          `<div style="font-family:Inter,sans-serif;font-size:13px;color:#666;padding:4px 0;">
            Šiame taške ŠZNS zonų nerasta.
          </div>`
        )
        .openOn(map);
    }
  } catch (e) {
    console.error("ŠZNS identify error:", e);
    toast.error("ŠZNS užklausa nepavyko");
  }
};

const MapView = forwardRef<MapViewHandle, MapViewProps>(
  ({ onParcelSelect, searchQuery, onSearchComplete, initialFeature, onLogSearch }, ref) => {
    const mapRef = useRef<L.Map | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const highlightLayerRef = useRef<L.GeoJSON | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const baseTileRef = useRef<L.TileLayer | null>(null);
    const geoportalTileRef = useRef<L.TileLayer | null>(null);
    const orthoLayerRef = useRef<L.TileLayer | null>(null);
    const kadastroLayerRef = useRef<L.TileLayer | null>(null);

    // Overlay layer refs
    const forestLayerRef = useRef<L.TileLayer | null>(null);
    const meliorLayerRef = useRef<L.TileLayer | null>(null);
    const sznsLayerRef = useRef<L.TileLayer | null>(null);
    const esoElektraLayerRef = useRef<L.TileLayer | null>(null);
    const esoDujosLayerRef = useRef<L.TileLayer | null>(null);
    const sznsActiveRef = useRef(false);

    const { user, credits, refreshCredits } = useAuth();
    const { config } = useAppConfig();

    const userRef = useRef(user);
    const creditsRef = useRef(credits);
    useEffect(() => { userRef.current = user; }, [user]);
    useEffect(() => { creditsRef.current = credits; }, [credits]);

    const bringKadastroToFront = () => {
      if (kadastroLayerRef.current && mapRef.current?.hasLayer(kadastroLayerRef.current)) {
        kadastroLayerRef.current.bringToFront();
      }
    };

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
          orthoLayerRef.current.addTo(mapRef.current);
          // Keep ortho behind all overlays — only above the base tile
          if (baseTileRef.current) baseTileRef.current.bringToBack();
          orthoLayerRef.current.setZIndex(100);
        } else {
          if (orthoLayerRef.current) mapRef.current.removeLayer(orthoLayerRef.current);
          if (baseTileRef.current && !mapRef.current.hasLayer(baseTileRef.current))
            baseTileRef.current.addTo(mapRef.current);
          if (geoportalTileRef.current && !mapRef.current.hasLayer(geoportalTileRef.current))
            geoportalTileRef.current.addTo(mapRef.current);
          if (baseTileRef.current) baseTileRef.current.bringToBack();
        }
        bringKadastroToFront();
      },

      highlightAndFit: (feature: any) => {
        if (!mapRef.current || !feature?.geometry) return;
        const layer = highlightGeoJSON(feature);
        if (layer) {
          const bounds = layer.getBounds();
          mapRef.current.fitBounds(bounds, { paddingTopLeft: [80, 80], paddingBottomRight: [80, 80], maxZoom: 17 });
        }
      },

      toggleOverlay: (key: OverlayLayerType): boolean => {
        const map = mapRef.current;
        if (!map) return false;

        const OVERLAY_ZINDEX = 200;
        const KADASTRO_ZINDEX = 300;

        const toggle = (
          layerRef: React.MutableRefObject<L.TileLayer | null>,
          LayerClass: any,
          opts?: L.TileLayerOptions,
        ): boolean => {
          if (layerRef.current && map.hasLayer(layerRef.current)) {
            map.removeLayer(layerRef.current);
            return false;
          }
          if (!layerRef.current) {
            layerRef.current = new LayerClass("", { maxZoom: 19, opacity: 0.7, zIndex: OVERLAY_ZINDEX, ...opts });
          }
          layerRef.current!.addTo(map);
          bringKadastroToFront();
          return true;
        };

        switch (key) {
          case "parcels": {
            if (kadastroLayerRef.current && map.hasLayer(kadastroLayerRef.current)) {
              map.removeLayer(kadastroLayerRef.current);
              return false;
            }
            if (!kadastroLayerRef.current) {
              kadastroLayerRef.current = new (KadastroTileLayer as any)("", {
                maxZoom: 19, opacity: 0.85, zIndex: KADASTRO_ZINDEX, attribution: "Kadastro žemėlapis",
              });
            }
            kadastroLayerRef.current.addTo(map);
            bringKadastroToFront();
            return true;
          }
          case "forest":
            return toggle(forestLayerRef, ForestTileLayer);
          case "melior":
            return toggle(meliorLayerRef, MeliorTileLayer);
          case "szns": {
            const nowActive = !sznsActiveRef.current;
            sznsActiveRef.current = nowActive;
            if (nowActive) {
              if (!sznsLayerRef.current) {
                sznsLayerRef.current = new (SznsTileLayer as any)("", { maxZoom: 19, opacity: 0.7, zIndex: OVERLAY_ZINDEX });
              }
              sznsLayerRef.current.addTo(map);
              bringKadastroToFront();
            } else {
              if (sznsLayerRef.current) map.removeLayer(sznsLayerRef.current);
              map.closePopup();
            }
            return nowActive;
          }
          case "energy": {
            const isOn = esoElektraLayerRef.current && map.hasLayer(esoElektraLayerRef.current);
            if (isOn) {
              if (esoElektraLayerRef.current) map.removeLayer(esoElektraLayerRef.current);
              if (esoDujosLayerRef.current) map.removeLayer(esoDujosLayerRef.current);
              return false;
            }
            if (!esoElektraLayerRef.current) {
              esoElektraLayerRef.current = new (EsoElektraTileLayer as any)("", { maxZoom: 19, opacity: 0.7, zIndex: OVERLAY_ZINDEX });
            }
            if (!esoDujosLayerRef.current) {
              esoDujosLayerRef.current = new (EsoDujosTileLayer as any)("", { maxZoom: 19, opacity: 0.7, zIndex: OVERLAY_ZINDEX });
            }
            esoElektraLayerRef.current.addTo(map);
            esoDujosLayerRef.current.addTo(map);
            bringKadastroToFront();
            return true;
          }
          default:
            return false;
        }
      },
    }));

    // Stable ref for SZNS identify in click handler
    const sznsActiveRefStable = sznsActiveRef;

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
      L.control.zoom({ position: "bottomright" }).addTo(map);
      baseTileRef.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      geoportalTileRef.current = L.tileLayer(`${GEOPORTAL_BASE}/tile/{z}/{y}/{x}`, {
        maxZoom: 19,
        opacity: 0.7,
        attribution: '&copy; <a href="https://www.geoportal.lt">Geoportal.lt</a>',
      }).addTo(map);
      // Don't add kadastro by default — user toggles it on via Sklypai button

      // Map click handler — SZNS identify only
      map.on("click", (e: L.LeafletMouseEvent) => {
        if (sznsActiveRef.current) {
          identifySZNS(e.latlng, map);
        }
      });

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
              mapRef.current.fitBounds(bounds, {
                paddingTopLeft: [80, 120],
                paddingBottomRight: [420, 80],
                maxZoom: 17,
                animate: true,
              });
            }
          }
          onParcelSelect(parcel, feature);

          onLogSearch?.({
            cadastralNumber: cadastralNr,
            address: parcel.address,
            lat: parcel.lat,
            lng: parcel.lng,
            searchMethod: 'cadastral',
          });

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
              .catch(() => {});
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
