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
  console.log("=== CADASTRAL SEARCH START ===");
  console.log("Raw input:", cadastralNumber);
  console.log("Cleaned input:", cleaned);

  // Normalize for matching: strip spaces, dashes, slashes, dots, colons
  const normalize = (val: string): string => val.replace(/[\s\-\/\.\:]/g, "").toLowerCase();
  const searchTarget = normalize(cleaned);
  console.log("Normalized search target:", searchTarget);

  // Determine which file to search based on cadastral number prefix
  // The files are organized by savivaldybė code (first 2 digits of kadastro_nr)
  // gis_pub_parcels_62.json = Molėtų r. sav. (code 62)
  // gis_pub_parcels_13.json = Vilniaus m. sav. (code 13)
  const fileMap: Record<string, { folder: string; file: string }> = {
    "62": { folder: "Moletai", file: "gis_pub_parcels_62.json" },
    "13": { folder: "Vilnius", file: "gis_pub_parcels_13.json" },
  };

  // Extract the sav_kodas from the cadastral number
  // kadastro_nr format: "6267/0004:0211" -> first 2 digits = "62"
  // unikalus_nr format: 626700040211 -> first 2 digits = "62"
  const digitsOnly = cleaned.replace(/\D/g, "");
  const savCode = digitsOnly.substring(0, 2);
  console.log("Detected savivaldybė code:", savCode);

  const fileInfo = fileMap[savCode];
  if (!fileInfo) {
    console.log("No file mapping for sav code:", savCode, "— available:", Object.keys(fileMap));
    return jsonResponse({ features: [], error: `Nėra duomenų savivaldybei su kodu ${savCode}. Turimi: ${Object.keys(fileMap).join(", ")}` });
  }

  const filePath = `${fileInfo.folder}/${fileInfo.file}`;
  console.log("Target file:", filePath);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Instead of downloading the whole file and parsing JSON (causes OOM on 78MB+),
    // we use a streaming text search approach.
    // We download the file as a stream and search for the cadastral number in the raw text.
    
    console.log(`Downloading ${filePath} as stream...`);
    const { data, error } = await supabase.storage.from("bucket-1").download(filePath);

    if (error) {
      console.error("Storage download error:", JSON.stringify(error));
      return jsonResponse({ features: [], error: `Storage error: ${error.message}` });
    }
    if (!data) {
      return jsonResponse({ features: [], error: "File not found" });
    }

    console.log("Blob size:", data.size, "bytes");

    // Strategy: search for the cadastral number in the raw text,
    // then extract just the surrounding Feature object.
    // We search for both unikalus_nr (number) and kadastro_nr (string with slashes)
    const text = await data.text();
    console.log("File loaded as text, length:", text.length);

    // Build search patterns based on input
    // Input could be: "6267/0004:0211" or "626700040211" or "6267-0004-0211"
    const searchPatterns: string[] = [];

    // Pattern 1: the raw cleaned input
    searchPatterns.push(`"${cleaned}"`);

    // Pattern 2: as kadastro_nr format "XXXX/XXXX:XXXX" 
    if (digitsOnly.length >= 12) {
      const kadFormat = `${digitsOnly.substring(0,4)}/${digitsOnly.substring(4,8)}:${digitsOnly.substring(8)}`;
      searchPatterns.push(`"${kadFormat}"`);
    }

    // Pattern 3: as unikalus_nr (just digits, as number - no quotes)
    searchPatterns.push(`: ${digitsOnly}`);
    searchPatterns.push(`:${digitsOnly}`);

    // Pattern 4: with quotes (string unikalus_nr)
    searchPatterns.push(`"${digitsOnly}"`);

    console.log("Search patterns:", searchPatterns);

    let featureStart = -1;

    for (const pattern of searchPatterns) {
      const idx = text.indexOf(pattern);
      if (idx !== -1) {
        console.log(`Pattern "${pattern}" found at index ${idx}`);
        // Walk backwards to find the start of this Feature object: { "type": "Feature"
        featureStart = text.lastIndexOf('{ "type": "Feature"', idx);
        if (featureStart === -1) {
          featureStart = text.lastIndexOf('{"type":"Feature"', idx);
        }
        if (featureStart === -1) {
          featureStart = text.lastIndexOf('{"type": "Feature"', idx);
        }
        if (featureStart !== -1) {
          console.log("Feature start found at index:", featureStart);
          break;
        }
      }
    }

    if (featureStart === -1) {
      console.log("=== NO MATCH found in file ===");
      // Log first feature's properties for debugging
      const firstFeatureIdx = text.indexOf('"properties"');
      if (firstFeatureIdx !== -1) {
        console.log("First feature properties preview:", text.substring(firstFeatureIdx, firstFeatureIdx + 300));
      }
    } else {
      // Extract the Feature JSON by counting braces
      let braceCount = 0;
      let featureEnd = -1;
      for (let i = featureStart; i < text.length && i < featureStart + 50000; i++) {
        if (text[i] === '{') braceCount++;
        if (text[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            featureEnd = i + 1;
            break;
          }
        }
      }

      if (featureEnd !== -1) {
        const featureStr = text.substring(featureStart, featureEnd);
        console.log("Extracted feature JSON length:", featureStr.length);
        console.log("Feature preview:", featureStr.substring(0, 500));

        try {
          const feature = JSON.parse(featureStr);
          const props = feature.properties || {};
          console.log("=== PARSED FEATURE ===");
          console.log("Properties:", JSON.stringify(props).substring(0, 500));
          console.log("Has geometry:", !!feature.geometry);
          if (feature.geometry) {
            console.log("Geometry type:", feature.geometry.type);
            console.log("CRS note: coordinates are in EPSG:3346 (LKS94), need conversion to WGS84");
          }

          // Set nationalCadastralReference for frontend
          props.nationalCadastralReference = props.kadastro_nr || props.unikalus_nr || cleaned;

          // Convert EPSG:3346 (LKS94) coordinates to EPSG:4326 (WGS84) for Leaflet
          if (feature.geometry && feature.geometry.coordinates) {
            feature.geometry = convertLKS94toWGS84(feature.geometry);
            console.log("Geometry converted to WGS84");
            console.log("Converted coords preview:", JSON.stringify(feature.geometry.coordinates).substring(0, 200));
          }

          console.log("=== RETURNING RESULT ===");
          return jsonResponse({ features: [feature] });
        } catch (parseErr) {
          console.error("Feature JSON parse error:", parseErr);
          console.log("Problematic JSON:", featureStr.substring(0, 200), "...", featureStr.substring(featureStr.length - 200));
        }
      } else {
        console.error("Could not find feature end (brace mismatch)");
      }
    }
  } catch (e) {
    console.error("Storage search critical error:", e instanceof Error ? e.message : String(e));
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

// Convert LKS94 (EPSG:3346) coordinates to WGS84 (EPSG:4326)
// Using simplified affine approximation for Lithuania
function convertLKS94toWGS84(geometry: any): any {
  const convertCoord = (x: number, y: number): [number, number] => {
    // LKS94 to WGS84 approximate conversion for Lithuania
    // Based on the TM projection parameters for EPSG:3346
    // Central meridian: 24°, scale factor: 0.9998, false easting: 500000, false northing: 0
    const a = 6378137.0;
    const f = 1 / 298.257223563;
    const e2 = 2 * f - f * f;
    const k0 = 0.9998;
    const lon0 = 24.0 * Math.PI / 180;
    const fe = 500000;

    const xAdj = x - fe;
    const M = y / k0;
    const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

    const phi1 = mu + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu)
                    + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu)
                    + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu);

    const sinPhi1 = Math.sin(phi1);
    const cosPhi1 = Math.cos(phi1);
    const tanPhi1 = Math.tan(phi1);
    const N1 = a / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1);
    const T1 = tanPhi1 * tanPhi1;
    const C1 = (e2 / (1 - e2)) * cosPhi1 * cosPhi1;
    const R1 = a * (1 - e2) / Math.pow(1 - e2 * sinPhi1 * sinPhi1, 1.5);
    const D = xAdj / (N1 * k0);

    const lat = phi1 - (N1 * tanPhi1 / R1) * (
      D * D / 2
      - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * (e2 / (1 - e2))) * D * D * D * D / 24
      + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * (e2 / (1 - e2)) - 3 * C1 * C1) * D * D * D * D * D * D / 720
    );

    const lon = lon0 + (
      D
      - (1 + 2 * T1 + C1) * D * D * D / 6
      + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * (e2 / (1 - e2)) + 24 * T1 * T1) * D * D * D * D * D / 120
    ) / cosPhi1;

    return [lon * 180 / Math.PI, lat * 180 / Math.PI];
  };

  const convertCoords = (coords: any, depth: number): any => {
    if (depth === 0) {
      // Single coordinate pair [x, y]
      return convertCoord(coords[0], coords[1]);
    }
    return coords.map((c: any) => convertCoords(c, depth - 1));
  };

  const geomType = geometry.type;
  let depth = 0;
  if (geomType === "Point") depth = 0;
  else if (geomType === "LineString" || geomType === "MultiPoint") depth = 1;
  else if (geomType === "Polygon" || geomType === "MultiLineString") depth = 2;
  else if (geomType === "MultiPolygon") depth = 3;

  return {
    type: geomType,
    coordinates: convertCoords(geometry.coordinates, depth),
  };
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
