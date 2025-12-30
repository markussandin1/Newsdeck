#!/usr/bin/env node
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Check for Kramfors mapping
const result = await pool.query(`
  SELECT variant, municipality_code, region_code, match_type, match_priority
  FROM location_name_mappings
  WHERE variant = 'kramfors'
  ORDER BY match_priority
`);

console.log('\nSearching for "kramfors" mapping...');
console.log('Found:', result.rows.length, 'mappings\n');

if (result.rows.length > 0) {
  console.table(result.rows);
} else {
  console.log('❌ NO MAPPING FOUND for "kramfors"!');
  console.log('\nChecking what variants DO exist for municipality 2283:');

  const variants = await pool.query(`
    SELECT variant, match_type, match_priority
    FROM location_name_mappings
    WHERE municipality_code = '2283'
    ORDER BY match_priority
  `);

  if (variants.rows.length > 0) {
    console.table(variants.rows);
  } else {
    console.log('❌ NO VARIANTS AT ALL for municipality 2283!');
  }
}

await pool.end();
