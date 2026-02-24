import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Saugus limitas, kad funkcija spėtų užsibaigti prieš 30s Edge Function "Timeout"
const MAXRUNTIMEMS = 20000;
const FETCHLIMIT = 1000; // Maksimalus Supabase PostgREST grąžinamas kiekis
const UPSERTBATCH = 500;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let lastId = url.searchParams.get("lastid") ?? "";

    const externalUrl = Deno.env.get("EXTERNALSUPABASEURL");
    const externalKey = Deno.env.get("EXTERNALSERVICEROLEKEY");
    // Pridėtas standartinis Supabase pavadinimų fallback'as
    const localUrl = Deno.env.get("SUPABASEURL") || Deno.env.get("SUPABASE_URL");
    const localKey = Deno.env.get("SUPABASESERVICEROLEKEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!externalUrl || !externalKey || !localUrl || !localKey) {
      return new Response(JSON.stringify({ error: "Supabase credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // OPTIMIZACIJA 1: Išjungiame auth sesijų saugojimą greitesniam kliento darbui
    const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
    const externalClient = createClient(externalUrl, externalKey, clientOptions);
    const localClient = createClient(localUrl, localKey, clientOptions);

    const startTime = Date.now();
    let totalSynced = 0;
    let done = false;

    // Pagalbinė funkcija išorinės DB užklausoms
    const fetchBatch = (cursorId: string) => {
      let query = externalClient
        .from("parcels")
        .select("id, kadastronr, unikalusnr, savkodas, feature")
        .order("id", { ascending: true })
        .limit(FETCHLIMIT);

      if (cursorId) query = query.gt("id", cursorId);
      return query;
    };

    // OPTIMIZACIJA 2: Iš anksto inicijuojame patį pirmąjį siuntimą
    let nextFetchPromise = fetchBatch(lastId);

    while (Date.now() - startTime < MAXRUNTIMEMS) {
      // 1. Sulaukiame duomenų (gali būti, kad jie jau buvo parsiųsti praėjusio ciklo metu fone)
      const { data, error } = await nextFetchPromise;

      if (error) {
        throw new Error(`External fetch error: ${error.message}, synced: ${totalSynced}`);
      }

      if (!data || data.length === 0) {
        done = true;
        break;
      }

      const currentLastId = data[data.length - 1].id;
      const hasMore = data.length === FETCHLIMIT;

      // OPTIMIZACIJA 3: PIPELINING. Nelaukdami kol baigsis įrašymas, IŠKARTO pradedame siųsti
      // užklausą kitam duomenų blokui foniniame režime.
      if (hasMore) {
        nextFetchPromise = fetchBatch(currentLastId);
      } else {
        done = true;
      }

      // OPTIMIZACIJA 4: Esamą duomenų bloką padaliname ir įrašinėjame (upsert) LYGIAGREČIAI
      const upsertPromises = [];
      for (let i = 0; i < data.length; i += UPSERTBATCH) {
        const batch = data.slice(i, i + UPSERTBATCH);
        upsertPromises.push(localClient.from("parcels").upsert(batch, { onConflict: "id" }));
      }

      // Laukiame kol visi upsert blokai bus sėkmingai išsaugoti bazėje
      const results = await Promise.all(upsertPromises);
      const upsertError = results.find((r) => r.error)?.error;

      if (upsertError) {
        throw new Error(`Upsert error: ${upsertError.message}, synced: ${totalSynced}`);
      }

      totalSynced += data.length;
      lastId = currentLastId;

      console.log(`Synced ${totalSynced} total, elapsed ${Date.now() - startTime}ms`);

      if (done) break;
    }

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
