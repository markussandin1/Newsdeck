/**
 * Clean all geographic data from database
 *
 * ⚠️  WARNING: This script truncates all geographic reference data!
 *
 * IMPORTANT SAFETY NOTES:
 * - This script does NOT use CASCADE to prevent accidental data loss in news_items
 * - Foreign key constraints must be temporarily dropped before truncation
 * - After running this script, you must re-import geographic data
 *
 * Usage: node scripts/clean-geo-data.mjs
 *
 * Safe cleanup process:
 * 1. Drop foreign key constraints from dependent tables
 * 2. Truncate geographic tables
 * 3. Recreate foreign key constraints
 * 4. Re-import data: node scripts/import-geo-data.mjs data/geo/SE.json
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

async function cleanGeoData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database');

    try {
      await client.query('BEGIN');

      // Step 1: Drop foreign key constraints from news_items to prevent CASCADE issues
      console.log('🔓 Dropping foreign key constraints from news_items...');
      await client.query('ALTER TABLE news_items DROP CONSTRAINT IF EXISTS news_items_region_fkey');
      await client.query('ALTER TABLE news_items DROP CONSTRAINT IF EXISTS news_items_municipality_fkey');

      // Step 2: Truncate geographic tables (no CASCADE needed now)
      console.log('🗑️  Truncating location_name_mappings...');
      await client.query('TRUNCATE TABLE location_name_mappings');

      console.log('🗑️  Truncating municipalities...');
      await client.query('TRUNCATE TABLE municipalities');

      console.log('🗑️  Truncating regions...');
      await client.query('TRUNCATE TABLE regions');

      console.log('🗑️  Truncating countries...');
      await client.query('TRUNCATE TABLE countries');

      // Step 3: Recreate foreign key constraints
      console.log('🔐 Recreating foreign key constraints on news_items...');
      await client.query(`
        ALTER TABLE news_items
          ADD CONSTRAINT news_items_region_fkey
          FOREIGN KEY (region_country_code, region_code)
          REFERENCES regions(country_code, code)
          ON DELETE SET NULL
      `);
      await client.query(`
        ALTER TABLE news_items
          ADD CONSTRAINT news_items_municipality_fkey
          FOREIGN KEY (municipality_country_code, municipality_region_code, municipality_code)
          REFERENCES municipalities(country_code, region_code, code)
          ON DELETE SET NULL
      `);

      await client.query('COMMIT');
      console.log('✅ All geographic data cleaned safely\n');
      console.log('⚠️  Remember to re-import data: node scripts/import-geo-data.mjs data/geo/SE.json\n');
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

cleanGeoData()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Clean failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
