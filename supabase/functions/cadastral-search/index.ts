import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// WMS endpoint for cadastral map
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

async function identifyByCoords(lat: number, lng: number, zoom: number) {
  const size = 256;
  const resolution = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  const halfExtent = (resolution * size) / 2;

  const degPerMeter = 1 / 111320;
  const halfDegLat = halfExtent * degPerMeter;
  const halfDegLng = (halfExtent * degPerMeter) / Math.cos((lat * Math.PI) / 180);

  const bbox = `${lng - halfDegLng},${lat - halfDegLat},${lng + halfDegLng},${lat + halfDegLat}`;

  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.1.1",
    REQUEST: "GetFeatureInfo",
    FORMAT: "image/png",
    TRANSPARENT: "true",
    QUERY_LAYERS: "21",
    LAYERS: "21",
    INFO_FORMAT: "application/json",
    FEATURE_COUNT: "1",
    X: Math.floor(size / 2).toString(),
    Y: Math.floor(size / 2).toString(),
    SRS: "EPSG:4326",
    WIDTH: size.toString(),
    HEIGHT: size.toString(),
    BBOX: bbox,
  });

  try {
    const response = await fetch(`${WMS_URL}?${params}`);
    if (response.ok) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (data.features && data.features.length > 0) {
          return jsonResponse(data);
        }
      } catch {
        const ntrMatch = text.match(/NTR_ID*(\d+)/);
        const plotasMatch = text.match(/PLOTAS_J*(\d+)/);
        if (ntrMatch) {
          return jsonResponse({
            features:,
                  PLOTAS_J: plotasMatch ? parseInt(plotasMatch) : undefined,
                },
                geometry: null,
              }
            ],
          });
        }
      }
    }

    for (const layerId of) {
      const params2 = new URLSearchParams(params);
      params2.set("QUERY_LAYERS", layerId);
      params2.set("LAYERS", layerId);

      const response2 = await fetch(`${WMS_URL}?${params2}`);
      if (response2.ok) {
        const text2 = await response2.text();
        try {
          const data2 = JSON.parse(text2);
          if (data2.features && data2.features.length > 0) {
            return jsonResponse(data2);
          }
        } catch {
          const ntrMatch2 = text2.match(/NTR_ID*(\d+)/);
          if (ntrMatch2) {
            return jsonResponse({
              features: },
                  geometry: null,
                }
              ],
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("WMS GetFeatureInfo error:", e);
  }

  return jsonResponse({ features:[] });
}

async function searchByCadastralNumber(cadastralNumber: string) {
  const cleaned = cadastralNumber.trim();
  console.log("=== CADASTRAL SEARCH START ===");
  console.log("Raw input:", cadastralNumber);
  
  const digitsOnly = cleaned.replace(/\D/g, "");

  const fileMap: Record<string, { folder: string; file: string }> = {
    "62": { folder: "Moletai", file: "gis_pub_parcels_62.json" },
    "13": { folder: "Vilnius", file: "gis_pub_parcels_13.json" },
  };

  let filesToSearch: { folder: string; file: string }[] =[];

  // Detect if it's a kadastro_nr or unikalus_nr
  if (cleaned.includes('/') || cleaned.includes(':')) {
    const savCode = digitsOnly.substring(0, 2);
    if (fileMap) filesToSearch.push(fileMap);
  } else if (digitsOnly.len
