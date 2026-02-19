import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  // Use WMS GetFeatureInfo to identify parcels at a clicked point
  // We need to calculate a bounding box and pixel position
  const size = 256;
  const resolution = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  const halfExtent = (resolution * size) / 2;

  // Calculate bbox in EPSG:4326
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

  console.log("WMS GetFeatureInfo URL:", `${WMS_URL}?${params}`);

  try {
    const response = await fetch(`${WMS_URL}?${params}`);
    console.log("WMS GetFeatureInfo status:", response.status);
    const text = await response.text();
    console.log("WMS GetFeatureInfo response (first 500):", text.substring(0, 500));

    if (response.ok) {
      try {
        const data = JSON.parse(text);
        if (data.features && data.features.length > 0) {
          return jsonResponse(data);
        }
      } catch {
        // Try to parse as HTML/text
        const ntrMatch = text.match(/NTR_ID[:\s]*(\d+)/);
        const plotasMatch = text.match(/PLOTAS_J[:\s]*(\d+)/);
        if (ntrMatch) {
          return jsonResponse({
            features: [
              {
                type: "Feature",
                properties: {
                  NTR_ID: ntrMatch[1],
                  PLOTAS_J: plotasMatch ? parseInt(plotasMatch[1]) : undefined,
                },
                geometry: null,
              },
            ],
          });
        }
      }
    }

    // Try with different layer IDs for different zoom levels
    for (const layerId of ["27", "33", "15"]) {
      const params2 = new URLSearchParams(params);
      params2.set("QUERY_LAYERS", layerId);
      params2.set("LAYERS", layerId);

      const response2 = await fetch(`${WMS_URL}?${params2}`);
      if (response2.ok) {
        const text2 = await response2.text();
        console.log(`Layer ${layerId} response:`, text2.substring(0, 300));
        try {
          const data2 = JSON.parse(text2);
          if (data2.features && data2.features.length > 0) {
            return jsonResponse(data2);
          }
        } catch {
          const ntrMatch2 = text2.match(/NTR_ID[:\s]*(\d+)/);
          if (ntrMatch2) {
            return jsonResponse({
              features: [
                {
                  type: "Feature",
                  properties: { NTR_ID: ntrMatch2[1] },
                  geometry: null,
                },
              ],
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("WMS GetFeatureInfo error:", e);
  }

  return jsonResponse({ features: [] });
}

async function searchByCadastralNumber(cadastralNumber: string) {
  const cleaned = cadastralNumber.trim();
  console.log("Searching for:", cleaned);

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    console.log(`Downloading bucket-1/gis_pub_parcels_62.json...`);
    const { data, error } = await supabase.storage.from("bucket-1").download("gis_pub_parcels_62.json");

    if (error) {
      console.error("Storage download error:", error);
    } else if (data) {
      const text = await data.text();
      const json = JSON.parse(text);

      // Handle both GeoJSON "features" array or flat JSON array
      const features = json.features || (Array.isArray(json) ? json : []);

      if (features.length > 0) {
        // Log the keys of the first item to debug property names (check Supabase logs)
        console.log("File loaded. First item keys:", Object.keys(features[0].properties || {}));
      }

      // Helper to strip dashes/spaces for comparison (e.g. "4400-0001" == "44000001")
      const normalize = (val: any) => String(val || "").replace(/\D/g, "");
      const searchTarget = normalize(cleaned);

      const feature = features.find((f: any) => normalize(f.properties?.unikalus_nr) === searchTarget);

      if (feature) {
        console.log("Found in storage:", feature.properties?.unikalus_nr);
        feature.properties.nationalCadastralReference = feature.properties.unikalus_nr;
        // Ensure lat/lng are set for the map to zoom correctly if geometry is missing/complex
        if (!feature.geometry && feature.properties.center_lat) {
          feature.properties.lat = feature.properties.center_lat;
          feature.properties.lng = feature.properties.center_lon;
        }
        return jsonResponse({ features: [feature] });
      } else {
        console.log(`No match found for ${searchTarget} in ${features.length} records.`);
      }
    }
  } catch (e) {
    console.error("Storage search critical error:", e);
  }

  // Try the Registrų centras NTR public search
  // The NTR web search uses this endpoint
  try {
    const searchUrl = `https://www.registrucentras.lt/ntr/paieskos_rez.php?kadNr=${encodeURIComponent(cleaned)}&format=json`;
    console.log("Trying RC search:", searchUrl);
    const rcResponse = await fetch(searchUrl, {
      headers: {
        Accept: "application/json, text/html",
        "User-Agent": "Mozilla/5.0",
      },
    });
    console.log("RC search status:", rcResponse.status);
    if (rcResponse.ok) {
      const rcText = await rcResponse.text();
      console.log("RC search response (first 500):", rcText.substring(0, 500));
    }
  } catch (e) {
    console.log("RC search error:", e);
  }

  // Try geocoding via ArcGIS Online
  try {
    const geocodeUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(cleaned)}&f=json&countryCode=LT&maxLocations=1&outFields=*`;
    console.log("Trying ArcGIS geocode...");
    const geoResponse = await fetch(geocodeUrl);
    console.log("ArcGIS geocode status:", geoResponse.status);

    if (geoResponse.ok) {
      const geoData = await geoResponse.json();
      console.log("ArcGIS geocode candidates:", geoData.candidates?.length);

      if (geoData.candidates && geoData.candidates.length > 0) {
        const candidate = geoData.candidates[0];
        const lat = candidate.location.y;
        const lng = candidate.location.x;

        // Now use WMS GetFeatureInfo at this location to get parcel data
        const identifyResult = await identifyByCoords(lat, lng, 18);
        const identifyData = await identifyResult.json();

        if (identifyData.features && identifyData.features.length > 0) {
          // Add location info from geocoding
          identifyData.features[0].properties.address = candidate.address;
          identifyData.features[0].properties.lat = lat;
          identifyData.features[0].properties.lng = lng;
          return jsonResponse(identifyData);
        }

        // Return geocode location even without parcel data
        return jsonResponse({
          features: [
            {
              type: "Feature",
              properties: {
                nationalCadastralReference: cleaned,
                address: candidate.address,
                lat,
                lng,
              },
              geometry: null,
            },
          ],
          geocoded: true,
        });
      }
    }
  } catch (e) {
    console.error("ArcGIS geocode error:", e);
  }

  return jsonResponse({ features: [], error: "Parcel not found" });
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
