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

    // Use direct HTTP fetch with streaming to avoid loading 78MB+ into memory
    const storageUrl = `${supabaseUrl}/storage/v1/object/bucket-1/${filePath}`;
    console.log("Fetching via streaming:", storageUrl);

    const response = await fetch(storageUrl, {
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
      },
    });

    if (!response.ok) {
      console.error("Storage fetch error:", response.status, response.statusText);
      return jsonResponse({ features: [], error: `Storage error: ${response.status}` });
    }
    if (!response.body) {
      return jsonResponse({ features: [], error: "No response body" });
    }

    console.log("Response status:", response.status, "Content-Length:", response.headers.get("content-length"));

    // Build search patterns based on input
    const searchPatterns: string[] = [];
    searchPatterns.push(`"${cleaned}"`);
    if (digitsOnly.length >= 12) {
      const kadFormat = `${digitsOnly.substring(0,4)}/${digitsOnly.substring(4,8)}:${digitsOnly.substring(8)}`;
      searchPatterns.push(`"${kadFormat}"`);
    }
    searchPatterns.push(`"unikalus_nr": ${digitsOnly},`);
    searchPatterns.push(`"unikalus_nr":${digitsOnly},`);
    console.log("Search patterns:", searchPatterns);

    // Stream through the file with a sliding buffer
    // Keep a buffer large enough to contain a Feature + overlap for boundary matching
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const MAX_BUFFER = 200000; // 200KB buffer — enough for any single feature
    let found = false;
    let totalRead = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      totalRead += value.byteLength;

      // Check if any search pattern is in the buffer
      let matchIdx = -1;
      let matchedPattern = "";
      for (const pattern of searchPatterns) {
        const idx = buffer.indexOf(pattern);
        if (idx !== -1) {
          matchIdx = idx;
          matchedPattern = pattern;
          break;
        }
      }

      if (matchIdx !== -1) {
        console.log(`Pattern "${matchedPattern}" found after reading ${totalRead} bytes`);

        // We found a match. Now we need to extract the full Feature object.
        // Walk backwards to find { "type": "Feature"
        let featureStart = buffer.lastIndexOf('{ "type": "Feature"', matchIdx);
        if (featureStart === -1) featureStart = buffer.lastIndexOf('{"type":"Feature"', matchIdx);
        if (featureStart === -1) featureStart = buffer.lastIndexOf('{"type": "Feature"', matchIdx);

        if (featureStart === -1) {
          console.error("Could not find Feature start before match");
          break;
        }

        // Read more chunks if needed to get the complete feature (geometry can be large)
        // Keep reading until we can extract the complete feature
        let attempts = 0;
        while (attempts < 50) {
          // Try to extract feature by counting braces
          let braceCount = 0;
          let featureEnd = -1;
          for (let i = featureStart; i < buffer.length; i++) {
            if (buffer[i] === '{') braceCount++;
            if (buffer[i] === '}') {
              braceCount--;
              if (braceCount === 0) {
                featureEnd = i + 1;
                break;
              }
            }
          }

          if (featureEnd !== -1) {
            // Successfully extracted the complete feature
            const featureStr = buffer.substring(featureStart, featureEnd);
            console.log("Extracted feature JSON length:", featureStr.length);

            // Cancel the stream — we don't need more data
            reader.cancel();

            try {
              const feature = JSON.parse(featureStr);
              const props = feature.properties || {};
              console.log("=== PARSED FEATURE ===");
              console.log("kadastro_nr:", props.kadastro_nr);
              console.log("skl_plotas:", props.skl_plotas);
              console.log("Has geometry:", !!feature.geometry);

              props.nationalCadastralReference = props.kadastro_nr || props.unikalus_nr || cleaned;

              if (feature.geometry && feature.geometry.coordinates) {
                feature.geometry = convertLKS94toWGS84(feature.geometry);
                console.log("Geometry converted to WGS84");
              }

              return jsonResponse({ features: [feature] });
            } catch (parseErr) {
              console.error("Feature JSON parse error:", parseErr);
              break;
            }
          }

          // Need more data for complete feature
          const { done: d2, value: v2 } = await reader.read();
          if (d2) break;
          buffer += decoder.decode(v2, { stream: true });
          attempts++;
        }

        found = true;
        break;
      }

      // Trim buffer to avoid memory growth — keep last 10KB for boundary overlap
      if (buffer.length > MAX_BUFFER) {
        buffer = buffer.substring(buffer.length - 10000);
      }
    }

    if (!found) {
      // Make sure stream is fully consumed/cancelled
      try { reader.cancel(); } catch (_) {}
      console.log("=== NO MATCH found in streamed file ===");
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
