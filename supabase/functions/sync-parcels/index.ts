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
    // Support pagination via query params: ?offset=0&limit=2000
    const url = new URL(req.url);
    const offset = parseInt(url.searchParams.get("offset") ?? "0");
    const limit = parseInt(url.searchParams.get("limit") ?? "1000");

    const externalUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const externalKey = Deno.env.get("EXTERNAL_SERVICE_ROLE_KEY");
    const localUrl = Deno.env.get("SUPABASE_URL");
    const localKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!externalUrl || !externalKey) {
      return new Response(
        JSON.stringify({ error: "External Supabase credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clients
    const externalClient = createClient(externalUrl, externalKey);
    const localClient = createClient(localUrl!, localKey!);

    // Fetch a page of parcels from external project
    console.log(`Fetching rows ${offset} to ${offset + limit - 1} from external...`);
    
    const { data, error } = await externalClient
      .from("parcels")
      .select("id, kadastro_nr, unikalus_nr, sav_kodas, feature")
      .range(offset, offset + limit - 1);

    if (error) {
      return new Response(
        JSON.stringify({ error: `External fetch error: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, done: true, message: "No more rows to sync" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetched ${data.length} rows, upserting...`);

    // Upsert into local project in batches of 500
    const batchSize = 500;
    let upserted = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const { error: upsertError } = await localClient
        .from("parcels")
        .upsert(batch, { onConflict: "id" });

      if (upsertError) {
        return new Response(
          JSON.stringify({ error: `Upsert error: ${upsertError.message}`, synced: upserted }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      upserted += batch.length;
    }

    const done = data.length < limit;
    const nextOffset = offset + data.length;

    console.log(`Upserted ${upserted} rows. Next offset: ${nextOffset}. Done: ${done}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: upserted, 
        done, 
        nextOffset,
        message: `Synced rows ${offset}–${nextOffset - 1}` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
