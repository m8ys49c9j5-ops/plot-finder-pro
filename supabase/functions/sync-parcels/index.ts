import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- CONFIGURATION ---
const MAX_RUNTIME_MS = 25000;
const TIME_BUFFER_MS = 4000; // Leave a 4-second buffer to prevent hard timeouts mid-loop
const FETCH_LIMIT = 3000; // Increased to fetch more rows per loop
const UPSERT_BATCH = 1000; // Process larger batch chunks concurrently
const MAX_RETRIES = 3; // Added retries for high-volume resilience

// --- WARM START: Initialize clients globally ---
// Moving this outside the handler reuses network connections across warm function invocations
const externalUrl = Deno.env.get("EXTERNALSUPABASEURL") || "";
const externalKey = Deno.env.get("EXTERNALSERVICEROLEKEY") || "";
const localUrl = Deno.env.get("SUPABASEURL") || "";
const localKey = Deno.env.get("SUPABASESERVICEROLEKEY") || "";

let externalClient: any;
let localClient: any;

if (externalUrl && externalKey && localUrl && localKey) {
  externalClient = createClient(externalUrl, externalKey);
  localClient = createClient(localUrl, localKey);
}

// --- RESILIENCE: Retry helper for database operations ---
async function withRetry(operation: () => Promise<any>, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const { data, error } = await operation();
    if (!error) return { data, error };

    console.warn(`Attempt ${attempt} failed: ${error.message}`);
    if (attempt === retries) return { data: null, error };

    // Exponential backoff wait (500ms, 1000ms...) before retrying
    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!externalClient || !localClient) {
      return new Response(JSON.stringify({ error: "Supabase credentials not fully configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    // Use cursor-based pagination: lastid is the last processed id
    let lastId = url.searchParams.get("lastid") ?? "";

    const startTime = Date.now();
    let totalSynced = 0;
    let done = false;

    // Use a time buffer so we don't start a long database operation with only 1s left
    while (Date.now() - startTime < MAX_RUNTIME_MS - TIME_BUFFER_MS) {
      console.log(`Fetching batch after id: ${lastId || "(start)"}...`);

      let query = externalClient
        .from("parcels")
        .select("id, kadastronr, unikalusnr, savkodas, feature")
        .order("id", { ascending: true })
        .limit(FETCH_LIMIT);

      if (lastId) {
        query = query.gt("id", lastId);
      }

      const { data, error } = await withRetry(() => query);

      if (error) {
        return new Response(
          JSON.stringify({ error: `External fetch error: ${error.message}`, synced: totalSynced, lastId }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!data || data.length === 0) {
        done = true;
        break;
      }

      // --- CONCURRENCY: Upsert in parallel chunks ---
      const upsertPromises = [];
      for (let i = 0; i < data.length; i += UPSERT_BATCH) {
        const batch = data.slice(i, i + UPSERT_BATCH);

        // Push the pending database requests into an array instead of awaiting them one-by-one
        upsertPromises.push(withRetry(() => localClient.from("parcels").upsert(batch, { onConflict: "id" })));
      }

      // Execute all batched upserts simultaneously
      const results = await Promise.all(upsertPromises);

      // Check if any of the concurrent chunks failed
      const failedResult = results.find((res: any) => res.error);
      if (failedResult) {
        return new Response(
          JSON.stringify({ error: `Upsert error: ${failedResult.error.message}`, synced: totalSynced, lastId }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      totalSynced += data.length;
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
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
