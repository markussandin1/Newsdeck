/**
 * Investigate what caused CASCADE deletion in news_items
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

async function investigate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    try {
      // Check all foreign keys in the database
      console.log('📋 Foreign Keys referencing geographic tables:\n');
      const fkeys = await client.query(`
        SELECT
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name IN ('countries', 'regions', 'municipalities')
        ORDER BY tc.table_name, kcu.column_name;
      `);

      fkeys.rows.forEach(row => {
        console.log(`  ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
        console.log(`    ON DELETE ${row.delete_rule}`);
      });

      // Check for triggers
      console.log('\n📋 Triggers on geographic tables:\n');
      const triggers = await client.query(`
        SELECT
          event_object_table as table_name,
          trigger_name,
          event_manipulation,
          action_statement
        FROM information_schema.triggers
        WHERE event_object_table IN ('countries', 'regions', 'municipalities', 'news_items', 'column_data')
        ORDER BY event_object_table, trigger_name;
      `);

      if (triggers.rows.length === 0) {
        console.log('  No triggers found');
      } else {
        triggers.rows.forEach(row => {
          console.log(`  ${row.table_name}.${row.trigger_name}`);
          console.log(`    Event: ${row.event_manipulation}`);
          console.log(`    Action: ${row.action_statement}`);
        });
      }

      // Check column_data foreign keys
      console.log('\n📋 column_data foreign keys:\n');
      const columnDataFKeys = await client.query(`
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'column_data'
        ORDER BY kcu.column_name;
      `);

      columnDataFKeys.rows.forEach(row => {
        console.log(`  ${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
        console.log(`    ON DELETE ${row.delete_rule}`);
      });

      // Check if there are any orphaned column_data entries
      console.log('\n📋 Orphaned column_data entries (no matching news_item):\n');
      const orphans = await client.query(`
        SELECT COUNT(*) as count
        FROM column_data cd
        LEFT JOIN news_items ni ON cd.news_item_db_id = ni.db_id
        WHERE ni.db_id IS NULL
      `);
      console.log(`  Orphaned entries: ${orphans.rows[0].count}`);

      // Check current news_items count
      console.log('\n📋 Current table sizes:\n');
      const sizes = await client.query(`
        SELECT
          'news_items' as table_name,
          COUNT(*) as count
        FROM news_items
        UNION ALL
        SELECT
          'column_data' as table_name,
          COUNT(*) as count
        FROM column_data
        UNION ALL
        SELECT
          'regions' as table_name,
          COUNT(*) as count
        FROM regions
        UNION ALL
        SELECT
          'municipalities' as table_name,
          COUNT(*) as count
        FROM municipalities
      `);

      sizes.rows.forEach(row => {
        console.log(`  ${row.table_name}: ${row.count} rows`);
      });

    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

investigate()
  .then(() => {
    console.log('\n✅ Investigation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Investigation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
