/**
 * Verify Database Restore
 * Checks that data was successfully restored after incident
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

async function verifyRestore() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    try {
      // Check news_items count
      const newsResult = await client.query('SELECT COUNT(*) as count FROM news_items');
      const newsCount = parseInt(newsResult.rows[0].count);
      console.log(`📰 news_items: ${newsCount} rows ${newsCount > 0 ? '✅' : '❌'}`);

      // Check column_data count
      const columnResult = await client.query('SELECT COUNT(*) as count FROM column_data');
      const columnCount = parseInt(columnResult.rows[0].count);
      console.log(`📊 column_data: ${columnCount} rows ${columnCount > 0 ? '✅' : '❌'}`);

      // Check geographic data
      const countriesResult = await client.query('SELECT COUNT(*) as count FROM countries');
      const regionsResult = await client.query('SELECT COUNT(*) as count FROM regions');
      const municipalitiesResult = await client.query('SELECT COUNT(*) as count FROM municipalities');

      console.log(`\n🌍 Geographic Data:`);
      console.log(`   Countries: ${countriesResult.rows[0].count}`);
      console.log(`   Regions: ${regionsResult.rows[0].count}`);
      console.log(`   Municipalities: ${municipalitiesResult.rows[0].count}`);

      // Check foreign key constraints
      const constraintsResult = await client.query(`
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conname IN ('news_items_region_fkey', 'news_items_municipality_fkey')
        ORDER BY conname
      `);

      console.log(`\n🔐 Foreign Key Constraints:`);
      if (constraintsResult.rows.length === 0) {
        console.log('   ⚠️  No constraints found - need to recreate them');
      } else {
        constraintsResult.rows.forEach(row => {
          const hasSetNull = row.definition.includes('ON DELETE SET NULL');
          console.log(`   ${row.conname}: ${hasSetNull ? '✅ Safe (SET NULL)' : '⚠️  Needs fix (no SET NULL)'}`);
          if (!hasSetNull) {
            console.log(`      ${row.definition}`);
          }
        });
      }

      // Sample recent news items
      const recentNews = await client.query(`
        SELECT db_id, title, created_in_db
        FROM news_items
        ORDER BY created_in_db DESC
        LIMIT 5
      `);

      console.log(`\n📋 Recent News Items:`);
      recentNews.rows.forEach((row, i) => {
        const date = new Date(row.created_in_db);
        console.log(`   ${i + 1}. ${row.title.substring(0, 60)}... (${date.toISOString()})`);
      });

      console.log('\n');

      if (newsCount === 0 || columnCount === 0) {
        console.log('❌ RESTORE VERIFICATION FAILED - Data is still missing\n');
        process.exit(1);
      } else {
        console.log('✅ RESTORE VERIFICATION PASSED - Data has been restored\n');
      }

    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

verifyRestore()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
