import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_RUNTIME_MS = 25000;
const FETCH_LIMIT = 1000;
const UPSERT_BATCH = 500;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Use cursor-based pagination: last_id is the last processed id
    let lastId = url.searchParams.get("last_id") ?? "";

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

    while (Date.now() - startTime < MAX_RUNTIME_MS) {
      console.log(`Fetching batch after id: ${lastId || "(start)"}...`);

      let query = externalClient
        .from("parcels")
        .select("id, kadastro_nr, unikalus_nr, sav_kodas, feature")
        .order("id", { ascending: true })
        .limit(FETCH_LIMIT);

      if (lastId) {
        query = query.gt("id", lastId);
      }

      const { data, error } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: `External fetch error: ${error.message}`, synced: totalSynced, lastId }),
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
            JSON.stringify({ error: `Upsert error: ${upsertError.message}`, synced: totalSynced, lastId }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        totalSynced += batch.length;
      }

      lastId = data[data.length - 1].id;

      if (data.length < FETCH_LIMIT) {
        done = true;
        break;
      }

      console.log(`Synced ${totalSynced} total, elapsed ${Date.now() - startTime}ms`);
    }

    console.log(`Done: ${done}, synced ${totalSynced}, lastId: ${lastId}`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: totalSynced,
        done,
        lastId,
        message: done
          ? `✓ Visa sinchronizacija baigta (${totalSynced} šioje iteracijoje)`
          : `Sinchronizuota ${totalSynced} įrašų, tęsiama...`,
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
