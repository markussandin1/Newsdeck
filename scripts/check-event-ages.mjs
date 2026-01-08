/**
 * Check age distribution of news items in database
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

async function checkEventAges() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    try {
      // Overall stats
      const stats = await client.query(`
        SELECT
          COUNT(*) as total_items,
          MIN(created_in_db) as oldest,
          MAX(created_in_db) as newest
        FROM news_items
      `);

      console.log('📊 Overall Statistics:');
      console.log('  Total items:', stats.rows[0].total_items);
      console.log('  Oldest:', stats.rows[0].oldest);
      console.log('  Newest:', stats.rows[0].newest);
      console.log('');

      // Events by hour (last 24 hours)
      const byHour = await client.query(`
        SELECT
          DATE_TRUNC('hour', created_in_db) as hour,
          COUNT(*) as count
        FROM news_items
        WHERE created_in_db > NOW() - INTERVAL '24 hours'
        GROUP BY DATE_TRUNC('hour', created_in_db)
        ORDER BY hour DESC
        LIMIT 24
      `);

      console.log('📅 Events by hour (last 24 hours):');
      byHour.rows.forEach(row => {
        console.log(`  ${row.hour.toISOString()}: ${row.count} events`);
      });
      console.log('');

      // Check for sudden drops
      const byDay = await client.query(`
        SELECT
          DATE(created_in_db) as day,
          COUNT(*) as count
        FROM news_items
        WHERE created_in_db > NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_in_db)
        ORDER BY day DESC
      `);

      console.log('📆 Events by day (last 7 days):');
      byDay.rows.forEach(row => {
        console.log(`  ${row.day.toISOString().split('T')[0]}: ${row.count} events`);
      });

    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

checkEventAges()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
