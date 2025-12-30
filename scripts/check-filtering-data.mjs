#!/usr/bin/env node
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkData() {
  const result = await pool.query(`
    SELECT
      title,
      country_code,
      region_code,
      municipality_code,
      location->>'municipality' as location_municipality,
      location->>'county' as location_county,
      location->>'name' as location_name,
      location->>'area' as location_area
    FROM news_items
    WHERE
      title ILIKE '%Junsele%' OR
      title ILIKE '%Mjällom%' OR
      title ILIKE '%Sollefteå%' OR
      title ILIKE '%fylleri%'
    ORDER BY timestamp DESC
    LIMIT 10
  `);

  console.log('Events and their geo codes:');
  console.log('='.repeat(80));
  result.rows.forEach(row => {
    console.log(`Title: ${row.title.substring(0, 60)}`);
    console.log(`  Country: ${row.country_code || 'NULL'}`);
    console.log(`  Region: ${row.region_code || 'NULL'}`);
    console.log(`  Municipality: ${row.municipality_code || 'NULL'}`);
    console.log(`  Location municipality: ${row.location_municipality || 'NULL'}`);
    console.log(`  Location county: ${row.location_county || 'NULL'}`);
    console.log(`  Location name: ${row.location_name || 'NULL'}`);
    console.log(`  Location area: ${row.location_area || 'NULL'}`);
    console.log();
  });

  await pool.end();
}

checkData().catch(console.error);
