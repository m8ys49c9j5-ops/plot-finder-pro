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
const SZNS_BASE = "https://www.geoportal.lt/arcgis/rest/services/NZT/SZNS_DR10LT/MapServer";


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
  tileSize = 256,
) => {
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

const buildDirectExportUrl = (
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
  return exportUrl;
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
    return buildDirectExportUrl(FOREST_BASE, coords, (this as any)._map as L.Map, "png32", true);
  },
});

const MeliorTileLayer = L.TileLayer.extend({
  getTileUrl: function (coords: L.Coords) {
    return buildDirectExportUrl(MELIOR_BASE, coords, (this as any)._map as L.Map, "png32", true, "show:6");
  },
});

const SZNS_LKS_ORIGIN = { x: 18900, y: 6258000 };
const SZNS_LKS_TILE_SIZE = 512;
const SZNS_LKS_RESOLUTIONS = [
  1587.5031750063501, 793.7515875031751, 529.1677250021168,
  264.5838625010584, 132.2919312505292, 52.91677250021167,
  26.458386250105836, 13.229193125052918, 6.614596562526459,
  2.6458386250105836, 1.3229193125052918, 0.5291677250021167,
  0.26458386250105836,
];

const SznsTileLayer = L.GridLayer.extend({
  createTile: function (coords: L.Coords, done: Function) {
    const map = (this as any)._map as L.Map;
    const tileSize = 256;

    const nwPoint = coords.scaleBy(new L.Point(tileSize, tileSize));
    const sePoint = nwPoint.add(new L.Point(tileSize, tileSize));
    const nwLatLng = map.unproject(nwPoint, coords.z);
    const seLatLng = map.unproject(sePoint, coords.z);

    const nwLks = wgs84ToLKS94(nwLatLng.lat, nwLatLng.lng);
    const seLks = wgs84ToLKS94(seLatLng.lat, seLatLng.lng);

    const groundResX = Math.abs(seLks.x - nwLks.x) / tileSize;
    const groundResY = Math.abs(nwLks.y - seLks.y) / tileSize;
    const groundRes = (groundResX + groundResY) / 2;

    let lksZoom = 9;
    let minDiff = Infinity;
    SZNS_LKS_RESOLUTIONS.forEach((r, i) => {
      const diff = Math.abs(r - groundRes);
      if (diff < minDiff) { minDiff = diff; lksZoom = i; }
    });
    lksZoom = Math.max(5, Math.min(12, lksZoom));

    const lksRes = SZNS_LKS_RESOLUTIONS[lksZoom];
    const tileSizeM = SZNS_LKS_TILE_SIZE * lksRes;

    const centerLks = {
      x: (nwLks.x + seLks.x) / 2,
      y: (nwLks.y + seLks.y) / 2,
    };

    const lksTileCol = Math.floor((centerLks.x - SZNS_LKS_ORIGIN.x) / tileSizeM);
    const lksTileRow = Math.floor((SZNS_LKS_ORIGIN.y - centerLks.y) / tileSizeM);

    const lksTileLeft = SZNS_LKS_ORIGIN.x + lksTileCol * tileSizeM;
    const lksTileTop = SZNS_LKS_ORIGIN.y - lksTileRow * tileSizeM;

    const pxPerMeterX = tileSize / Math.abs(seLks.x - nwLks.x);
    const pxPerMeterY = tileSize / Math.abs(nwLks.y - seLks.y);

    const imgLeft = (lksTileLeft - nwLks.x) * pxPerMeterX;
    const imgTop = (nwLks.y - lksTileTop) * pxPerMeterY;
    const imgWidth = tileSizeM * pxPerMeterX;
    const imgHeight = tileSizeM * pxPerMeterY;

    const el = document.createElement("div");
    el.style.cssText = `width:${tileSize}px;height:${tileSize}px;overflow:hidden;position:relative;`;

    if (lksTileCol >= 0 && lksTileRow >= 0) {
      const img = document.createElement("img");
      img.src = `https://www.geoportal.lt/mapproxy/rc_szns/MapServer/tile/${lksZoom}/${lksTileRow}/${lksTileCol}`;
      img.style.cssText = `position:absolute;left:${imgLeft}px;top:${imgTop}px;width:${imgWidth}px;height:${imgHeight}px;opacity:0.75;`;
      img.onload = () => done(null, el);
      img.onerror = () => done(null, el);
      el.appendChild(img);
    } else {
      done(null, el);
    }

    return el;
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

const lks94ToWGS84 = (x: number, y: number): { lat: number; lng: number } => {
  const a  = 6378137.0;
  const f  = 1 / 298.257222101;
  const e2 = 2 * f - f * f;
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const k0 = 0.9998;
  const lng0 = 24.0 * Math.PI / 180;
  const fe = 500000;

  const M = y / k0;
  const mu = M / (a * (1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256));

  const phi1 = mu
    + (3*e1/2 - 27*e1*e1*e1/32) * Math.sin(2*mu)
    + (21*e1*e1/16 - 55*e1*e1*e1*e1/32) * Math.sin(4*mu)
    + (151*e1*e1*e1/96) * Math.sin(6*mu);

  const sinP1 = Math.sin(phi1);
  const cosP1 = Math.cos(phi1);
  const tanP1 = Math.tan(phi1);
  const N1 = a / Math.sqrt(1 - e2 * sinP1 * sinP1);
  const T1 = tanP1 * tanP1;
  const C1 = (e2 / (1 - e2)) * cosP1 * cosP1;
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * sinP1 * sinP1, 1.5);
  const D  = (x - fe) / (N1 * k0);

  const lat = phi1
    - (N1 * tanP1 / R1) * (
      D*D/2
      - (5 + 3*T1 + 10*C1 - 4*C1*C1 - 9*(e2/(1-e2))) * D*D*D*D/24
      + (61 + 90*T1 + 298*C1 + 45*T1*T1 - 252*(e2/(1-e2)) - 3*C1*C1) * D*D*D*D*D*D/720
    );

  const lng = lng0 + (
    D
    - (1 + 2*T1 + C1) * D*D*D/6
    + (5 - 2*C1 + 28*T1 - 3*C1*C1 + 8*(e2/(1-e2)) + 24*T1*T1) * D*D*D*D*D/120
  ) / cosP1;

  return { lat: lat * 180 / Math.PI, lng: lng * 180 / Math.PI };
};

// SZNS identify via ArcGIS /identify
const identifySZNS = async (latlng: L.LatLng, map: L.Map) => {
  try {
    const bounds = map.getBounds();
    const size = map.getSize();

    const sw = map.options.crs!.project(bounds.getSouthWest());
    const ne = map.options.crs!.project(bounds.getNorthEast());
    const pt = map.options.crs!.project(latlng);

    const mapExtent = `${sw.x},${sw.y},${ne.x},${ne.y}`;

    const url =
      `${SZNS_BASE}/identify?geometry=${pt.x},${pt.y}` +
      `&geometryType=esriGeometryPoint&sr=3857` +
      `&layers=all&tolerance=5` +
      `&mapExtent=${mapExtent}` +
      `&imageDisplay=${size.x},${size.y},96` +
      `&returnGeometry=false&f=json`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (data?.results && data.results.length > 0) {
      const rowsHtml = data.results.map((r: any) => {
        const p = r.attributes || {};
        const layerName = r.layerName || "";
        const salyga = p["SPECIALIOJI_SALYGA"] || p["SPEC_SALYGA"] || p["PAVADINIMAS"] || layerName;
        const plotas = p["PLOTAS_HA"] || p["PLOTAS"];
        const statusas = p["STATUSAS"] || "";
        const unikalus = p["UNIKALUS_NR"] || p["UNR"] || "";

        return `
          <div style="padding:6px 0;border-bottom:1px solid rgba(128,128,128,0.15);">
            <div style="font-size:12px;font-weight:600;color:#111;">${salyga}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:4px;">
              ${plotas != null ? `<span style="font-size:10px;background:#f0f4ff;padding:1px 6px;border-radius:4px;color:#334;">${plotas} ha</span>` : ""}
              ${statusas ? `<span style="font-size:10px;background:${statusas === "Patvirtinta" ? "#dcfce7" : "#fef9c3"};padding:1px 6px;border-radius:4px;color:#334;">${statusas}</span>` : ""}
              ${unikalus ? `<span style="font-size:10px;color:#888;">Nr. ${unikalus}</span>` : ""}
            </div>
          </div>
        `;
      }).join("");

      L.popup({ maxWidth: 380, className: "szns-popup" })
        .setLatLng(latlng)
        .setContent(`
          <div style="min-width:240px;max-width:360px;font-family:Inter,sans-serif;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888;margin-bottom:8px;">
              Specialiosios sąlygos (${data.results.length})
            </div>
            ${rowsHtml}
            <div style="font-size:10px;color:#aaa;margin-top:8px;">© NŽT / Registrų centras</div>
          </div>
        `)
        .openOn(map);
    } else {
      L.popup({ maxWidth: 240 })
        .setLatLng(latlng)
        .setContent(`<div style="font-family:Inter,sans-serif;font-size:13px;color:#666;padding:4px 0;">Šiame taške ŠZNS zonų nerasta.</div>`)
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
    // SZNS also uses identify on click
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
                sznsLayerRef.current = new (SznsTileLayer as any)("", {
                  tileSize: 256, opacity: 0.7, maxZoom: 19, zIndex: 200,
                }) as L.TileLayer;
              }
              sznsLayerRef.current!.addTo(map);
              bringKadastroToFront();
            } else {
              if (sznsLayerRef.current && map.hasLayer(sznsLayerRef.current)) {
                map.removeLayer(sznsLayerRef.current);
              }
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

      // Map click handler — SZNS details
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
