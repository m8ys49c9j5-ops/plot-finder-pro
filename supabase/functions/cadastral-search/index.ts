import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WMS_URL = "https://www.geoportal.lt/mapproxy/rc_kadastro_zemelapis/MapServer/WMSServer";

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

async function searchByCadastralNumber(cadastralNumber: string) {
  const cleaned = cadastralNumber.trim();
  const digitsOnly = cleaned.replace(/\D/g, "");
  
  console.log(`Searching DB for: ${cleaned} or ${digitsOnly}`);

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey);

  // 1. Search in our database (Lightning fast)
  const { data, error } = await supabase
    .from('parcels')
    .select('feature')
    .or(`kadastro_nr.eq.${cleaned},unikalus_nr.eq.${digitsOnly}`)
    .limit(1);

  if (error) {
    console.error("DB error:", error);
  }

  if (data && data.length > 0) {
    console.log("Found in database!");
    const feature = data[0].feature;
    
    // Format response for the UI
    const props = feature.properties || {};
    props.nationalCadastralReference = props.kadastro_nr || props.unikalus_nr?.toString() || cleaned;

    // Convert coordinates for the map
    if (feature.geometry && feature.geometry.coordinates) {
      feature.geometry = convertLKS94toWGS84(feature.geometry);
    }
    
    return jsonResponse({ features: [feature] });
  }

  // 2. If not found in DB, fallback to INSPIRE WFS (covers all of Lithuania)
  try {
    console.log("Trying INSPIRE WFS fallback...");
    const wfsUrl = `https://www.inspire-geoportal.lt/geoserver/cp/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=cp:CadastralParcel&count=1&outputFormat=application/json&srsName=EPSG:4326&CQL_FILTER=nationalCadastralReference%20LIKE%20'%25${encodeURIComponent(cleaned)}%25'`;
    const wfsRes = await fetch(wfsUrl);
    
    if (wfsRes.ok) {
      const wfsData = await wfsRes.json();
        if (wfsData.features && wfsData.features.length > 0) {
          const feature = wfsData.features[0];
          const props = feature.properties || {};
          props.nationalCadastralReference = props.nationalCadastralReference || cleaned;
          return jsonResponse({ features: [feature] });
        }
    }
  } catch (e) {
    console.error("WFS error:", e);
  }

  return jsonResponse({ features:[], error: "Sklypas nerastas" });
}

// --- Helper functions ---

async function identifyByCoords(lat: number, lng: number, zoom: number) {
  const size = 256;
  const resolution = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  const halfExtent = (resolution * size) / 2;
  const degPerMeter = 1 / 111320;
  const halfDegLat = halfExtent * degPerMeter;
  const halfDegLng = (halfExtent * degPerMeter) / Math.cos((lat * Math.PI) / 180);
  const bbox = `${lng - halfDegLng},${lat - halfDegLat},${lng + halfDegLng},${lat + halfDegLat}`;

  const params = new URLSearchParams({
    SERVICE: "WMS", VERSION: "1.1.1", REQUEST: "GetFeatureInfo", FORMAT: "image/png",
    TRANSPARENT: "true", QUERY_LAYERS: "21", LAYERS: "21", INFO_FORMAT: "application/json",
    FEATURE_COUNT: "1", X: Math.floor(size / 2).toString(), Y: Math.floor(size / 2).toString(),
    SRS: "EPSG:4326", WIDTH: size.toString(), HEIGHT: size.toString(), BBOX: bbox,
  });

  try {
    const response = await fetch(`${WMS_URL}?${params}`);
    if (response.ok) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (data.features && data.features.length > 0) return jsonResponse(data);
      } catch {
        const ntrMatch = text.match(/NTR_ID*(\d+)/);
        const plotasMatch = text.match(/PLOTAS_J*(\d+)/);
        if (ntrMatch) {
          return jsonResponse({
            features:[
              {
                type: "Feature",
                properties: {
                  NTR_ID: ntrMatch,
                  PLOTAS_J: plotasMatch ? parseInt(plotasMatch) : undefined
                },
                geometry: null
              }
            ]
          });
        }
      }
    }
  } catch (e) { console.error("WMS GetFeatureInfo error:", e); }
  return jsonResponse({ features:[] });
}

function convertLKS94toWGS84(geometry: any): any {
  const convertCoord = (x: number, y: number) => {
    const a = 6378137.0, f = 1 / 298.257223563, e2 = 2 * f - f * f, k0 = 0.9998, lon0 = 24.0 * Math.PI / 180, fe = 500000;
    const xAdj = x - fe, M = y / k0;
    const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const phi1 = mu + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu) + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu);
    const sinPhi1 = Math.sin(phi1), cosPhi1 = Math.cos(phi1), tanPhi1 = Math.tan(phi1);
    const N1 = a / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1), T1 = tanPhi1 * tanPhi1, C1 = (e2 / (1 - e2)) * cosPhi1 * cosPhi1;
    const R1 = a * (1 - e2) / Math.pow(1 - e2 * sinPhi1 * sinPhi1, 1.5), D = xAdj / (N1 * k0);
    const lat = phi1 - (N1 * tanPhi1 / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * (e2 / (1 - e2))) * D * D * D * D / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * (e2 / (1 - e2)) - 3 * C1 * C1) * D * D * D * D * D * D / 720);
    const lon = lon0 + (D - (1 + 2 * T1 + C1) * D * D * D / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * (e2 / (1 - e2)) + 24 * T1 * T1) * D * D * D * D * D / 120) / cosPhi1;
    return;
  };

  const convertCoords = (coords: any, depth: number): any => {
    if (depth === 0) return convertCoord(coords, coords);
    return coords.map((c: any) => convertCoords(c, depth - 1));
  };

  const geomType = geometry.type;
  let depth = 0;
  if (geomType === "Point") depth = 0;
  else if (geomType === "LineString" || geomType === "MultiPoint") depth = 1;
  else if (geomType === "Polygon" || geomType === "MultiLineString") depth = 2;
  else if (geomType === "MultiPolygon") depth = 3;

  return { type: geomType, coordinates: convertCoords(geometry.coordinates, depth) };
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}