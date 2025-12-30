import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkKramfors() {
  try {
    const result = await pool.query(`
      SELECT
        db_id,
        source_id,
        title,
        country_code,
        region_code,
        municipality_code,
        location::text
      FROM news_items
      WHERE title ILIKE '%Kramfors%' OR title ILIKE '%Mjällom%'
      ORDER BY timestamp DESC
      LIMIT 3
    `);

    console.log('Found', result.rows.length, 'events matching Kramfors/Mjällom:');
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await pool.end();
  }
}

checkKramfors();
