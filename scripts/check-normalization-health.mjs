#!/usr/bin/env node
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Check recent events with location data
const result = await pool.query(`
  SELECT
    title,
    location->>'municipality' as incoming_municipality,
    location->>'county' as incoming_county,
    municipality_code,
    region_code,
    country_code,
    created_in_db
  FROM news_items
  WHERE created_in_db > NOW() - INTERVAL '2 hours'
    AND location IS NOT NULL
  ORDER BY created_in_db DESC
  LIMIT 30
`);

console.log('\n🔍 Recent events normalization check (last 2 hours):');
console.log('='.repeat(80));

let correct = 0;
let missing_municipality = 0;
let missing_region = 0;
let no_incoming_data = 0;

for (const row of result.rows) {
  const hasMunicipality = row.incoming_municipality && row.municipality_code;
  const hasRegion = row.incoming_county && row.region_code;

  if (!row.incoming_municipality && !row.incoming_county) {
    no_incoming_data++;
    continue;
  }

  if (hasMunicipality) correct++;
  if (row.incoming_municipality && !row.municipality_code) missing_municipality++;
  if (row.incoming_county && !row.region_code) missing_region++;

  const status = hasMunicipality ? '✅' : (row.municipality_code ? '🟡' : '❌');

  console.log(`${status} ${row.title.substring(0, 50)}...`);
  console.log(`   Incoming: municipality="${row.incoming_municipality || 'null'}", county="${row.incoming_county || 'null'}"`);
  console.log(`   Stored:   municipality_code=${row.municipality_code || 'NULL'}, region_code=${row.region_code || 'NULL'}`);
  console.log('');
}

console.log('='.repeat(80));
console.log('📊 Summary:');
console.log(`  ✅ Correctly normalized: ${correct}`);
console.log(`  ❌ Missing municipality code: ${missing_municipality}`);
console.log(`  ⚠️  Missing region code: ${missing_region}`);
console.log(`  ℹ️  No incoming location data: ${no_incoming_data}`);
console.log('');

const successRate = result.rows.length > 0
  ? Math.round((correct / (result.rows.length - no_incoming_data)) * 100)
  : 0;

console.log(`Success rate: ${successRate}%`);

if (successRate < 80) {
  console.log('\n⚠️  WARNING: Low success rate! Check location_name_mappings table.');
}

await pool.end();
