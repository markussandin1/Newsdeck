#!/usr/bin/env node

/**
 * Backfill Geographic Codes for Existing News Items
 */

import { config } from 'dotenv'
import pg from 'pg'

config({ path: '.env.local' })
config()

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

// Import location cache
let locationCache
try {
  const module = await import('../lib/services/location-cache.ts')
  locationCache = module.locationCache
} catch (error) {
  console.error('Failed to import location cache:', error)
  process.exit(1)
}

// Parse command line args
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitArg = args.find(arg => arg.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null

async function normalizeLocation(location) {
  if (!location) return {}

  // Try municipality first
  if (location.municipality) {
    const match = locationCache.lookup(location.municipality)
    if (match && match.municipalityCode) {
      return {
        countryCode: match.countryCode,
        regionCountryCode: match.regionCountryCode,
        regionCode: match.regionCode,
        municipalityCountryCode: match.municipalityCountryCode,
        municipalityRegionCode: match.municipalityRegionCode,
        municipalityCode: match.municipalityCode
      }
    }
  }

  // Fall back to county
  if (location.county) {
    const match = locationCache.lookup(location.county)
    if (match && match.regionCode) {
      return {
        countryCode: match.countryCode,
        regionCountryCode: match.regionCountryCode,
        regionCode: match.regionCode,
        municipalityCountryCode: undefined,
        municipalityRegionCode: undefined,
        municipalityCode: undefined
      }
    }
  }

  // Fall back to country
  if (location.country) {
    const match = locationCache.lookup(location.country)
    if (match && match.countryCode) {
      return {
        countryCode: match.countryCode,
        regionCountryCode: undefined,
        regionCode: undefined,
        municipalityCountryCode: undefined,
        municipalityRegionCode: undefined,
        municipalityCode: undefined
      }
    }
  }

  return {}
}

async function backfillGeoCodes() {
  console.log('='.repeat(80))
  console.log('BACKFILL GEOGRAPHIC CODES')
  console.log('='.repeat(80))
  console.log()

  if (dryRun) {
    console.log('DRY RUN MODE - No changes will be made')
    console.log()
  }

  // Load location cache
  console.log('Step 1: Loading location cache...')
  try {
    await locationCache.load()
    const stats = locationCache.getStats()
    console.log('Location cache loaded: ' + stats.count + ' variants')
    console.log()
  } catch (error) {
    console.error('Failed to load location cache:', error)
    process.exit(1)
  }

  // Find items with NULL codes
  console.log('Step 2: Finding items with NULL geographic codes...')

  let query = 'SELECT db_id, workflow_id, title, location FROM news_items WHERE country_code IS NULL AND region_code IS NULL AND municipality_code IS NULL'
  if (limit) {
    query += ' LIMIT ' + limit
  }

  const result = await pool.query(query)
  const itemsToUpdate = result.rows

  console.log('Found ' + itemsToUpdate.length + ' items to update')
  console.log()

  if (itemsToUpdate.length === 0) {
    console.log('All items already have geographic codes!')
    await pool.end()
    return
  }

  // Process items
  console.log('Step 3: Processing items...')
  console.log('-'.repeat(80))

  let updated = 0
  let skipped = 0

  for (const item of itemsToUpdate) {
    try {
      const location = item.location
      const normalizedLocation = await normalizeLocation(location)

      const hasNormalizedCodes = !!(
        normalizedLocation.countryCode ||
        normalizedLocation.regionCode ||
        normalizedLocation.municipalityCode
      )

      if (!hasNormalizedCodes) {
        skipped++
        if (skipped <= 5) {
          console.log('SKIPPED: ' + item.title.substring(0, 50))
          console.log('  Location: ' + JSON.stringify(location))
          console.log()
        }
        continue
      }

      // Update item
      if (!dryRun) {
        await pool.query(
          'UPDATE news_items SET country_code = $1, region_country_code = $2, region_code = $3, municipality_country_code = $4, municipality_region_code = $5, municipality_code = $6 WHERE db_id = $7',
          [
            normalizedLocation.countryCode || null,
            normalizedLocation.regionCountryCode || null,
            normalizedLocation.regionCode || null,
            normalizedLocation.municipalityCountryCode || null,
            normalizedLocation.municipalityRegionCode || null,
            normalizedLocation.municipalityCode || null,
            item.db_id
          ]
        )
      }

      updated++
      if (updated <= 10) {
        console.log('UPDATED: ' + item.title.substring(0, 50))
        console.log('  Region: ' + (normalizedLocation.regionCode || 'null'))
        console.log('  Municipality: ' + (normalizedLocation.municipalityCode || 'null'))
        console.log()
      }
    } catch (error) {
      console.error('ERROR:', error.message)
    }
  }

  console.log('='.repeat(80))
  console.log('SUMMARY')
  console.log('='.repeat(80))
  console.log('Total: ' + itemsToUpdate.length)
  console.log('Updated: ' + updated)
  console.log('Skipped: ' + skipped)

  if (dryRun) {
    console.log()
    console.log('DRY RUN - No changes were made')
  } else {
    console.log()
    console.log('Backfill complete!')
  }

  await pool.end()
}

backfillGeoCodes().catch(error => {
  console.error('Backfill failed:', error)
  process.exit(1)
})
