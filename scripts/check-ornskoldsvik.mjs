import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function checkOrnskoldsvik() {
  try {
    console.log('Checking geographic codes for items in Västernorrland...\n');

    // Check items from recent titles visible in screenshot
    const result = await pool.query(`
      SELECT
        db_id,
        title,
        country_code,
        region_code,
        municipality_code,
        location
      FROM news_items
      WHERE
        title LIKE '%Ljustadalen%'
        OR title LIKE '%Skönsberg%'
        OR title LIKE '%Kramfors%'
        OR title LIKE '%Örnsköldsvik%'
      ORDER BY timestamp DESC
      LIMIT 10
    `);

    console.log('Found', result.rows.length, 'items:\n');

    result.rows.forEach(row => {
      console.log('---');
      console.log('Title:', row.title);
      console.log('Country:', row.country_code);
      console.log('Region:', row.region_code);
      console.log('Municipality:', row.municipality_code);
      console.log('Location JSON:', JSON.stringify(row.location, null, 2));
      console.log('');
    });

    // Check what municipalities exist in Västernorrland
    console.log('\n=== Municipalities in Västernorrland (region code 22) ===');
    const muniResult = await pool.query(`
      SELECT code, name FROM municipalities WHERE region_code = '22' ORDER BY name
    `);

    muniResult.rows.forEach(row => {
      console.log(`${row.code}: ${row.name}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkOrnskoldsvik()
