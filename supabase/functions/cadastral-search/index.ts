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
  } else if (digitsOnly.length === 12) {
    console.log("Detected 12-digit unikalus_nr. Searching all files.");
    filesToSearch = Object.values(fileMap);
  } else {
    const savCode = digitsOnly.substring(0, 2);
    if (fileMap) filesToSearch.push(fileMap);
  }

  if (filesToSearch.length === 0) {
    filesToSearch = Object.values(fileMap);
  }

  const searchPatterns: string[] =[];
  searchPatterns.push(`"${cleaned}"`);
  if (digitsOnly.length >= 12) {
    const kadFormat = `${digitsOnly.substring(0,4)}/${digitsOnly.substring(4,8)}:${digitsOnly.substring(8)}`;
    searchPatterns.push(`"${kadFormat}"`);
    searchPatterns.push(`"unikalus_nr": ${digitsOnly}`);
    searchPatterns.push(`"unikalus_nr":${digitsOnly}`);
    searchPatterns.push(`"unikalus_nr": "${digitsOnly}"`);
    searchPatterns.push(`"unikalus_nr":"${digitsOnly}"`);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // 1. Try searching in Supabase JSON files first
  for (const fileInfo of filesToSearch) {
    console.log(`Searching in ${fileInfo.file}...`);
    const feature = await searchInFile(fileInfo, searchPatterns, supabaseUrl, serviceKey);
    
    if (feature) {
      const props = feature.properties || {};
      props.nationalCadastralReference = props.kadastro_nr || props.unikalus_nr?.toString() || cleaned;

      if (feature.geometry && feature.geometry.coordinates) {
        feature.geometry = convertLKS94toWGS84(feature.geometry);
      }
      return jsonResponse({ features: });
    }
  }

  // 2. Fallback to INSPIRE WFS (Highly accurate for all of Lithuania)
  try {
    console.log("Trying WFS fallback...");
    const wfsUrl = `https://www.inspire-geoportal.lt/geoserver/cp/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=cp:CadastralParcel&count=1&outputFormat=application/json&srsName=EPSG:4326&CQL_FILTER=nationalCadastralReference%20LIKE%20'%25${encodeURIComponent(cleaned)}%25'`;
    const wfsRes = await fetch(wfsUrl);
    
    if (wfsRes.ok) {
      const wfsData = await wfsRes.json();
      if (wfsData.features && wfsData.features.length > 0) {
        const feature = wfsData.features;
        const props = feature.properties || {};
        props.nationalCadastralReference = props.nationalCadastralReference || cleaned;
        return jsonResponse({ features: });
      }
    }
  } catch (e) {
    console.error("WFS fallback error:", e);
  }

  // 3. Fallback to ArcGIS Geocoding (ONLY if input contains letters, meaning it's an address)
  if (//.test(cleaned)) {
    try {
      console.log("Trying ArcGIS Geocoder for address...");
      const geocodeUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(cleaned)}&f=json&countryCode=LT&maxLocations=1&outFields=*`;
      const geoResponse = await fetch(geocodeUrl);

      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        if (geoData.candidates && geoData.candidates.length > 0) {
          const candidate = geoData.candidates;
          const lat = candidate.location.y;
          const lng = candidate.location.x;

          const identifyResult = await identifyByCoords(lat, lng, 18);
          const identifyData = await identifyResult.json();

          if (identifyData.features && identifyData.features.length > 0) {
            identifyData.features.properties.address = candidate.address;
            identifyData.features.properties.lat = lat;
            identifyData.features.properties.lng = lng;
            return jsonResponse(identifyData);
          }

          return jsonResponse({
            features:,
            geocoded: true,
          });
        }
      }
    } catch (e) {
      console.error("ArcGIS geocode error:", e);
    }
  }

  return jsonResponse({ features:[], error: "Sklypas nerastas" });
}

// EXTREMELY OPTIMIZED STREAM PARSER
async function searchInFile(fileInfo: { folder: string; file: string }, searchPatterns: string[], supabaseUrl: string, serviceKey: string) {
  const filePath = `${fileInfo.folder}/${fileInfo.file}`;
  const storageUrl = `${supabaseUrl}/storage/v1/object/bucket-1/${filePath}`;

  try {
    const response = await fetch(storageUrl, {
      headers: { "Authorization": `Bearer ${serviceKey}`, "apikey": serviceKey },
    });

    if (!response.ok || !response.body) return null;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let featureBuffer = "";
    let searchWindowOverlap = "";
    const MAX_BUFFER = 8000000; // 8MB buffer to safely hold massive polygons

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      
      // CPU OPTIMIZATION: Only search for the pattern in the new chunk + a tiny overlap
      const searchWindow = searchWindowOverlap + chunk;
      let matchFound = false;

      for (const pattern of searchPatterns) {
        if (searchWindow.indexOf(pattern) !== -1) {
          matchFound = true;
          break;
        }
      }

      featureBuffer += chunk;
      // Keep last 100 chars for the next window to catch patterns split across chunks
      searchWindowOverlap = chunk.length > 100 ? chunk.slice(-100) : (searchWindowOverlap + chunk).slice(-100);

      if (matchFound) {
        // We found the pattern! Now find the start of the feature in our main buffer
        let startIdx = featureBuffer.lastIndexOf('{ "type": "Feature"');
        if (startIdx === -1) startIdx = featureBuffer.lastIndexOf('{"type":"Feature"');
        if (startIdx === -1) startIdx = featureBuffer.lastIndexOf('{"type": "Feature"');

        if (startIdx !== -1) {
          // EXTRACTION MODE: Read forward to find the matching closing brace
          while (true) {
            let braceCount = 0;
            let endIdx = -1;
            let inString = false;
            let escape = false;

            for (let i = startIdx; i < featureBuffer.length; i++) {
              const char = featureBuffer;
              if (escape) { escape = false; continue; }
              if (char === '\\') { escape = true; continue; }
              if (char === '"') { inString = !inString; continue; }
              
              if (!inString) {
                if (char === '{') braceCount++;
                else if (char === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                    endIdx = i + 1;
                    break;
                  }
                }
              }
            }

            if (endIdx !== -1) {
              const featureStr = featureBuffer.substring(startIdx, endIdx);
              reader.cancel(); // Stop downloading
              try {
                return JSON.parse(featureStr);
              } catch (e) {
                console.error("Failed to parse extracted feature:", e);
                return null;
              }
            }

            // If we reach here, the feature is cut off. Read the next chunk to complete it.
            const { done: nextDone, value: nextValue } = await reader.read();
            if (nextDone) break;
            featureBuffer += decoder.decode(nextValue, { stream: true });
          }
        }
      }

      // Memory management: Trim buffer if it gets too large (only happens if pattern not found yet)
      if (featureBuffer.length > MAX_BUFFER) {
        let lastStartIdx = featureBuffer.lastIndexOf('{ "type": "Feature"');
        if (lastStartIdx === -1) lastStartIdx = featureBuffer.lastIndexOf('{"type":"Feature"');
        if (lastStartIdx === -1) lastStartIdx = featureBuffer.lastIndexOf('{"type": "Feature"');

        if (lastStartIdx !== -1 && lastStartIdx > featureBuffer.length - 4000000) {
          featureBuffer = featureBuffer.substring(lastStartIdx);
        } else {
          featureBuffer = featureBuffer.substring(featureBuffer.length - 2000000);
        }
      }
    }
  } catch (e) {
    console.error(`Error reading file ${filePath}:`, e);
  }
  return null;
}

function convertLKS94toWGS84(geometry: any): any {
  const convertCoord = (x: number, y: number): => {
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

    return;
  };

  const convertCoords = (coords: any, depth: number): any => {
    if (depth === 0) {
      return convertCoord(coords, coords);
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
