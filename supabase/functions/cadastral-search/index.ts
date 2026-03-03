import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WMS_URL = "https://www.geoportal.lt/mapproxy/rc_kadastro_zemelapis/MapServer/WMSServer";

// Create a map to cache search results
const cache = new Map<string, any>();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, cadastralNumber, lat, lng, zoom } = await req.json();

    if (action === "identify" && lat !== undefined && lng !== undefined) {
      return await identifyByCoords(lat, lng, zoom || 17);
    }

    if (action === "search" && cadastralNumber) {
      return await searchByCadastralNumber(cadastralNumber);
    }

    return jsonResponse({ error: "Invalid request" }, 400);
  } catch (error) {
    console.error("Error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// ---------- Search ----------

async function searchByCadastralNumber(cadastralNumber: string) {
  const cleaned = cadastralNumber.trim();
  const digitsOnly = cleaned.replace(/\D/g, "");

  console.log(`Searching for: "${cleaned}" | digits: "${digitsOnly}"`);

  // Check cache first
  if (cache.has(cleaned)) {
    return jsonResponse(cache.get(cleaned));
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // --- 1. Exact match by kadastro_nr or unikalus_nr ---
    const { data: exactData, error: exactError } = await supabase
      .from("parcels")
      .select("feature, kadastro_nr, unikalus_nr")
      .or(`kadastro_nr.eq.${cleaned},unikalus_nr.eq.${digitsOnly}`)
      .limit(1);

    if (exactError) console.error("DB exact match error:", exactError);

    if (exactData && exactData.length > 0) {
      console.log("Found via exact DB match");
      const response = buildFeatureResponse(exactData[0].feature, cleaned);
      cache.set(cleaned, response); // Cache the result
      return response;
    }

    // --- 2. Fuzzy digit-only match ---
    if (digitsOnly.length >= 6) {
      const { data: jsonbData, error: jsonbError } = await supabase
        .from("parcels")
        .select("feature, kadastro_nr, unikalus_nr")
        .or(`kadastro_nr.ilike.%${digitsOnly}%,unikalus_nr.ilike.%${digitsOnly}%`)
        .limit(5);

      if (jsonbError) console.error("DB fuzzy match error:", jsonbError);

      if (jsonbData && jsonbData.length > 0) {
        const match = jsonbData.find((row) => {
          const kadDigits = (row['kadastro_nr'] ?? "").replace(/\D/g, "");
          const uniDigits = (row.unikalus_nr ?? "").replace(/\D/g, "");
          return kadDigits === digitsOnly || uniDigits === digitsOnly;
        });

        if (match) {
          console.log("Found via fuzzy digit DB match");
          const response = buildFeatureResponse(match.feature, cleaned);
          cache.set(cleaned, response); // Cache the result
          return response;
        }
      }
    }

    // --- 3. Partial kadastro_nr match ---
    if (cleaned.length >= 4) {
      const { data: partialData, error: partialError } = await supabase
        .from("parcels")
        .select("feature")
        .like("kadastro_nr", `%${cleaned}%`)
        .limit(1);

      if (partialError) console.error("DB partial match error:", partialError.message);
      else if (partialData && partialData.length > 0) {
        console.log("Found via partial kadastro_nr match");
        const response = buildFeatureResponse(partialData[0].feature, cleaned);
        cache.set(cleaned, response); // Cache the result
        return response;
      }
    }

    // --- 4. INSPIRE WFS fallback ---
    try {
      console.log("Trying INSPIRE WFS fallback...");
      const wfsUrl = `https://www.inspire-geoportal.lt/geoserver/cp/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=cp:CadastralParcel&count=1&outputFormat=application/json&srsName=EPSG:4326&CQL_FILTER=nationalCadastralReference%20LIKE%20'%25${encodeURIComponent(cleaned)}%25'`;
      const wfsRes = await fetch(wfsUrl, { signal: AbortSignal.timeout(8000) });

      if (wfsRes.ok) {
        const wfsData = await wfsRes.json();
        if (wfsData.features && wfsData.features.length > 0) {
          const feature = wfsData.features[0];
          const props = feature.properties || {};
          props.nationalCadastralReference = props.nationalCadastralReference || cleaned;
          cache.set(cleaned, jsonResponse({ features: [feature] }));
          return jsonResponse({ features: [feature] });
        }
      }
    } catch (e) {
      console.error("WFS error:", e);
    }

    return jsonResponse({ features: [], error: "Sklypas nerastas" });
  } finally {
    // Optionally, you can set an expiration time for the cache
    setTimeout(() => cache.delete(cleaned), 3600000); // Cache expires after 1 hour
  }
}

// ---------- Build response ----------

function buildFeatureResponse(feature: any, searchInput: string) {
  if (!feature) return jsonResponse({ features: [], error: "Tuščias įrašas DB" });

  const props = feature.properties || {};

  if (feature.geometry?.coordinates) {
    const centroidLKS94 = computeCentroid(feature.geometry);
    if (centroidLKS94) {
      const [lon, lat] = lks94ToWGS84(centroidLKS94[0], centroidLKS94[1]);
      props.centroid_lat = lat;
      props.centroid_lon = lon;
      props.centroid_lks94_x = centroidLKS94[0];
      props.centroid_lks94_y = centroidLKS94[1];
      props.google_maps_link = `https://maps.google.com/?q=${lat},${lon}`;
      console.log(`Centroid WGS84: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    }
    feature.geometry = convertGeometryLKS94toWGS84(feature.geometry);
  }

  props.nationalCadastralReference =
    props.kadastro_nr || props.unikalus_nr?.toString() || searchInput;

  return jsonResponse({ features: [feature] });
}

// ---------- Coordinate conversion (LKS94 → WGS84) ----------

function lks94ToWGS84(x: number, y: number): [number, number] {
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const e2 = 2 * f - f * f;
  const k0 = 0.9998;
  const lon0 = 24.0 * Math.PI / 180;
  const fe = 500000;

  const xAdj = x - fe;
  const M = y / k0;
  const mu = M / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256));

  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 * e1 * e1) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 * e1 * e1 * e1) / 32) * Math.sin(4 * mu) +
    ((151 * e1 * e1 * e1) / 96) * Math.sin(6 * mu);

  const sinP = Math.sin(phi1), cosP = Math.cos(phi1), tanP = Math.tan(phi1);
  const N1 = a / Math.sqrt(1 - e2 * sinP * sinP);
  const T1 = tanP * tanP;
  const C1 = (e2 / (1 - e2)) * cosP * cosP;
  const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * sinP * sinP, 1.5);
  const D = xAdj / (N1 * k0);

  const lat =
    phi1 -
    (N1 * tanP / R1) *
      (D * D / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * (e2 / (1 - e2))) * D * D * D * D) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * (e2 / (1 - e2)) - 3 * C1 * C1) *
          D * D * D * D * D * D) /
          720);

  const lon =
    lon0 +
    (D -
      ((1 + 2 * T1 + C1) * D * D * D) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * (e2 / (1 - e2)) + 24 * T1 * T1) *
        D * D * D * D * D) /
        120) /
      cosP;

  return [lon * (180 / Math.PI), lat * (180 / Math.PI)];
}

function convertGeometryLKS94toWGS84(geometry: any): any {
  const convertPair = (coord: number[]): number[] => {
    const [lon, lat] = lks94ToWGS84(coord[0], coord[1]);
    return [lon, lat];
  };
  const convertRing = (ring: number[][]): number[][] => ring.map(convertPair);
  switch (geometry.type) {
    case "Point":
      return { type: "Point", coordinates: convertPair(geometry.coordinates) };
    case "LineString":
      return { type: "LineString", coordinates: convertRing(geometry.coordinates) };
    case "Polygon":
      return { type: "Polygon", coordinates: geometry.coordinates.map(convertRing) };
    case "MultiPolygon":
      return {
        type: "MultiPolygon",
        coordinates: geometry.coordinates.map((poly: number[][][]) => poly.map(convertRing)),
      };
    default:
      return geometry;
  }
}

// ---------- Centroid ----------

function computeCentroid(geometry: any): [number, number] | null {
  const ringCentroid = (ring: number[][]): { cx: number; cy: number; area: number } => {
    let area = 0, cx = 0, cy = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const cross = xi * yj - xj * yi;
      area += cross;
      cx += (xi + xj) * cross;
      cy += (yi + yj) * cross;
    }
    area /= 2;
    if (Math.abs(area) < 1e-10) {
      return {
        cx: ring.reduce((s, c) => s + c[0], 0) / ring.length,
        cy: ring.reduce((s, c) => s + c[1], 0) / ring.length,
        area: 0,
      };
    }
    return { cx: cx / (6 * area), cy: cy / (6 * area), area: Math.abs(area) };
  };

  let rings: number[][][] = [];
  if (geometry.type === "Polygon") rings = [geometry.coordinates[0]];
  else if (geometry.type === "MultiPolygon")
    rings = geometry.coordinates.map((poly: number[][][]) => poly[0]);
  else return null;

  let totalArea = 0, sumX = 0, sumY = 0;
  for (const ring of rings) {
    const { cx, cy, area } = ringCentroid(ring);
    sumX += cx * area;
    sumY += cy * area;
    totalArea += area;
  }
  if (totalArea === 0) return null;
  return [sumX / totalArea, sumY / totalArea];
}

// ---------- Identify by coordinates ----------

async function identifyByCoords(lat: number, lng: number, _zoom: number) {
  // Primary: INSPIRE WFS spatial query
  try {
    console.log(`Identify: WFS spatial query at ${lat}, ${lng}`);
    const wfsUrl = `https://www.inspire-geoportal.lt/geoserver/cp/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=cp:CadastralParcel&count=1&outputFormat=application/json&srsName=EPSG:4326&CQL_FILTER=INTERSECTS(geometry,POINT(${lng}%20${lat}))`;
    const wfsRes = await fetch(wfsUrl, { signal: AbortSignal.timeout(10000) });
    if (wfsRes.ok) {
      const wfsData = await wfsRes.json();
      if (wfsData.features && wfsData.features.length > 0) {
        const props = wfsData.features[0].properties || {};
        const kadastroNr = props.nationalCadastralReference || null;
        console.log(`WFS found cadastral nr: ${kadastroNr}`);

        // Look up in our DB for full data (area, purpose, etc.)
        if (kadastroNr) {
          const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
          );
          const { data: rows } = await supabase
            .from("parcels")
            .select("feature, kadastro_nr, unikalus_nr")
            .or(`kadastro_nr.eq.${kadastroNr},unikalus_nr.eq.${kadastroNr}`)
            .limit(1);
          if (rows && rows.length > 0) {
            console.log("Enriched with DB data");
            return buildFeatureResponse(rows[0].feature, kadastroNr);
          }
        }

        // Return WFS data directly
        return jsonResponse(wfsData);
      }
    }
  } catch (e) {
    console.error("WFS spatial query error:", e);
  }

  return jsonResponse({ features: [] });
}

// ---------- Utility ----------

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
