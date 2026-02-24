import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Grąžinome 20 sekundžių limitą, kad serveris nenumestų ryšio ir spėtų atsakyti Lovable
const MAXRUNTIMEMS = 20000;
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

    const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
    const externalClient = createClient(externalUrl, externalKey, clientOptions);
    const localClient = createClient(localUrl, localKey, clientOptions);

    const startTime = Date.now();
    let totalSynced = 0;
    let done = false;

    // Ciklas suksis tol, kol praeis 20 sekundžių
    while (Date.now() - startTime < MAXRUNTIMEMS) {
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
          JSON.stringify({ error: `Klaida gaunant: ${error.message}`, synced: totalSynced, lastId }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!data || data.length === 0) {
        done = true;
        break;
      }

      // Įrašome duomenis lygiagrečiai, greitesniam veikimui
      const upsertPromises = [];
      for (let i = 0; i < data.length; i += UPSERTBATCH) {
        const batch = data.slice(i, i + UPSERTBATCH);
        upsertPromises.push(localClient.from("parcels").upsert(batch, { onConflict: "id" }));
      }

      const results = await Promise.all(upsertPromises);
      const upsertError = results.find((r) => r.error)?.error;

      if (upsertError) {
        return new Response(
          JSON.stringify({ error: `Klaida įrašant: ${upsertError.message}`, synced: totalSynced, lastId }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      totalSynced += data.length;
      lastId = data[data.length - 1].id;

      if (data.length < FETCHLIMIT) {
        done = true;
        break;
      }
    }

    // Grąžiname atsakymą į Lovable. Jei done === false, Lovable automatiškai iškvies vėl.
    return new Response(
      JSON.stringify({
        success: true,
        synced: totalSynced,
        done,
        lastId,
        message: done ? `✓ Visa sinchronizacija baigta!` : `Sinchronizuota ${totalSynced} įrašų, tęsiama...`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Nežinoma klaida" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
