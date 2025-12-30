#!/usr/bin/env node
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

const module = await import('../lib/services/location-cache.ts')
const locationCache = module.locationCache

await locationCache.load()

console.log('Testing location cache lookups:\n')

const tests = ['Stockholm', 'stockholm', 'Stockholm kommun', 'Stockholms kommun']

tests.forEach(test => {
  const result = locationCache.lookup(test)
  console.log('lookup("' + test + '"):')
  if (result) {
    console.log('  Country: ' + (result.countryCode || 'null'))
    console.log('  Region: ' + (result.regionCode || 'null'))
    console.log('  Municipality: ' + (result.municipalityCode || 'null'))
  } else {
    console.log('  NO MATCH')
  }
  console.log()
})

// Check what mappings we have for Stockholm
const { getPool } = await import('../lib/db-postgresql.ts')
const pool = getPool()

const mappings = await pool.query(`
  SELECT variant, municipality_code, region_code, match_priority, match_type
  FROM location_name_mappings
  WHERE variant ILIKE '%stockholm%'
  ORDER BY match_priority ASC, variant
  LIMIT 20
`)

console.log('Database mappings for "stockholm":')
console.log('=' .repeat(80))
mappings.rows.forEach(row => {
  console.log('Variant: "' + row.variant + '"')
  console.log('  Municipality: ' + (row.municipality_code || 'null'))
  console.log('  Region: ' + (row.region_code || 'null'))
  console.log('  Priority: ' + row.match_priority + ' (' + row.match_type + ')')
  console.log()
})

await pool.end()

