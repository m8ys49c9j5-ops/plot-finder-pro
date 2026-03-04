#!/usr/bin/env node
/**
 * Standalone Node.js script to upload Lithuanian address data to Supabase.
 *
 * Prerequisites:
 *   npm install @supabase/supabase-js
 *
 * Usage:
 *   node scripts/upload-addresses.mjs ./adr_gra_adresai_LT.json
 *
 * Environment variables (or edit the constants below):
 *   SUPABASE_URL            – your Supabase project URL
 *   SUPABASE_SERVICE_KEY    – service-role key (NOT the anon key)
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

// ─── Configuration ───────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || "https://xrxpacqcuxnrfwvhuxib.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "<YOUR_SERVICE_ROLE_KEY>";
const BATCH_SIZE = 100;
// ──────────────────────────────────────────────────────────────────

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node scripts/upload-addresses.mjs <path-to-json>");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`Reading ${filePath}...`);
const raw = readFileSync(filePath, "utf-8");
const geojson = JSON.parse(raw);

const features = geojson.features;
if (!Array.isArray(features)) {
  console.error("Expected a GeoJSON FeatureCollection with a 'features' array.");
  process.exit(1);
}

console.log(`Parsed ${features.length} features. Uploading in batches of ${BATCH_SIZE}...`);

let totalInserted = 0;
let totalSkipped = 0;

for (let i = 0; i < features.length; i += BATCH_SIZE) {
  const batch = features.slice(i, i + BATCH_SIZE);

  const rows = batch
    .map((f) => {
      const p = f.properties || {};
      const lon = p.E_KOORD;
      const lat = p.N_KOORD;

      if (lon == null || lat == null) return null;

      return {
        aob_kodas: p.AOB_KODAS ?? null,
        // If your JSON has text fields, map them here:
        savivaldybe: p.SAVIVALDYBE ?? p.savivaldybe ?? null,
        gyvenviete: p.GYVENVIETE ?? p.gyvenviete ?? null,
        gatve: p.GATVE ?? p.gatve ?? null,
        namo_nr: p.NAMO_NR ?? p.namo_nr ?? p.NR ?? null,
        pasto_kodas: p.PASTO_KODA ?? p.pasto_kodas ?? null,
        // PostGIS geometry in WKT format (SRID 4326 = WGS84)
        geom: `SRID=4326;POINT(${lon} ${lat})`,
      };
    })
    .filter(Boolean);

  if (rows.length === 0) {
    totalSkipped += batch.length;
    continue;
  }

  const { error } = await supabase
    .from("lithuanian_addresses")
    .upsert(rows, { onConflict: "aob_kodas", ignoreDuplicates: true });

  if (error) {
    console.error(`Error at batch ${i / BATCH_SIZE + 1}:`, error.message);
    // Continue with next batch instead of stopping
  } else {
    totalInserted += rows.length;
  }

  if ((i / BATCH_SIZE + 1) % 50 === 0) {
    console.log(`  Progress: ${i + batch.length} / ${features.length}`);
  }
}

console.log(`\nDone! Inserted: ${totalInserted}, Skipped: ${totalSkipped}`);
