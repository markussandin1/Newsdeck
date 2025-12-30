/**
 * Backfill Geographic Codes for Existing News Items
 *
 * This script reads existing news items that have location data in their
 * JSON location field but no normalized geographic codes, and populates
 * the codes using the location cache.
 *
 * Usage: node scripts/backfill-geo-codes.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });
dotenv.config({ path: resolve(__dirname, '../.env') });

const { Pool } = pg;

// Location normalization function (same as location-cache.ts)
function normalizeLocationString(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')           // Collapse multiple spaces
    .replace(/\s*län\s*$/i, '')     // Remove "län" suffix
    .replace(/s\s+län$/i, '')       // Remove "s län" suffix
    .replace(/s$/i, '')             // Remove trailing "s"
    .replace(/[^\w\såäöÅÄÖ]/g, '')  // Remove special chars (keep Swedish letters)
    .trim();
}

async function loadLocationCache(pool) {
  console.log('📥 Loading location mappings from database...');

  const result = await pool.query(`
    SELECT
      variant,
      country_code,
      region_country_code,
      region_code,
      municipality_country_code,
      municipality_region_code,
      municipality_code,
      match_priority,
      match_type
    FROM location_name_mappings
    ORDER BY match_priority ASC
  `);

  const cache = new Map();

  for (const row of result.rows) {
    const normalized = normalizeLocationString(row.variant);

    // Only store the highest priority match for each variant
    const existing = cache.get(normalized);
    if (!existing || row.match_priority < existing.matchPriority) {
      cache.set(normalized, {
        countryCode: row.country_code,
        regionCountryCode: row.region_country_code,
        regionCode: row.region_code,
        municipalityCountryCode: row.municipality_country_code,
        municipalityRegionCode: row.municipality_region_code,
        municipalityCode: row.municipality_code,
        matchPriority: row.match_priority,
        matchType: row.match_type
      });
    }
  }

  console.log(`✅ Loaded ${cache.size} location mappings\n`);
  return cache;
}

function lookupLocation(cache, variant) {
  if (!variant) return null;
  const normalized = normalizeLocationString(variant);
  const result = cache.get(normalized);
  if (!result) return null;

  return {
    countryCode: result.countryCode,
    regionCountryCode: result.regionCountryCode,
    regionCode: result.regionCode,
    municipalityCountryCode: result.municipalityCountryCode,
    municipalityRegionCode: result.municipalityRegionCode,
    municipalityCode: result.municipalityCode
  };
}

async function backfillGeoCodes() {
  console.log('🔄 Starting geographic code backfill...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Load location cache first
    const cache = await loadLocationCache(pool);

    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    try {
      await client.query('BEGIN');

      // Get all items without geographic codes but with location data
      const result = await client.query(`
        SELECT db_id, title, location
        FROM news_items
        WHERE location IS NOT NULL
        AND location::text != '{}'
        AND (country_code IS NULL OR region_code IS NULL OR municipality_code IS NULL)
        ORDER BY created_in_db DESC
      `);

      console.log(`📊 Found ${result.rows.length} items to process\n`);

      if (result.rows.length === 0) {
        console.log('✅ No items need backfilling');
        await client.query('COMMIT');
        return;
      }

      let updated = 0;
      let skipped = 0;
      let failed = 0;

      for (const row of result.rows) {
        const location = row.location;
        let normalized = null;

        // Try to normalize from location fields in order of specificity
        // 1. Try municipality first (most specific)
        if (location.municipality) {
          normalized = lookupLocation(cache, location.municipality);
          if (normalized?.municipalityCode) {
            // Success - we got municipality-level match
          } else {
            normalized = null; // Clear partial match
          }
        }

        // 2. If no municipality match, try county/region
        if (!normalized && location.county) {
          normalized = lookupLocation(cache, location.county);
          if (normalized?.regionCode) {
            // Success - we got region-level match
          } else {
            normalized = null;
          }
        }

        // 3. If still no match, try the generic "name" field
        if (!normalized && location.name) {
          normalized = lookupLocation(cache, location.name);
        }

        if (normalized && (normalized.countryCode || normalized.regionCode || normalized.municipalityCode)) {
          // Update the item with normalized codes
          await client.query(`
            UPDATE news_items
            SET
              country_code = $1,
              region_country_code = $2,
              region_code = $3,
              municipality_country_code = $4,
              municipality_region_code = $5,
              municipality_code = $6
            WHERE db_id = $7
          `, [
            normalized.countryCode || null,
            normalized.regionCountryCode || null,
            normalized.regionCode || null,
            normalized.municipalityCountryCode || null,
            normalized.municipalityRegionCode || null,
            normalized.municipalityCode || null,
            row.db_id
          ]);

          updated++;

          // Log successful normalization
          const locationStr = location.municipality || location.county || location.name || 'unknown';
          const codeStr = normalized.municipalityCode
            ? `municipality: ${normalized.municipalityCode}`
            : normalized.regionCode
            ? `region: ${normalized.regionCode}`
            : `country: ${normalized.countryCode}`;

          console.log(`✅ ${updated}. "${row.title.substring(0, 50)}..." | ${locationStr} → ${codeStr}`);
        } else {
          skipped++;
          const locationStr = JSON.stringify(location);
          console.log(`⚠️  Skipped: "${row.title.substring(0, 50)}..." | No match for ${locationStr}`);
        }
      }

      await client.query('COMMIT');

      console.log('\n📊 Backfill Summary:');
      console.log(`   Total processed: ${result.rows.length}`);
      console.log(`   ✅ Updated: ${updated}`);
      console.log(`   ⚠️  Skipped (no match): ${skipped}`);
      console.log(`   ❌ Failed: ${failed}`);

      if (updated > 0) {
        console.log('\n✅ Backfill completed! Geographic filtering should now work for historical items.');
      }

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

backfillGeoCodes()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backfill failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
