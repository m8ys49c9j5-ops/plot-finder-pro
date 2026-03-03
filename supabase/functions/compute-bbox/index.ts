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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const BATCH = 300;

  const { data: rows, error } = await supabase
    .from("parcels")
    .select("id, feature")
    .is("bbox_min_x", null)
    .not("feature", "is", null)
    .limit(BATCH);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!rows || rows.length === 0) {
    return new Response(JSON.stringify({ done: true, processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let processed = 0;
  // Process concurrently in groups of 20
  for (let i = 0; i < rows.length; i += 20) {
    const chunk = rows.slice(i, i + 20);
    await Promise.all(chunk.map(async (row) => {
      const geom = row.feature?.geometry;
      if (!geom?.coordinates) return;

      let allCoords: number[][] = [];
      if (geom.type === "Polygon") allCoords = geom.coordinates[0] || [];
      else if (geom.type === "MultiPolygon") {
        for (const poly of geom.coordinates) allCoords = allCoords.concat(poly[0] || []);
      }
      if (allCoords.length === 0) return;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const c of allCoords) {
        if (c[0] < minX) minX = c[0];
        if (c[1] < minY) minY = c[1];
        if (c[0] > maxX) maxX = c[0];
        if (c[1] > maxY) maxY = c[1];
      }

      await supabase.from("parcels").update({
        bbox_min_x: minX, bbox_min_y: minY,
        bbox_max_x: maxX, bbox_max_y: maxY,
      }).eq("id", row.id);
      processed++;
    }));
  }

  return new Response(JSON.stringify({
    done: rows.length < BATCH,
    processed,
    message: rows.length === BATCH ? "Call again to continue" : "All done",
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
