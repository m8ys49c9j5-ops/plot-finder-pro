import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { records } = await req.json();

    if (!records || !Array.isArray(records) || records.length === 0) {
      return new Response(
        JSON.stringify({ error: "Provide a 'records' array with parcel objects" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const BATCH_SIZE = 500;
    let totalUpserted = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      const nonNullKadastro = Array.from(
        new Set(batch.map((r) => r?.kadastro_nr).filter((v): v is string => typeof v === "string" && v.length > 0)),
      );

      let existingKadastro = new Set<string>();
      if (nonNullKadastro.length > 0) {
        const { data: existingRows, error: existingError } = await supabase
          .from("parcels")
          .select("kadastro_nr")
          .in("kadastro_nr", nonNullKadastro);

        if (existingError) {
          return new Response(
            JSON.stringify({ error: existingError.message, upserted: totalUpserted }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        existingKadastro = new Set(
          (existingRows ?? [])
            .map((row) => row.kadastro_nr)
            .filter((v): v is string => typeof v === "string"),
        );
      }

      const toInsert = batch.filter((row) => {
        if (!row?.kadastro_nr) return true;
        return !existingKadastro.has(row.kadastro_nr);
      });

      if (toInsert.length === 0) {
        continue;
      }

      const { error } = await supabase.from("parcels").insert(toInsert);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message, upserted: totalUpserted }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      totalUpserted += toInsert.length;
    }

    return new Response(
      JSON.stringify({ success: true, upserted: totalUpserted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
