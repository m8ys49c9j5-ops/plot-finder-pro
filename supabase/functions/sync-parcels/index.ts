import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FETCHLIMIT = 1000;
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
    const localUrl = Deno.env.get("SUPABASEURL");
    const localKey = Deno.env.get("SUPABASESERVICEROLEKEY");

    if (!externalUrl || !externalKey || !localUrl || !localKey) {
      return new Response(JSON.stringify({ error: "Supabase credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Išjungiame sesijų saugojimą didesniam greičiui
    const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
    const externalClient = createClient(externalUrl, externalKey, clientOptions);
    const localClient = createClient(localUrl, localKey, clientOptions);

    const startTime = Date.now();
    let totalSynced = 0;
    let done = false;

    console.log(`Pradedama sinchronizacija nuo id: ${lastId || "(pradžia)"}...`);

    // Ciklas veiks be laiko limito, kol bus perkelti visi įrašai
    while (!done) {
      // 1. Parsiunčiame duomenis
      let query = externalClient
        .from("parcels")
        .select("id, kadastronr, unikalusnr, savkodas, feature")
        .order("id", { ascending: true })
        .limit(FETCHLIMIT);

      if (lastId) {
        query = query.gt("id", lastId);
      }

      const { data, error } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: `Klaida gaunant duomenis: ${error.message}`, totalSynced, lastId }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!data || data.length === 0) {
        done = true;
        break;
      }

      // 2. Paruošiame įrašymo blokus (padalintus po 500)
      const upsertPromises = [];
      for (let i = 0; i < data.length; i += UPSERTBATCH) {
        const batch = data.slice(i, i + UPSERTBATCH);
        upsertPromises.push(localClient.from("parcels").upsert(batch, { onConflict: "id" }));
      }

      // 3. Išsiunčiame ir laukiame visų įrašymų vienu metu (greičiau nei po vieną)
      const results = await Promise.all(upsertPromises);
      const upsertError = results.find((r) => r.error)?.error;

      if (upsertError) {
        return new Response(JSON.stringify({ error: `Klaida įrašant: ${upsertError.message}`, totalSynced, lastId }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      totalSynced += data.length;
      lastId = data[data.length - 1].id;

      console.log(`Sinchronizuota: ${totalSynced}, Paskutinis ID: ${lastId}`);

      // Jei gavome mažiau nei prašėme, vadinasi, pasiekėme pabaigą
      if (data.length < FETCHLIMIT) {
        done = true;
        break;
      }
    }

    console.log(`Baigta. Viso perkelta: ${totalSynced}, trukmė: ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: totalSynced,
        done,
        lastId,
        message: `✓ Visa sinchronizacija baigta (${totalSynced} įrašų)`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Netikėta klaida:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Nežinoma klaida" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
