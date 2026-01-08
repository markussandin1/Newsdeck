#!/usr/bin/env node

/**
 * Fix News Items Municipality Codes
 *
 * Updates municipality_code in news_items table based on municipality NAME from location JSON.
 * This is needed after fixing corrupt municipality codes in reference data.
 *
 * Usage:
 *   node scripts/fix-news-items-municipality-codes.mjs --dry-run  # Preview changes
 *   node scripts/fix-news-items-municipality-codes.mjs --fix      # Apply changes
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

const isDryRun = process.argv.includes('--dry-run');
const isFix = process.argv.includes('--fix');

if (!isDryRun && !isFix) {
  console.error('❌ Error: You must specify either --dry-run or --fix');
  console.error('Usage:');
  console.error('  node scripts/fix-news-items-municipality-codes.mjs --dry-run  # Preview changes');
  console.error('  node scripts/fix-news-items-municipality-codes.mjs --fix      # Apply changes');
  process.exit(1);
}

/**
 * Normalize municipality name for matching
 */
function normalizeMunicipalityName(name) {
  if (!name) return null;
  return name
    .replace(/\s+kommun$/i, '')
    .replace(/\s+stad$/i, '')
    .trim()
    .toLowerCase();
}

/**
 * Fix municipality codes
 */
async function fixMunicipalityCodes() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log(`${isDryRun ? '🔍 DRY RUN MODE' : '⚙️  FIX MODE'} - ${isDryRun ? 'No changes will be made' : 'Changes will be applied'}\n`);

    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    try {
      // Get all news items with municipality codes
      console.log('📊 Fetching news items with municipality codes...');
      const result = await client.query(`
        SELECT
          db_id,
          source_id,
          title,
          municipality_code as current_code,
          (location->>'municipality') as location_municipality,
          (location->>'county') as location_county
        FROM news_items
        WHERE municipality_code IS NOT NULL
        ORDER BY created_in_db DESC
      `);

      console.log(`✅ Found ${result.rows.length} news items with municipality codes\n`);

      if (result.rows.length === 0) {
        console.log('✅ Nothing to fix!');
        return;
      }

      // Build lookup table for municipality codes
      console.log('🏗️  Building municipality lookup table...');
      const lookupResult = await client.query(`
        SELECT
          lnm.variant,
          m.code,
          m.name,
          m.region_code
        FROM location_name_mappings lnm
        JOIN municipalities m ON m.code = lnm.municipality_code
        WHERE lnm.municipality_code IS NOT NULL
        ORDER BY lnm.match_priority ASC
      `);

      const municipalityLookup = new Map();
      for (const row of lookupResult.rows) {
        if (!municipalityLookup.has(row.variant)) {
          municipalityLookup.set(row.variant, {
            code: row.code,
            name: row.name,
            regionCode: row.region_code
          });
        }
      }

      console.log(`✅ Loaded ${municipalityLookup.size} municipality name variants\n`);

      // Process each news item
      const updates = [];
      const errors = [];
      const noChange = [];

      for (const item of result.rows) {
        const municipalityName = normalizeMunicipalityName(item.location_municipality);

        if (!municipalityName) {
          errors.push({
            db_id: item.db_id,
            reason: 'No municipality name in location JSON',
            title: item.title
          });
          continue;
        }

        const match = municipalityLookup.get(municipalityName);

        if (!match) {
          errors.push({
            db_id: item.db_id,
            reason: `Municipality "${item.location_municipality}" not found in lookup table`,
            title: item.title
          });
          continue;
        }

        if (match.code === item.current_code) {
          noChange.push({
            db_id: item.db_id,
            code: item.current_code,
            municipality: item.location_municipality
          });
          continue;
        }

        updates.push({
          db_id: item.db_id,
          source_id: item.source_id,
          title: item.title,
          municipality: item.location_municipality,
          old_code: item.current_code,
          new_code: match.code
        });
      }

      // Report findings
      console.log('═'.repeat(80));
      console.log('SUMMARY');
      console.log('═'.repeat(80));
      console.log(`Total items: ${result.rows.length}`);
      console.log(`✅ No change needed: ${noChange.length}`);
      console.log(`🔧 Need fixing: ${updates.length}`);
      console.log(`❌ Errors: ${errors.length}\n`);

      if (updates.length > 0) {
        console.log('═'.repeat(80));
        console.log('MUNICIPALITY CODE UPDATES');
        console.log('═'.repeat(80));
        console.log('Old  → New | Municipality     | Title');
        console.log('-----|-----|------------------|----------------------------------------');

        updates.slice(0, 50).forEach(u => {
          const titleShort = u.title.length > 40 ? u.title.substring(0, 37) + '...' : u.title;
          console.log(`${u.old_code} → ${u.new_code} | ${u.municipality.padEnd(16)} | ${titleShort}`);
        });

        if (updates.length > 50) {
          console.log(`... and ${updates.length - 50} more`);
        }
        console.log('');
      }

      if (errors.length > 0) {
        console.log('═'.repeat(80));
        console.log('ERRORS (cannot fix)');
        console.log('═'.repeat(80));
        errors.slice(0, 20).forEach(e => {
          console.log(`❌ ${e.db_id}: ${e.reason}`);
          console.log(`   Title: ${e.title.substring(0, 70)}`);
        });

        if (errors.length > 20) {
          console.log(`... and ${errors.length - 20} more errors`);
        }
        console.log('');
      }

      // Apply updates if in fix mode
      if (isFix && updates.length > 0) {
        console.log('═'.repeat(80));
        console.log('APPLYING UPDATES');
        console.log('═'.repeat(80));

        await client.query('BEGIN');

        try {
          for (const update of updates) {
            await client.query(
              'UPDATE news_items SET municipality_code = $1 WHERE db_id = $2',
              [update.new_code, update.db_id]
            );
          }

          await client.query('COMMIT');
          console.log(`✅ Updated ${updates.length} news items with corrected municipality codes\n`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      } else if (isDryRun && updates.length > 0) {
        console.log('🔍 DRY RUN - No changes applied');
        console.log(`   To apply these changes, run: node scripts/fix-news-items-municipality-codes.mjs --fix\n`);
      }

    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

fixMunicipalityCodes()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
