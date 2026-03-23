/**
 * List ALL foreign key constraints on news_items table
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

async function listConstraints() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    try {
      console.log('📋 ALL Foreign Key Constraints on news_items table:\n');
      const constraints = await client.query(`
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule,
          rc.update_rule
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
          AND tc.table_name = 'news_items'
        ORDER BY tc.constraint_name;
      `);

      console.log(`Total constraints found: ${constraints.rows.length}\n`);

      // Group by constraint name
      const grouped = {};
      constraints.rows.forEach(row => {
        if (!grouped[row.constraint_name]) {
          grouped[row.constraint_name] = {
            columns: [],
            foreign_table: row.foreign_table_name,
            delete_rule: row.delete_rule,
            update_rule: row.update_rule
          };
        }
        grouped[row.constraint_name].columns.push({
          column: row.column_name,
          foreign_column: row.foreign_column_name
        });
      });

      Object.entries(grouped).forEach(([name, info]) => {
        console.log(`Constraint: ${name}`);
        console.log(`  Foreign table: ${info.foreign_table}`);
        console.log(`  DELETE rule: ${info.delete_rule}`);
        console.log(`  UPDATE rule: ${info.update_rule}`);
        console.log(`  Columns:`);
        info.columns.forEach(col => {
          console.log(`    ${col.column} -> ${info.foreign_table}.${col.foreign_column}`);
        });
        console.log('');
      });

    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

listConstraints()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
