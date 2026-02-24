import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FETCHLIMIT = 1000;
const UPSERTBATCH = 500;

// Pagalbinė funkcija, kuri automatiškai kartoja veiksmą, jei įvyksta tinklo klaida
async function withRetry<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`⚠️ Tinklo triktis, bandome dar kartą... (${i + 1}/${retries})`);
      await new Promise((res) => setTimeout(res, 1000));
    }
  }
  throw new Error("Nepasiekta");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let lastId = url.searchParams.get("lastid") ?? "";

    const externalUrl = Deno.env.get("EXTERNALSUPABASEURL");
    const externalKey = Deno.env.get("EXTERNALSERVICEROLEKEY");
    const localUrl = Deno.env.get("SUPABASEURL");
    const localKey = Deno.env.get("SUPABASESERVICEROLEKEY");

    if (!externalUrl || !externalKey || !localUrl || !localKey) {
      return new Response(
        JSON.stringify({ error: "Supabase credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Išjungiame sesijų saugojimą, kad taupytume atmintį
    const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
    const externalClient = createClient(externalUrl, externalKey, clientOptions);
    const localClient = createClient(localUrl, localKey, clientOptions);

    const startTime = Date.now();
    let totalSynced = 0;
    let done = false;

    console.log(`🚀 Pradedama pilna sinchronizacija nuo paskutinio ID: ${lastId || "(pradžia)"}...`);

    const fetchBatch = async (cursorId: string) => {
      let query = externalClient
        .from("parcels")
        .select("id, kadastronr, unikalusnr, savkodas, feature")
        .order("id", { ascending: true })
        .limit(FETCHLIMIT);
      
      if (cursorId) query = query.gt("id", cursorId);
      
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    };

    // Pirmosios porcijos užklausimas
    let nextFetchPromise = withRetry(() => fetchBatch(lastId));

    // CIKLAS SUKSIS TOL, KOL BUS PERKELTI VISI 2.5 MLN. ĮRAŠŲ (done === true)
    while (!done) {
      const data = await nextFetchPromise;

      if (!data || data.length === 0) {
        done = true;
        break;
      }

      const currentLastId = data[data.length - 1].id;
      const hasMore = data.length === FETCHLIMIT;

      // Iškart foniniu režimu pradedame siųsti kitą duomenų bloką
      if (hasMore) {
        nextFetchPromise = withRetry(() => fetchBatch(currentLastId));
      } else {
        done = true;
      }

      // Lygiagretus įrašymas blokais (Upsert)
      const upsertPromises = [];
      for (let i = 0; i < data.length; i += UPSERTBATCH) {
        const batch = data.slice(i, i + UPSERTBATCH);
        upsertPromises.push(
          withRetry(async () => {
             const { error } = await localClient.from("parcels").upsert(batch, { onConflict: "id" });
             if (error) throw new Error(error.message);
             return true;
          })
        );
      }

      // Laukiame, kol visi duomenys bus sėkmingai įrašyti
      await Promise.all(upsertPromises);

      totalSynced += data.length;
      lastId = currentLastId;

      // Atspausdiname progresą kas 5000 įrašų
      if (totalSynced % 5000 === 0) {
        const elapsedSecs = ((Date.now() - startTime) / 1000).toFixed(0);
        console.log(`🔄 Progresas: Sinchronizuota ${totalSynced} įrašų per ${elapsedSecs}s. Paskutinis ID: ${lastId}`);
      }
    }

    const totalTimeMins = ((Date.now() - startTime) / 60000).toFixed(2);
    console.log(`✅ Pilna sinchronizacija baigta! Viso perkelta: ${totalSynced} per ${totalTimeMins} min.`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: totalSynced,
        done: true,
        lastId,
        message: `✓ Visi duomenys s
        