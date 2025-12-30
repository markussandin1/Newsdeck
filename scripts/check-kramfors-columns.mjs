import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkKramforsColumns() {
  try {
    // First get the event
    const eventResult = await pool.query(`
      SELECT
        db_id,
        source_id,
        title,
        country_code,
        region_code,
        municipality_code
      FROM news_items
      WHERE title ILIKE '%Brand i villa i Mjällom%'
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    if (eventResult.rows.length === 0) {
      console.log('No events found matching "Brand i villa i Mjällom"');
      return;
    }

    const event = eventResult.rows[0];
    console.log('\n=== Event Details ===');
    console.log(JSON.stringify(event, null, 2));

    // Check which columns it's in
    const columnResult = await pool.query(`
      SELECT
        cd.column_id,
        cd.data->>'dbId' as data_db_id,
        cd.data->>'title' as data_title,
        cd.data->>'municipalityCode' as data_municipality_code,
        cd.data->>'regionCode' as data_region_code,
        cd.data->>'countryCode' as data_country_code
      FROM column_data cd
      WHERE cd.news_item_db_id = $1
    `, [event.db_id]);

    console.log('\n=== Columns containing this event ===');
    console.log('Found in', columnResult.rows.length, 'columns:');
    columnResult.rows.forEach((row, idx) => {
      console.log(`\n${idx + 1}. Column ID: ${row.column_id}`);
      console.log(`   Data dbId: ${row.data_db_id}`);
      console.log(`   Data countryCode: ${row.data_country_code}`);
      console.log(`   Data regionCode: ${row.data_region_code}`);
      console.log(`   Data municipalityCode: ${row.data_municipality_code}`);
    });

  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await pool.end();
  }
}

checkKramforsColumns();
