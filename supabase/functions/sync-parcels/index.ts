import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_RUNTIME_MS = 25000; // stay well under edge function timeout
const FETCH_LIMIT = 1000;     // PostgREST max per query
const UPSERT_BATCH = 500;     // rows per upsert call

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let offset = parseInt(url.searchParams.get("offset") ?? "0");

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

    const externalClient = createClient(externalUrl, externalKey);
    const localClient = createClient(localUrl!, localKey!);

    const startTime = Date.now();
    let totalSynced = 0;
    let done = false;

    // Process multiple batches within a single invocation
    while (Date.now() - startTime < MAX_RUNTIME_MS) {
      console.log(`Fetching rows ${offset} to ${offset + FETCH_LIMIT - 1}...`);

      const { data, error } = await externalClient
        .from("parcels")
        .select("id, kadastro_nr, unikalus_nr, sav_kodas, feature")
        .range(offset, offset + FETCH_LIMIT - 1);

      if (error) {
        return new Response(
          JSON.stringify({ error: `External fetch error: ${error.message}`, synced: totalSynced, nextOffset: offset }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!data || data.length === 0) {
        done = true;
        break;
      }

      // Upsert in batches
      for (let i = 0; i < data.length; i += UPSERT_BATCH) {
        const batch = data.slice(i, i + UPSERT_BATCH);
        const { error: upsertError } = await localClient
          .from("parcels")
          .upsert(batch, { onConflict: "id" });

        if (upsertError) {
          return new Response(
            JSON.stringify({ error: `Upsert error: ${upsertError.message}`, synced: totalSynced, nextOffset: offset }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        totalSynced += batch.length;
      }

      offset += data.length;

      if (data.length < FETCH_LIMIT) {
        done = true;
        break;
      }

      console.log(`Synced ${totalSynced} total, elapsed ${Date.now() - startTime}ms`);
    }

    console.log(`Done: ${done}, synced ${totalSynced}, next offset: ${offset}`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: totalSynced,
        done,
        nextOffset: offset,
        message: done
          ? `✓ Visa sinchronizacija baigta (${totalSynced} šioje iteracijoje)`
          : `Sinchronizuota ${totalSynced} įrašų, tęsiama nuo ${offset}`,
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
