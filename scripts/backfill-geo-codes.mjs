#!/usr/bin/env node

/**
 * Backfill script for news items with missing geographic codes
 *
 * This script:
 * 1. Finds all news items with location data but missing geo codes
 * 2. Re-runs location normalization using DB queries (geoLookup)
 * 3. Updates news_items table with normalized codes
 * 4. Reports success/failure statistics
 *
 * Usage:
 *   node scripts/backfill-geo-codes.mjs
 *   node scripts/backfill-geo-codes.mjs --dry-run  # Preview without changes
 *   node scripts/backfill-geo-codes.mjs --limit=50  # Process only 50 items
 */

import { config } from 'dotenv'
import pg from 'pg'

config({ path: '.env.local' })
config()

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

// Parse command line args
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitArg = args.find(arg => arg.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null

/**
 * Geographic lookup using location_name_mappings table
 */
async function geoLookup(name) {
  if (!name || typeof name !== 'string') return null

  const result = await pool.query(
    `SELECT country_code, region_country_code, region_code,
            municipality_country_code, municipality_region_code, municipality_code,
            match_priority, match_type
     FROM location_name_mappings
     WHERE variant = $1
     ORDER BY match_priority ASC
     LIMIT 1`,
    [name.toLowerCase().trim()]
  )

  return result.rows[0] || null
}

/**
 * Normalize location metadata using DB queries
 * (Same logic as ingestion.ts:normalizeLocationMetadata)
 */
async function normalizeLocation(location) {
  if (!location) return {}

  // Try municipality first (most specific)
  if (location.municipality) {
    // Normalize: strip common suffixes
    const normalizedMunicipality = location.municipality
      .replace(/\s+kommun$/i, '')
      .replace(/\s+stad$/i, '')
      .trim()

    const match = await geoLookup(normalizedMunicipality)
    if (match && match.municipality_code) {
      return {
        countryCode: match.municipality_country_code || match.country_code,
        regionCountryCode: match.municipality_country_code || match.country_code,
        regionCode: match.municipality_region_code,  // Use municipality's region!
        municipalityCountryCode: match.municipality_country_code,
        municipalityRegionCode: match.municipality_region_code,
        municipalityCode: match.municipality_code
      }
    }
  }

  // Fall back to county/region matching
  if (location.county) {
    // Normalize: strip " län" suffix
    const normalizedCounty = location.county
      .replace(/\s+län$/i, '')
      .trim()

    const match = await geoLookup(normalizedCounty)
    if (match && match.region_code) {
      return {
        countryCode: match.country_code,
        regionCountryCode: match.region_country_code,
        regionCode: match.region_code,
        municipalityCountryCode: undefined,
        municipalityRegionCode: undefined,
        municipalityCode: undefined
      }
    }
  }

  // Try location.area (e.g., "Mjällom" → Kramfors municipality)
  if (location.area) {
    const match = await geoLookup(location.area)
    if (match && (match.municipality_code || match.region_code)) {
      return {
        countryCode: match.country_code,
        regionCountryCode: match.region_country_code,
        regionCode: match.region_code,
        municipalityCountryCode: match.municipality_country_code,
        municipalityRegionCode: match.municipality_region_code,
        municipalityCode: match.municipality_code
      }
    }
  }

  // Try location.name as last resort
  if (location.name) {
    const match = await geoLookup(location.name)
    if (match && (match.municipality_code || match.region_code)) {
      return {
        countryCode: match.country_code,
        regionCountryCode: match.region_country_code,
        regionCode: match.region_code,
        municipalityCountryCode: match.municipality_country_code,
        municipalityRegionCode: match.municipality_region_code,
        municipalityCode: match.municipality_code
      }
    }
  }

  // Fall back to country matching
  if (location.country) {
    const match = await geoLookup(location.country)
    if (match && match.country_code) {
      return {
        countryCode: match.country_code,
        regionCountryCode: undefined,
        regionCode: undefined,
        municipalityCountryCode: undefined,
        municipalityRegionCode: undefined,
        municipalityCode: undefined
      }
    }
  }

  return {} // No match found
}

async function backfillGeoCodes() {
  console.log('🔍 Searching for items with missing geo codes...\n')

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n')
  }

  // Find items that need backfilling
  let query = `
    SELECT
      db_id,
      source_id,
      workflow_id,
      title,
      location,
      country_code,
      region_code,
      municipality_code,
      timestamp
    FROM news_items
    WHERE
      location IS NOT NULL
      AND location::text != 'null'
      AND location::text != '{}'
      AND (
        country_code IS NULL
        OR region_code IS NULL
        OR municipality_code IS NULL
      )
    ORDER BY timestamp DESC
  `
  if (limit) {
    query += ' LIMIT ' + limit
  }

  const result = await pool.query(query)
  const itemsToUpdate = result.rows

  console.log(`Found ${itemsToUpdate.length} items with location data but missing geo codes\n`)

  if (itemsToUpdate.length === 0) {
    console.log('✅ No items need backfilling!')
    await pool.end()
    return
  }

  // Process items
  console.log('Processing items...\n')

  const stats = {
    total: itemsToUpdate.length,
    success: 0,
    partialSuccess: 0,
    noMatch: 0,
    errors: 0
  }

  for (const item of itemsToUpdate) {
    try {
      const normalizedLocation = await normalizeLocation(item.location)

      // Count as success if we got ANY new codes
      const hasNewCodes = !!(
        normalizedLocation.countryCode ||
        normalizedLocation.regionCode ||
        normalizedLocation.municipalityCode
      )

      if (!hasNewCodes) {
        stats.noMatch++
        if (stats.noMatch <= 5) {
          console.log(`⚠️  No match: "${item.title?.substring(0, 50)}..."`)
          console.log(`    Location: ${JSON.stringify(item.location)}\n`)
        }
        continue
      }

      // Check if we got municipality-level match (best case)
      const hasMunicipality = !!normalizedLocation.municipalityCode
      const hasRegion = !!normalizedLocation.regionCode
      const hasCountry = !!normalizedLocation.countryCode

      if (hasMunicipality) {
        stats.success++
        if (stats.success <= 10) {
          const locationSource = item.location?.municipality || item.location?.area || item.location?.name || '?'
          console.log(`✅ Municipality: "${item.title?.substring(0, 50)}..." → ${normalizedLocation.municipalityCode} (${locationSource})`)
        }
      } else if (hasRegion) {
        stats.partialSuccess++
        if (stats.partialSuccess <= 5) {
          const locationSource = item.location?.county || item.location?.name || '?'
          console.log(`🟡 Region only: "${item.title?.substring(0, 50)}..." → ${normalizedLocation.regionCode} (${locationSource})`)
        }
      } else if (hasCountry) {
        stats.partialSuccess++
        if (stats.partialSuccess <= 5) {
          const locationSource = item.location?.country || '?'
          console.log(`🟡 Country only: "${item.title?.substring(0, 50)}..." → ${normalizedLocation.countryCode} (${locationSource})`)
        }
      }

      // Update item
      if (!dryRun) {
        await pool.query(
          `UPDATE news_items
           SET
             country_code = $1,
             region_country_code = $2,
             region_code = $3,
             municipality_country_code = $4,
             municipality_region_code = $5,
             municipality_code = $6
           WHERE db_id = $7`,
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
    } catch (error) {
      stats.errors++
      console.error(`❌ Error processing item ${item.db_id}:`, error.message)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('BACKFILL SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total items processed:       ${stats.total}`)
  console.log(`✅ Full success (municipality): ${stats.success} (${Math.round(stats.success / stats.total * 100)}%)`)
  console.log(`🟡 Partial success (region/country): ${stats.partialSuccess} (${Math.round(stats.partialSuccess / stats.total * 100)}%)`)
  console.log(`⚠️  No match found:          ${stats.noMatch} (${Math.round(stats.noMatch / stats.total * 100)}%)`)
  console.log(`❌ Errors:                   ${stats.errors}`)
  console.log('='.repeat(60))

  if (dryRun) {
    console.log('\n⚠️  This was a DRY RUN - no changes were made')
    console.log('Run without --dry-run to apply changes')
  } else {
    console.log('\n✅ Backfill complete!')
  }

  await pool.end()
}

backfillGeoCodes().catch(error => {
  console.error('Backfill failed:', error)
  process.exit(1)
})
