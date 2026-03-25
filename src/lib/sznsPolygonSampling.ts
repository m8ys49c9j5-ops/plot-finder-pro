/**
 * Polygon-based SZNS (Special Land Use Conditions) sampling.
 * Scans entire parcel geometry via a grid of sample points,
 * queries the ArcGIS identify endpoint for each point,
 * and returns deduplicated, normalized zone results.
 */

import * as turf from "@turf/turf";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SZNS_IDENTIFY_BASE = "https://www.geoportal.lt/mapproxy/rc_szns/MapServer/identify";

const buildMapProxyUrl = (targetUrl: string) =>
  `${SUPABASE_URL}/functions/v1/map-proxy?url=${encodeURIComponent(targetUrl)}`;

// ── Types ──────────────────────────────────────────────────────────────

export interface SznsZone {
  id: string;
  name: string;
  type: string;
  restrictions: Record<string, any>;
}

export interface SznsPolygonResult {
  zones: SznsZone[];
  pointsQueried: number;
  failed: boolean;
}

// ── 1. Single-point API call ───────────────────────────────────────────

export async function fetchSznsAtPoint(
  lat: number,
  lng: number,
): Promise<any[]> {
  const delta = 0.002;
  const identifyUrl =
    `${SZNS_IDENTIFY_BASE}` +
    `?geometry=${lng},${lat}` +
    `&geometryType=esriGeometryPoint` +
    `&sr=4326` +
    `&layers=all` +
    `&tolerance=20` +
    `&mapExtent=${lng - delta},${lat - delta},${lng + delta},${lat + delta}` +
    `&imageDisplay=800,600,96` +
    `&returnGeometry=false` +
    `&f=json`;

  const resp = await fetch(buildMapProxyUrl(identifyUrl));
  const data = await resp.json();
  return data?.results || [];
}

// ── 2. Normalize a raw result into SznsZone ────────────────────────────

export function normalizeSznsResult(raw: any): SznsZone | null {
  if (!raw) return null;

  const attrs = raw.attributes || {};
  const layerName = raw.layerName || "";
  const layerId = raw.layerId ?? "";

  const name =
    attrs["SPECIALIOJI_SALYGA"] ||
    attrs["SPEC_SALYGA"] ||
    attrs["PAVADINIMAS"] ||
    attrs["PAVADINIM"] ||
    raw.value ||
    layerName;

  if (!name) return null;

  // Build a stable ID from layerId + some unique attr
  const uniqueKey =
    attrs["UNIKALUS_NR"] || attrs["UNR"] || attrs["KODAS"] || attrs["OBJECTID"] || attrs["UNIK_NR"] || "";
  const id = `${layerId}_${uniqueKey || name}`;

  return {
    id,
    name,
    type: layerName,
    restrictions: { ...attrs },
  };
}

// ── 3. Generate sample points inside a polygon ─────────────────────────

function generateSamplePoints(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): GeoJSON.Feature<GeoJSON.Point>[] {
  const bbox = turf.bbox(geometry);
  const width = bbox[2] - bbox[0];
  const height = bbox[3] - bbox[1];
  const maxDim = Math.max(width, height);

  const divisions = [5, 10, 20];
  let points: GeoJSON.Feature<GeoJSON.Point>[] = [];

  for (const div of divisions) {
    const cellSize = maxDim / div;
    if (cellSize <= 0) continue;

    const grid = turf.pointGrid(bbox as turf.BBox, cellSize, {
      units: "degrees",
    });

    const poly = geometry.type === "MultiPolygon"
      ? turf.multiPolygon(geometry.coordinates)
      : turf.polygon(geometry.coordinates);

    points = grid.features.filter((pt) =>
      turf.booleanPointInPolygon(pt, poly),
    );

    if (points.length > 0 && points.length <= 50) break;
    if (points.length > 50) {
      // Too many — try next (larger) division won't help, so trim grid
      // Use a coarser grid: increase cell size
      const coarserSize = maxDim / Math.max(3, Math.floor(div / 2));
      const coarserGrid = turf.pointGrid(bbox as turf.BBox, coarserSize, {
        units: "degrees",
      });
      points = coarserGrid.features.filter((pt) =>
        turf.booleanPointInPolygon(pt, poly),
      );
      if (points.length > 50) points = points.slice(0, 50);
      break;
    }
  }

  // If still no points, use centroid as fallback
  if (points.length === 0) {
    const poly = geometry.type === "MultiPolygon"
      ? turf.multiPolygon(geometry.coordinates)
      : turf.polygon(geometry.coordinates);
    points = [turf.centroid(poly)];
  }

  return points;
}

// ── 4. Main polygon sampling function ──────────────────────────────────

export async function fetchSznsForPolygon(
  geometry: GeoJSON.Geometry,
  abortSignal?: { cancelled: boolean },
): Promise<SznsPolygonResult> {
  if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
    return { zones: [], pointsQueried: 0, failed: true };
  }

  const geom = geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
  const samplePoints = generateSamplePoints(geom);

  const zonesMap = new Map<string, SznsZone>();
  const queriedCoords = new Set<string>();
  let pointsQueried = 0;
  let allFailed = true;
  let consecutiveNoNew = 0;

  const BATCH_SIZE = 5;

  for (let i = 0; i < samplePoints.length; i += BATCH_SIZE) {
    // Check abort
    if (abortSignal?.cancelled) {
      return { zones: Array.from(zonesMap.values()), pointsQueried, failed: false };
    }

    // Early stopping: if ≥15 points processed and no new zones in last batch
    if (pointsQueried >= 15 && consecutiveNoNew >= 1) {
      break;
    }

    const batch = samplePoints.slice(i, i + BATCH_SIZE);
    const prevSize = zonesMap.size;

    const promises = batch.map(async (pt) => {
      const [lng, lat] = pt.geometry.coordinates;
      const coordKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;

      if (queriedCoords.has(coordKey)) return;
      queriedCoords.add(coordKey);

      try {
        const results = await fetchSznsAtPoint(lat, lng);
        allFailed = false;
        for (const raw of results) {
          const zone = normalizeSznsResult(raw);
          if (zone && !zonesMap.has(zone.id)) {
            zonesMap.set(zone.id, zone);
          }
        }
      } catch (e) {
        console.warn("SZNS point query failed:", e);
      }
    });

    await Promise.all(promises);
    pointsQueried += batch.length;

    if (zonesMap.size === prevSize) {
      consecutiveNoNew++;
    } else {
      consecutiveNoNew = 0;
    }
  }

  return {
    zones: Array.from(zonesMap.values()),
    pointsQueried,
    failed: allFailed && pointsQueried > 0,
  };
}
