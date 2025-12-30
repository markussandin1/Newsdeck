#!/usr/bin/env node

/**
 * Test Location Normalization
 *
 * This script tests the complete location normalization flow:
 * 1. Check if location cache is loaded
 * 2. Test normalization with real examples
 * 3. Check recent news items to see what location codes they have
 */

import { config } from 'dotenv'
import pg from 'pg'

config()

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

// Import location cache (using tsx to handle TypeScript)
// Note: This script should be run with: npx tsx scripts/test-location-normalization.mjs
let locationCache
try {
  const module = await import('../lib/services/location-cache.ts')
  locationCache = module.locationCache
} catch (error) {
  console.error('Failed to import location cache:', error)
  console.error('Make sure to run this with: npx tsx scripts/test-location-normalization.mjs')
  process.exit(1)
}

async function testLocationNormalization() {
  console.log('='.repeat(80))
  console.log('LOCATION NORMALIZATION TEST')
  console.log('='.repeat(80))
  console.log()

  // Step 1: Load and verify cache
  console.log('Step 1: Loading location cache...')
  try {
    await locationCache.load()
    const stats = locationCache.getStats()
    console.log('✅ Location cache loaded successfully')
    console.log(`   - Variants: ${stats.count}`)
    console.log(`   - Loaded at: ${stats.loadedAt}`)
    console.log(`   - Version: ${stats.version}`)
    console.log()
  } catch (error) {
    console.error('❌ Failed to load location cache:', error)
    process.exit(1)
  }

  // Step 2: Test normalization with real examples
  console.log('Step 2: Testing normalization with real location strings...')
  console.log()

  const testCases = [
    'Stockholm',
    'Stockholms län',
    'stockholm',
    'Eskilstuna',
    'Helsingborg',
    'Göteborg',
    'Malmö',
    'Uppsala',
    'Västerås',
    'Örebro',
  ]

  console.log('Test cases:')
  console.log('-'.repeat(80))
  for (const locationString of testCases) {
    const result = locationCache.lookup(locationString)
    if (result) {
      console.log(`✅ "${locationString}"`)
      console.log(`   → Country: ${result.countryCode || 'null'}`)
      console.log(`   → Region: ${result.regionCode || 'null'}`)
      console.log(`   → Municipality: ${result.municipalityCode || 'null'}`)
    } else {
      console.log(`❌ "${locationString}" - NO MATCH`)
    }
    console.log()
  }

  // Step 3: Check recent news items
  console.log('Step 3: Checking recent news items (last 50)...')
  console.log('-'.repeat(80))

  const recentItems = await pool.query(`
    SELECT
      title,
      (location->>'municipality') as loc_municipality,
      (location->>'county') as loc_county,
      (location->>'name') as loc_name,
      country_code,
      region_code,
      municipality_code,
      created_in_db
    FROM news_items
    ORDER BY created_in_db DESC
    LIMIT 50
  `)

  let totalItems = recentItems.rows.length
  let itemsWithCountry = 0
  let itemsWithRegion = 0
  let itemsWithMunicipality = 0
  let itemsWithNoGeo = 0

  console.log(`\nAnalyzing ${totalItems} recent items:\n`)

  for (const row of recentItems.rows) {
    const hasCountry = !!row.country_code
    const hasRegion = !!row.region_code
    const hasMunicipality = !!row.municipality_code
    const hasAnyGeo = hasCountry || hasRegion || hasMunicipality

    if (hasCountry) itemsWithCountry++
    if (hasRegion) itemsWithRegion++
    if (hasMunicipality) itemsWithMunicipality++
    if (!hasAnyGeo) itemsWithNoGeo++

    // Show first 10 items in detail
    if (recentItems.rows.indexOf(row) < 10) {
      console.log(`Title: ${row.title.substring(0, 60)}...`)
      console.log(`  Raw location: municipality="${row.loc_municipality || 'null'}", county="${row.loc_county || 'null'}", name="${row.loc_name || 'null'}"`)
      console.log(`  Normalized:   country=${row.country_code || 'null'}, region=${row.region_code || 'null'}, municipality=${row.municipality_code || 'null'}`)

      // If no geo codes, test what normalization would give
      if (!hasAnyGeo) {
        console.log('  ⚠️  No geographic codes - testing normalization:')
        if (row.loc_municipality) {
          const result = locationCache.lookup(row.loc_municipality)
          console.log(`     → lookup("${row.loc_municipality}"): ${result ? `region=${result.regionCode}, municipality=${result.municipalityCode}` : 'NO MATCH'}`)
        }
        if (row.loc_county) {
          const result = locationCache.lookup(row.loc_county)
          console.log(`     → lookup("${row.loc_county}"): ${result ? `region=${result.regionCode}` : 'NO MATCH'}`)
        }
        if (row.loc_name) {
          const result = locationCache.lookup(row.loc_name)
          console.log(`     → lookup("${row.loc_name}"): ${result ? `region=${result.regionCode}, municipality=${result.municipalityCode}` : 'NO MATCH'}`)
        }
      }
      console.log()
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('SUMMARY')
  console.log('='.repeat(80))
  console.log(`Total items analyzed: ${totalItems}`)
  console.log(`Items with country_code: ${itemsWithCountry} (${Math.round(100 * itemsWithCountry / totalItems)}%)`)
  console.log(`Items with region_code: ${itemsWithRegion} (${Math.round(100 * itemsWithRegion / totalItems)}%)`)
  console.log(`Items with municipality_code: ${itemsWithMunicipality} (${Math.round(100 * itemsWithMunicipality / totalItems)}%)`)
  console.log(`Items with NO geographic codes: ${itemsWithNoGeo} (${Math.round(100 * itemsWithNoGeo / totalItems)}%)`)

  // Check Stockholm-specific items
  console.log('\n' + '='.repeat(80))
  console.log('STOCKHOLM-SPECIFIC CHECK')
  console.log('='.repeat(80))

  const stockholmItems = await pool.query(`
    SELECT
      title,
      (location->>'municipality') as loc_municipality,
      (location->>'county') as loc_county,
      (location->>'name') as loc_name,
      country_code,
      region_code,
      municipality_code,
      created_in_db
    FROM news_items
    WHERE created_in_db > NOW() - INTERVAL '24 hours'
      AND (
        municipality_code = '0180'
        OR region_code = 'AB'
        OR (location->>'municipality') ILIKE '%stockholm%'
        OR (location->>'county') ILIKE '%stockholm%'
        OR (location->>'name') ILIKE '%stockholm%'
      )
    ORDER BY created_in_db DESC
    LIMIT 20
  `)

  console.log(`\nFound ${stockholmItems.rows.length} Stockholm-related items (last 24h):\n`)

  for (const row of stockholmItems.rows) {
    console.log(`Title: ${row.title.substring(0, 60)}...`)
    console.log(`  Raw: municipality="${row.loc_municipality || 'null'}", county="${row.loc_county || 'null'}", name="${row.loc_name || 'null'}"`)
    console.log(`  Normalized: country=${row.country_code || 'null'}, region=${row.region_code || 'null'}, municipality=${row.municipality_code || 'null'}`)
    console.log()
  }

  if (stockholmItems.rows.length === 0) {
    console.log('⚠️  WARNING: No Stockholm-related items found in last 24 hours!')
    console.log('   This could mean:')
    console.log('   1. No news items with Stockholm location have been ingested recently')
    console.log('   2. Location normalization is not working correctly')
    console.log('   3. The location data format from sources has changed')
  }

  await pool.end()
}

testLocationNormalization().catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})
