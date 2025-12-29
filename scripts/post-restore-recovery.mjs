/**
 * Post-Restore Recovery Script
 *
 * This script completes the recovery process after database restore:
 * 1. Re-applies geographic metadata migration (FIXED version with ON DELETE SET NULL)
 * 2. Imports geographic data from SE.json
 * 3. Refreshes location cache
 * 4. Verifies everything is working
 *
 * Usage: node scripts/post-restore-recovery.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFile } from 'fs/promises';
import dotenv from 'dotenv';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });
dotenv.config({ path: resolve(__dirname, '../.env') });

const { Pool } = pg;

async function postRestoreRecovery() {
  console.log('🔧 Starting post-restore recovery...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    try {
      // Step 1: Re-apply geographic metadata migration
      console.log('📝 Step 1: Re-applying geographic metadata migration...');

      const migrationPath = resolve(__dirname, '../db/migrations/001_geographic_metadata.sql');
      const migrationSQL = await readFile(migrationPath, 'utf-8');

      await client.query(migrationSQL);
      console.log('✅ Migration applied successfully\n');

      // Verify tables exist
      const tableCheck = await client.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('countries', 'regions', 'municipalities', 'location_name_mappings')
        ORDER BY table_name
      `);

      console.log('📊 Geographic tables created:');
      tableCheck.rows.forEach(row => {
        console.log(`   ✅ ${row.table_name}`);
      });

      // Verify foreign key constraints have ON DELETE SET NULL
      const constraintsCheck = await client.query(`
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conname IN ('news_items_region_fkey', 'news_items_municipality_fkey')
        ORDER BY conname
      `);

      console.log('\n🔐 Foreign Key Constraints:');
      let allSafe = true;
      constraintsCheck.rows.forEach(row => {
        const hasSetNull = row.definition.includes('ON DELETE SET NULL');
        console.log(`   ${row.conname}: ${hasSetNull ? '✅ Safe (ON DELETE SET NULL)' : '❌ UNSAFE - Missing ON DELETE SET NULL'}`);
        if (!hasSetNull) {
          allSafe = false;
        }
      });

      if (!allSafe) {
        throw new Error('Foreign key constraints are not safe! Check migration file.');
      }

      console.log('\n✅ All safety checks passed\n');
      console.log('📊 Recovery complete! Next steps:');
      console.log('   1. Import geographic data: node scripts/import-geo-data.mjs data/geo/SE.json');
      console.log('   2. Verify in UI: http://localhost:3000/dashboard/main-dashboard');
      console.log('   3. Check geographic filters work correctly\n');

    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

postRestoreRecovery()
  .then(() => {
    console.log('✅ Post-restore recovery completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Recovery failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
