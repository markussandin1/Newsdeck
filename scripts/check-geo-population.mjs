import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });
dotenv.config({ path: resolve(__dirname, '../.env') });

const { Pool } = pg;

async function checkGeoPopulation() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const client = await pool.connect();

    const result = await client.query(`
      SELECT
        COUNT(*) as total_items,
        COUNT(municipality_code) as with_municipality,
        COUNT(region_code) as with_region,
        COUNT(country_code) as with_country
      FROM news_items
    `);

    const stats = result.rows[0];
    console.log('📊 Geographic Code Population:');
    console.log(`   Total items: ${stats.total_items}`);
    console.log(`   With country: ${stats.with_country} (${(stats.with_country/stats.total_items*100).toFixed(1)}%)`);
    console.log(`   With region: ${stats.with_region} (${(stats.with_region/stats.total_items*100).toFixed(1)}%)`);
    console.log(`   With municipality: ${stats.with_municipality} (${(stats.with_municipality/stats.total_items*100).toFixed(1)}%)`);

    // Show sample items with location data
    const sample = await client.query(`
      SELECT title, country_code, region_code, municipality_code, location
      FROM news_items
      WHERE location IS NOT NULL
      ORDER BY created_in_db DESC
      LIMIT 5
    `);

    console.log('\n📍 Sample items with location data:');
    sample.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.title.substring(0, 50)}...`);
      console.log(`      Codes: country=${row.country_code || 'NULL'}, region=${row.region_code || 'NULL'}, municipality=${row.municipality_code || 'NULL'}`);
      console.log(`      Location JSON: ${JSON.stringify(row.location)}`);
    });

    client.release();
  } finally {
    await pool.end();
  }
}

checkGeoPopulation().catch(console.error);
