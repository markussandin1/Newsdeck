/**
 * Generic Geographic Data Importer
 *
 * Imports geographic data from structured JSON files with ISO 3166-2 codes.
 *
 * Usage: node scripts/import-geo-data.mjs data/geo/SE.json
 *
 * JSON Format:
 * {
 *   "country": "SE",
 *   "subdivisions": [
 *     { "level": 1, "code": "SE-AB", "name": "Stockholms län", "type": "county" },
 *     { "level": 2, "code": "SE-0114", "name": "Upplands Väsby", "type": "municipality", "parent": "SE-AB" }
 *   ]
 * }
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';
import pg from 'pg';
import { generateNameVariants } from './generate-name-variants.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });
dotenv.config({ path: resolve(__dirname, '../.env') });

const { Pool } = pg;

// Parse ISO code (e.g., "SE-AB" → { country: "SE", code: "AB" })
function parseISOCode(isoCode) {
  const match = isoCode.match(/^([A-Z]{2})-(.+)$/);
  if (!match) {
    throw new Error(`Invalid ISO code format: ${isoCode}`);
  }
  return {
    countryCode: match[1],
    code: match[2]
  };
}

async function importGeoData(jsonFilePath) {
  console.log(`📥 Starting import from: ${jsonFilePath}\n`);

  // Read and parse JSON file
  const fileContent = await readFile(jsonFilePath, 'utf-8');
  const data = JSON.parse(fileContent);

  if (!data.country || !Array.isArray(data.subdivisions)) {
    throw new Error('Invalid JSON format. Expected { country, subdivisions }');
  }

  const countryCode = data.country;
  console.log(`🌍 Country: ${countryCode}`);

  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    try {
      await client.query('BEGIN');

      // 1. Insert country
      const countryName = {
        SE: 'Sweden',
        NO: 'Norway',
        DK: 'Denmark',
        FI: 'Finland'
      }[countryCode] || countryCode;

      await client.query(
        `INSERT INTO countries (code, name)
         VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`,
        [countryCode, countryName]
      );
      console.log(`✅ Country "${countryName}" (${countryCode}) inserted/updated`);

      // 2. Insert regions (level 1)
      const regions = data.subdivisions.filter(s => s.level === 1);
      let regionCount = 0;

      for (const region of regions) {
        const { code } = parseISOCode(region.code);

        await client.query(
          `INSERT INTO regions (country_code, code, name, name_short)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (country_code, code) DO UPDATE
           SET name = EXCLUDED.name, name_short = EXCLUDED.name_short`,
          [countryCode, code, region.name, region.name]
        );
        regionCount++;
      }
      console.log(`✅ Inserted ${regionCount} regions`);

      // 3. Insert municipalities (level 2)
      const municipalities = data.subdivisions.filter(s => s.level === 2);
      let municipalityCount = 0;

      for (const municipality of municipalities) {
        const { code: municipalityCode } = parseISOCode(municipality.code);
        const { code: regionCode } = parseISOCode(municipality.parent);

        await client.query(
          `INSERT INTO municipalities (country_code, region_code, code, name)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (country_code, region_code, code) DO UPDATE
           SET name = EXCLUDED.name`,
          [countryCode, regionCode, municipalityCode, municipality.name]
        );
        municipalityCount++;
      }
      console.log(`✅ Inserted ${municipalityCount} municipalities`);

      // 4. Generate location name mappings
      console.log('\n🏷️  Generating location name mappings...');
      let mappingCount = 0;

      // Region name mappings
      for (const region of regions) {
        const { code } = parseISOCode(region.code);
        const variants = generateNameVariants(region.name, 'region');

        for (const variant of variants) {
          await client.query(
            `INSERT INTO location_name_mappings (variant, country_code, region_country_code, region_code, match_type, match_priority)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (variant) DO NOTHING`,
            [variant.toLowerCase(), countryCode, countryCode, code, variant === region.name ? 'exact' : 'fuzzy', variant === region.name ? 1 : 10]
          );
          mappingCount++;
        }
      }

      // Municipality name mappings
      for (const municipality of municipalities) {
        const { code: municipalityCode } = parseISOCode(municipality.code);
        const { code: regionCode } = parseISOCode(municipality.parent);
        const variants = generateNameVariants(municipality.name, 'municipality');

        for (const variant of variants) {
          await client.query(
            `INSERT INTO location_name_mappings (variant, country_code, municipality_country_code, municipality_region_code, municipality_code, match_type, match_priority)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (variant) DO NOTHING`,
            [variant.toLowerCase(), countryCode, countryCode, regionCode, municipalityCode, variant === municipality.name ? 'exact' : 'fuzzy', variant === municipality.name ? 1 : 10]
          );
          mappingCount++;
        }
      }

      console.log(`✅ Generated ${mappingCount} location name mappings`);

      await client.query('COMMIT');
      console.log('\n✅ Import completed successfully!\n');

      // 5. Trigger cache refresh
      console.log('🔄 Refreshing location cache...');
      try {
        const response = await fetch('http://localhost:3000/api/admin/location-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const result = await response.json();
          const count = result.stats?.count || result.count || 0;
          const version = result.stats?.version || '';
          console.log(`✅ Cache refreshed: ${count} mappings loaded (v${version})\n`);
        } else {
          console.warn('⚠️  Cache refresh failed (server may not be running)');
        }
      } catch (error) {
        console.warn('⚠️  Cache refresh failed (server may not be running)');
      }

      // Summary
      console.log('📊 Import Summary:');
      console.log(`   Country: ${countryName} (${countryCode})`);
      console.log(`   Regions: ${regionCount}`);
      console.log(`   Municipalities: ${municipalityCount}`);
      console.log(`   Name Mappings: ${mappingCount}`);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

// Main execution
const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: node scripts/import-geo-data.mjs <json-file>');
  console.error('Example: node scripts/import-geo-data.mjs data/geo/SE.json');
  process.exit(1);
}

const jsonFilePath = resolve(process.cwd(), args[0]);

importGeoData(jsonFilePath)
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
