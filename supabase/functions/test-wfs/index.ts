import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Test edge function to debug WFS
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { test } = await req.json();

    // Test 1: Get WFS capabilities
    if (test === "capabilities") {
      const url = "https://www.inspire-geoportal.lt/geoserver/cp/wfs?service=WFS&version=2.0.0&request=DescribeFeatureType&typeNames=cp:CadastralParcel";
      const response = await fetch(url);
      const text = await response.text();
      return new Response(JSON.stringify({ status: response.status, body: text.substring(0, 2000) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Test 2: Simple WFS query without filter
    if (test === "simple") {
      const url = "https://www.inspire-geoportal.lt/geoserver/cp/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=cp:CadastralParcel&count=1&outputFormat=application/json&srsName=EPSG:4326";
      const response = await fetch(url);
      const text = await response.text();
      return new Response(JSON.stringify({ status: response.status, body: text.substring(0, 3000) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Test 3: WFS with filter
    if (test === "filter") {
      const { cadastralNumber } = await req.json();
      const url = `https://www.inspire-geoportal.lt/geoserver/cp/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=cp:CadastralParcel&count=1&outputFormat=application/json&srsName=EPSG:4326&CQL_FILTER=nationalCadastralReference%20LIKE%20%27%25${encodeURIComponent(cadastralNumber || "4400")}%25%27`;
      const response = await fetch(url);
      const text = await response.text();
      return new Response(JSON.stringify({ status: response.status, body: text.substring(0, 3000) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "specify test: capabilities, simple, or filter" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
