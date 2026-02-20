import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Which file to import: e.g. "Vilnius/gis_pub_parcels_13.json"
    const filePath = url.searchParams.get("file");
    // Optional: offset into features array so the caller can paginate
    const featureOffset = parseInt(url.searchParams.get("offset") ?? "0");
    const featureLimit  = parseInt(url.searchParams.get("limit")  ?? "5000");

    if (!filePath) {
      return jsonResponse(
        { error: "Missing 'file' query param. Example: ?file=Vilnius/gis_pub_parcels_13.json" },
        400
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Download the JSON file from storage
    console.log(`Downloading ${filePath} from bucket-1 (offset=${featureOffset}, limit=${featureLimit})...`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("bucket-1")
      .download(filePath);

    if (downloadError || !fileData) {
      return jsonResponse(
        { error: `Storage download error: ${downloadError?.message}` },
        500
      );
    }

    // Parse the JSON
    const text = await fileData.text();
    let geojson: any;
    try {
      geojson = JSON.parse(text);
    } catch {
      return jsonResponse({ error: "Failed to parse JSON file" }, 500);
    }

    const allFeatures: any[] = geojson.features ?? [];
    const totalFeatures = allFeatures.length;
    const slice = allFeatures.slice(featureOffset, featureOffset + featureLimit);

    console.log(`Total features: ${totalFeatures}, processing slice: ${featureOffset}–${featureOffset + slice.length - 1}`);

    if (slice.length === 0) {
      return jsonResponse({
        success: true,
        upserted: 0,
        errors: 0,
        done: true,
        total: totalFeatures,
        nextOffset: featureOffset,
        message: "No more features to import",
      });
    }

    // Map each GeoJSON feature to our parcels row format
    const rows = slice.map((feature: any) => {
      const props = feature.properties ?? {};
      return {
        kadastro_nr: props.kadastro_nr != null ? String(props.kadastro_nr) : null,
        unikalus_nr: props.unikalus_nr != null ? String(props.unikalus_nr) : null,
        sav_kodas: props.sav_kodas != null ? String(props.sav_kodas) : null,
        feature: feature,
      };
    });

    // Upsert in batches of 500
    const batchSize = 500;
    let upserted = 0;
    let errors = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);

      const { error: upsertErr } = await supabase
        .from("parcels")
        .upsert(batch, { onConflict: "id", ignoreDuplicates: false });

      if (upsertErr) {
        console.error(`Batch ${featureOffset + i} error:`, upsertErr.message);
        errors += batch.length;
      } else {
        upserted += batch.length;
      }
    }

    const nextOffset = featureOffset + slice.length;
    const done = nextOffset >= totalFeatures;

    console.log(`Upserted: ${upserted}, Errors: ${errors}, nextOffset: ${nextOffset}, done: ${done}`);

    return jsonResponse({
      success: true,
      upserted,
      errors,
      done,
      total: totalFeatures,
      nextOffset,
      message: `Imported features ${featureOffset}–${nextOffset - 1} of ${totalFeatures}`,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
