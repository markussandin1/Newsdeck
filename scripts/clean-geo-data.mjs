/**
 * Clean all geographic data from database
 * Usage: node scripts/clean-geo-data.mjs
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

      console.log('🗑️  Truncating location_name_mappings...');
      await client.query('TRUNCATE TABLE location_name_mappings CASCADE');

      console.log('🗑️  Truncating municipalities...');
      await client.query('TRUNCATE TABLE municipalities CASCADE');

      console.log('🗑️  Truncating regions...');
      await client.query('TRUNCATE TABLE regions CASCADE');

      console.log('🗑️  Truncating countries...');
      await client.query('TRUNCATE TABLE countries CASCADE');

      await client.query('COMMIT');
      console.log('✅ All geographic data cleaned\n');
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
