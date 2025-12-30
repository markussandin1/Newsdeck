#!/usr/bin/env node

/**
 * Quick diagnostic test for geographic filtering
 */

import { config } from 'dotenv'
import pg from 'pg'

config({ path: '.env.local' })
config()

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

async function testGeoFiltering() {
  console.log('Geographic Filtering Diagnostic Test')
  console.log('=' .repeat(80))
  console.log()

  // Test 1: Check if items have geographic codes
  console.log('Test 1: Checking for items with geographic codes...')
  const withCodes = await pool.query(`
    SELECT COUNT(*) as count
    FROM news_items
    WHERE country_code IS NOT NULL
       OR region_code IS NOT NULL
       OR municipality_code IS NOT NULL
  `)
  console.log('Items with geographic codes: ' + withCodes.rows[0].count)
  console.log()

  // Test 2: Check Stockholm-specific items
  console.log('Test 2: Stockholm municipality items (municipalityCode = 0180)...')
  const stockholmMuni = await pool.query(`
    SELECT COUNT(*) as count
    FROM news_items
    WHERE municipality_code = '0180'
  `)
  console.log('Items with Stockholm municipality code: ' + stockholmMuni.rows[0].count)
  
  if (stockholmMuni.rows[0].count > 0) {
    const examples = await pool.query(`
      SELECT title, municipality_code, region_code, (location->>'municipality') as loc_muni
      FROM news_items
      WHERE municipality_code = '0180'
      LIMIT 5
    `)
    console.log('Examples:')
    examples.rows.forEach(row => {
      console.log('  - ' + row.title.substring(0, 60))
      console.log('    municipalityCode: ' + row.municipality_code + ', regionCode: ' + row.region_code)
      console.log('    location.municipality: ' + (row.loc_muni || 'null'))
    })
  }
  console.log()

  // Test 3: Check Stockholm region items
  console.log('Test 3: Stockholm region items (regionCode = AB)...')
  const stockholmRegion = await pool.query(`
    SELECT COUNT(*) as count
    FROM news_items
    WHERE region_code = 'AB'
  `)
  console.log('Items with Stockholm region code: ' + stockholmRegion.rows[0].count)
  console.log()

  // Test 4: Recent items breakdown
  console.log('Test 4: Geographic code distribution (last 100 items)...')
  const distribution = await pool.query(`
    SELECT
      CASE
        WHEN municipality_code IS NOT NULL THEN 'Has municipality'
        WHEN region_code IS NOT NULL THEN 'Has region only'
        WHEN country_code IS NOT NULL THEN 'Has country only'
        ELSE 'No geo codes'
      END as geo_level,
      COUNT(*) as count
    FROM (
      SELECT municipality_code, region_code, country_code
      FROM news_items
      ORDER BY created_in_db DESC
      LIMIT 100
    ) recent
    GROUP BY geo_level
    ORDER BY count DESC
  `)
  
  console.log('Distribution:')
  distribution.rows.forEach(row => {
    console.log('  ' + row.geo_level + ': ' + row.count)
  })
  console.log()

  // Test 5: Check if location cache is accessible
  console.log('Test 5: Testing location cache lookup...')
  try {
    const module = await import('../lib/services/location-cache.ts')
    const locationCache = module.locationCache
    
    await locationCache.load()
    const stats = locationCache.getStats()
    console.log('Location cache loaded: ' + stats.count + ' variants')
    
    const stockholmTest = locationCache.lookup('Stockholm')
    console.log('Lookup "Stockholm": ' + JSON.stringify(stockholmTest))
  } catch (error) {
    console.log('ERROR: Could not load location cache - ' + error.message)
  }
  console.log()

  console.log('=' .repeat(80))
  console.log('SUMMARY')
  console.log('=' .repeat(80))
  
  if (withCodes.rows[0].count === 0) {
    console.log('PROBLEM: No items have geographic codes!')
    console.log('ACTION: Run backfill script: npx tsx scripts/backfill-geo-codes.mjs')
  } else if (stockholmMuni.rows[0].count === 0 && stockholmRegion.rows[0].count === 0) {
    console.log('PROBLEM: No Stockholm items found!')
    console.log('ACTION: Check if ingestion is working and items are being normalized')
  } else {
    console.log('SUCCESS: Geographic codes are present in database')
    console.log('Stockholm municipality items: ' + stockholmMuni.rows[0].count)
    console.log('Stockholm region items: ' + stockholmRegion.rows[0].count)
  }

  await pool.end()
}

testGeoFiltering().catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})
