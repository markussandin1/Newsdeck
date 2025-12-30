import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function listTables() {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('Tables in database:');
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

listTables();
