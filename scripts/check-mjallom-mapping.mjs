#!/usr/bin/env node
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const result = await pool.query(`
  SELECT variant, municipality_code, region_code, match_type, match_priority
  FROM location_name_mappings
  WHERE variant ILIKE '%mjällom%' OR variant ILIKE '%mjallom%'
  ORDER BY match_priority
`);

console.log('Mjällom mappings:', result.rows.length);
if (result.rows.length > 0) {
  console.table(result.rows);
} else {
  console.log('\n❌ No mappings found for "Mjällom"');
  console.log('This is why the backfill failed for this event.');
  console.log('\nTo fix: Add a location name mapping for Mjällom → Kramfors (2283)');
}

await pool.end();
